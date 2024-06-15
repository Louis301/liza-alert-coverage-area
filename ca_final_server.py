from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from geopy import Point
from geopy.distance import geodesic
import pandas as pd
import math

app = Flask(__name__)
CORS(app)


# -----------------------------------------------------------------------------------------------------------------------------------------
def get_terrain_elevations(potential_camp: dict, determationSettings: dict) -> pd.DataFrame:

    r_max = int(determationSettings['r_max'])
    profile_points_length = int(determationSettings['profilePointsLength'])
    profile_quantity = int(determationSettings['profilesQuantity'])

    asimut_step = 360 / profile_quantity
    d = r_max / profile_points_length
    transmitter_coords = Point(potential_camp['lat'], potential_camp['lng'])   # latlng
    coords_str = ''

    for i in range(profile_quantity):
        for j in range(profile_points_length):
            geodesic_point = geodesic(kilometers=(d * j)).destination(transmitter_coords, asimut_step * i ).format_decimal()
            coords_str += geodesic_point + '|'

    url = "https://api.opentopodata.org/v1/aster30m"
    req_data = {"locations": coords_str, "interpolation": "bilinear"}
    r = requests.post(url, data=req_data)
    results = r.json()['results']

    elevations = [res['elevation'] for res in results]
    terrain_elevation = [ elevations[(profile_points_length * i):(profile_points_length * i + profile_points_length)] for i in range(profile_quantity)]
    return pd.DataFrame(terrain_elevation)


# -----------------------------------------------------------------------------------------------------------------------------------------
def is_reliability_signal(PL: float, determationSettings) -> bool:
    Ptr = determationSettings['Ptr']
    TXLafd = determationSettings['TXLafd']
    TXGant = determationSettings['TXGant']
    Gmimo = determationSettings['Gmimo']
    TXPenetL = determationSettings['TXPenetL']
    SensRx =  determationSettings['SensRx']
    return Ptr - TXLafd  + TXGant + Gmimo - TXPenetL - PL > SensRx


# -----------------------------------------------------------------------------------------------------------------------------------------
def get_caverage_area(df_terrain: pd.DataFrame, determationSettings: dict) -> pd.DataFrame:
    
    e_matrix = []
    
    r_max = determationSettings['r_max']
    profile_points_length = determationSettings['profilePointsLength']
    profile_quantity = determationSettings['profilesQuantity']
    h_transmitter = determationSettings['h_transmitter']
    h_mobile = determationSettings['h_mobile']
    f = determationSettings['frequency']

    d = r_max / profile_points_length
    Lambda = 299792458 / (f)         
    
    for i in range(profile_quantity):
        reliability_profile = []
        terr_profile = []
    
        for j in range(profile_points_length):
            terr_profile.append(df_terrain[j][i])
    
        Hmax = max(terr_profile)
        HmaxId = terr_profile.index(Hmax)
        dH = (terr_profile[0] + h_transmitter) - (terr_profile[-1] + h_mobile)
        k = dH / r_max
        Hlos = k * (HmaxId*d) + (terr_profile[0] + h_transmitter)
        Hkl = Hmax - Hlos
        d1 = d * HmaxId
        d2 = r_max - d1
    
        if Hkl > 0:
            Nu = Hkl * math.sqrt((2 * r_max) / (Lambda * d1 * d2))
    
        for j in range(profile_points_length):
            r = d * (j + 1)
            PL0 = 32.45 + 20*math.log(r) + 20*math.log(f)
            PLd = 0 
            if j > HmaxId and Hkl > 0:
                PLd = 13.5 + 20*math.log10(Nu)
            PL = PL0 + PLd            
            reliability_profile.append(is_reliability_signal(PL, determationSettings))
        e_matrix.append(reliability_profile)
    
    return pd.DataFrame(e_matrix)


# -----------------------------------------------------------------------------------------------------------------------------------------
def get_camp_optimality_index(df_potential_camp_ca: pd.DataFrame) -> int:
    camp_optimality_index = 0
    for i in range(df_potential_camp_ca.shape[1]):
        for signal_reliability in df_potential_camp_ca[i]:
            if signal_reliability == True:
                camp_optimality_index += 1
    return camp_optimality_index


# ========================================================================================================
def test(determationSettings: dict, potential_camp: dict) -> list:

    r_max = int(determationSettings['r_max'])
    profile_points_length = int(determationSettings['profilePointsLength'])
    profile_quantity = int(determationSettings['profilesQuantity'])

    # ca_fragments = []
    ca_fragments = []   # список массивов из массивов точек фрагмента
    shtrih_profiles = []

    d = r_max / profile_points_length                                            # длина ЭППР на профиле
    delta_asimut = 360 / profile_quantity
    asimut = 360 - delta_asimut / 2                                              # начальное значение азимута
    transmitter_coords = Point(potential_camp['lat'], potential_camp['lng'])
    h0 = d / 2                                                                   # радиус площадки с оптимальным лагерем на профиле
    x  = d / math.cos(asimut * (math.pi / 180))                                  # длина ЭППР на штрих-профиле
    x0 = h0 / math.cos(asimut * (math.pi / 180))                                 # радиус площадки с оптимальным лагерем на штрих-профиле

    for i in range(profile_quantity + 1):
        sh_profile = []
        for j in range(profile_points_length + 1):
            point = geodesic(kilometers=(x0 + x * j)).destination(transmitter_coords, asimut + delta_asimut * (0 if i == profile_quantity else i) ).format_decimal().split(',')
            point.reverse()
            sh_profile.append([ float(coord) for coord in point ])
        shtrih_profiles.append(sh_profile)

    df = pd.DataFrame(shtrih_profiles).T

    for i in range(profile_quantity):
        for j in range(profile_points_length):
            ca_fragments.append([ 
                df[i][j], 
                df[i][j + 1], 
                df[i + 1][j + 1],
                df[i + 1][j], 
                df[i][j], 
            ])

    return ca_fragments
# ========================================================================================================


# -----------------------------------------------------------------------------------------------------------------------------------------
@app.route('/api', methods=['POST', 'GET'])
def determine_optimal_camp():
    data = request.get_json()

    if 'determation_input_data' not in data:
        return jsonify({'error': 'Invalid request'}), 400
    
    determationSettings = data['determation_input_data'][0]
    potential_camps = data['determation_input_data'][1]
    
    try:
        camp_optimality_indexes = []

        for potential_camp in potential_camps:
            df_potential_camp_ca = get_caverage_area(
                get_terrain_elevations(potential_camp, determationSettings), determationSettings
            )
            camp_optimality_indexes.append(get_camp_optimality_index(df_potential_camp_ca))

        optimal_camp_id = camp_optimality_indexes.index(max(camp_optimality_indexes)) 
    
        return jsonify({ 'ca_reporting_data': {
            'test' : test(determationSettings, potential_camps[optimal_camp_id]),
            'ca_reporting_data' : optimal_camp_id
        }})
    
    except ValueError:
        return jsonify({'error': 'Invalid input data'}), 400


# -----------------------------------------------------------------------------------------------------------------------------------------
if __name__ == '__main__':
    app.run(host="0.0.0.0", threaded=True, port=5000, debug=True)
