# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import requests
# from geopy import Point
# from geopy.distance import geodesic
# import pandas as pd
# import math

# app = Flask(__name__)
# CORS(app)



# def get_terrain_elevations(potential_camp: dict, ca_spatial_characteristics: dict) -> pd.DataFrame: 

#     asimut_step = 360 / ca_spatial_characteristics['profile_quantity']
#     d = ca_spatial_characteristics['r_max'] / ca_spatial_characteristics['profile_points_length']
#     transmitter_coords = Point(potential_camp['lat'], potential_camp['lng'])   # latlng
#     coords_str = ''

#     for i in range(ca_spatial_characteristics['profile_quantity']):
#         for j in range(ca_spatial_characteristics['profile_points_length']):
#             geodesic_point = geodesic(kilometers=(d * j)).destination(transmitter_coords, asimut_step * i ).format_decimal()
#             coords_str += geodesic_point + '|'

#     url = "https://api.opentopodata.org/v1/aster30m"
#     req_data = {"locations": coords_str, "interpolation": "bilinear"}
#     r = requests.post(url, data=req_data)
#     results = r.json()['results']

#     elevations = [res['elevation'] for res in results]
#     terrain_elevation = [ elevations[(ca_spatial_characteristics['profile_points_length'] * i):(ca_spatial_characteristics['profile_points_length'] * i + ca_spatial_characteristics['profile_points_length'])] for i in range(ca_spatial_characteristics['profile_quantity'])]
#     return pd.DataFrame(terrain_elevation)



# def get_caverage_area(potential_camp: dict, ca_spatial_characteristics: dict, equipment_characteristics: dict, radio_system_characteristics: dict) -> pd.DataFrame:
    
#     df_terrain = get_terrain_elevations(potential_camp, ca_spatial_characteristics)
#     # print(df_terrain)
#     e_matrix = []

#     d = ca_spatial_characteristics['r_max'] / ca_spatial_characteristics['profile_points_length']   # Расстояние между точками рельефа местности на аппроксимированной поверхности Земли
#     light_speed = 299792458   # Скорость света
#     Lambda = light_speed / radio_system_characteristics['frequency']   # Длина волны радиосигнала
    
#     for i in range(ca_spatial_characteristics['profile_quantity']):
#         reliability_profile = []
#         terr_profile = []
    
#         for j in range(ca_spatial_characteristics['profile_points_length']):
#             terr_profile.append(df_terrain[j][i])
    
#         Hmax = max(terr_profile)
#         HmaxId = terr_profile.index(Hmax)
#         dH = (terr_profile[0] + radio_system_characteristics['h_transmitter']) - (terr_profile[-1] + radio_system_characteristics['h_mobile'])
#         k = dH / ca_spatial_characteristics['r_max']
#         Hlos = k * (HmaxId*d) + (terr_profile[0] + radio_system_characteristics['h_transmitter'])
#         Hkl = Hmax - Hlos
#         d1 = d * HmaxId
#         d2 = ca_spatial_characteristics['r_max'] - d1
    
#         if Hkl > 0:
#             Nu = Hkl * math.sqrt((2 * ca_spatial_characteristics['r_max']) / (Lambda * d1 * d2))
    
#         for j in range(ca_spatial_characteristics['profile_points_length']):
#             r = d * (j + 1)
#             PL0 = 32.45 + 20*math.log(r) + 20*math.log(ca_spatial_characteristics['profile_quantity'])
#             PLd = 0 
#             if j > HmaxId and Hkl > 0:
#                 PLd = 13.5 + 20*math.log10(Nu)
#             PL = PL0 + PLd            
#             reliability_profile.append(equipment_characteristics['Ptr'] - equipment_characteristics['TXLafd'] + equipment_characteristics['TXGant'] + equipment_characteristics['Gmimo'] - equipment_characteristics['TXPenetL']  - PL > equipment_characteristics['SensRx'])
#             # reliability_profile.append(PL)

#         e_matrix.append(reliability_profile)

#     # print(e_matrix)
    
#     return pd.DataFrame(e_matrix)



# def get_camp_optimality_index(df_potential_camp_ca: pd.DataFrame) -> int:
#     camp_optimality_index = 0
#     for i in range(df_potential_camp_ca.shape[1]):
#         for signal_reliability in df_potential_camp_ca[i]:
#             if signal_reliability == True:
#                 camp_optimality_index += 1
#     return camp_optimality_index



# def get_ca_vizualization(ca_spatial_characteristics: dict, optimal_camp: dict, optimal_camp_ca: pd.DataFrame) -> list:

#     ca_fragments = []   # список массивов из массивов точек фрагмента
#     shtrih_profiles = []

#     d = ca_spatial_characteristics['r_max'] / ca_spatial_characteristics['profile_points_length']
#     delta_asimut = 360 / ca_spatial_characteristics['profile_quantity']
#     asimut = 360 - delta_asimut / 2   # Начальное значение азимута
#     transmitter_coords = Point(optimal_camp['lat'], optimal_camp['lng'])
#     h0 = d / 2   # Радиус площадки с оптимальным лагерем на профиле
#     x  = d / math.cos(asimut * (math.pi / 180))   # Длина ЭППР на штрих-профиле
#     x0 = h0 / math.cos(asimut * (math.pi / 180))   # Радиус площадки с оптимальным лагерем на штрих-профиле

#     for i in range(ca_spatial_characteristics['profile_quantity'] + 1):
#         sh_profile = []
#         for j in range(ca_spatial_characteristics['profile_points_length'] + 1):
#             point = geodesic(kilometers=(x0 + x * j)).destination(transmitter_coords, asimut + delta_asimut * (0 if i == ca_spatial_characteristics['profile_quantity'] else i) ).format_decimal().split(',')
#             point.reverse()
#             sh_profile.append([ float(coord) for coord in point ])
#         shtrih_profiles.append(sh_profile)

#     df_ca_fragments_border = pd.DataFrame(shtrih_profiles).T

#     for i in range(ca_spatial_characteristics['profile_quantity']):
#         for j in range(ca_spatial_characteristics['profile_points_length']):
#             if optimal_camp_ca[j][i]:
#                 ca_fragments.append([ 
#                     df_ca_fragments_border[i][j], 
#                     df_ca_fragments_border[i][j + 1], 
#                     df_ca_fragments_border[i + 1][j + 1],
#                     df_ca_fragments_border[i + 1][j], 
#                     df_ca_fragments_border[i][j], 
#                 ])

#     return ca_fragments



# @app.route('/api', methods=['POST', 'GET'])
# def determine_optimal_camp():
#     data = request.get_json()

#     if 'determation_input_data' not in data:
#         return jsonify({'error': 'Invalid request'}), 400
    
#     determationSettings = data['determation_input_data'][0]
#     potential_camps = data['determation_input_data'][1]

#     ca_spatial_characteristics = {
#         'r_max' :                 int(determationSettings['r_max']),
#         'profile_points_length' : int(determationSettings['profilePointsLength']),
#         'profile_quantity' :      int(determationSettings['profilesQuantity'])
#     }
    
#     equipment_characteristics = {
#         'Ptr' :      float(determationSettings['Ptr']),
#         'TXLafd' :   float(determationSettings['TXLafd']),
#         'TXGant' :   float(determationSettings['TXGant']),
#         'Gmimo' :    float(determationSettings['Gmimo']),
#         'TXPenetL' : float(determationSettings['TXPenetL']),
#         'SensRx' :   float(determationSettings['SensRx'])
#     }
    
#     radio_system_characteristics = {
#         'h_transmitter' :   float(determationSettings['h_transmitter']),
#         'h_mobile' :        float(determationSettings['h_mobile']),
#         'frequency' :       float(determationSettings['frequency'])
#     }

#     try:
#         camp_optimality_indexes = []
#         df_potential_camps_ca = []

#         for potential_camp in potential_camps:
#             df_potential_camps_ca.append(get_caverage_area(potential_camp, ca_spatial_characteristics, equipment_characteristics, radio_system_characteristics))
#             camp_optimality_indexes.append(get_camp_optimality_index(df_potential_camps_ca[-1]))

#         # print(camp_optimality_indexes)

#         optimal_camp_id = camp_optimality_indexes.index(max(camp_optimality_indexes)) 
    
#         return jsonify({ 'ca_reporting_data': {
#             'ca_fragments' : get_ca_vizualization(ca_spatial_characteristics, potential_camps[optimal_camp_id], df_potential_camps_ca[optimal_camp_id]),
#             'optimal_camp_id' : optimal_camp_id
#         }})
    
#     except ValueError:
#         return jsonify({'error': 'Invalid input data'}), 400



# if __name__ == '__main__':
#     app.run(host="0.0.0.0", threaded=True, port=5000, debug=True)






from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from geopy import Point
from geopy.distance import geodesic
import pandas as pd
import math

app = Flask(__name__)
CORS(app)



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



def get_caverage_area(df_terrain: pd.DataFrame, determationSettings: dict) -> pd.DataFrame:
    
    e_matrix = []
    
    r_max =                 int(determationSettings['r_max'])
    profile_points_length = int(determationSettings['profilePointsLength'])
    profile_quantity =      int(determationSettings['profilesQuantity'])
    Ptr =                   float(determationSettings['Ptr'])
    TXLafd =                float(determationSettings['TXLafd'])
    TXGant =                float(determationSettings['TXGant'])
    Gmimo =                 float(determationSettings['Gmimo'])
    TXPenetL =              float(determationSettings['TXPenetL'])
    SensRx =                float(determationSettings['SensRx'])
    h_transmitter =         float(determationSettings['h_transmitter'])
    h_mobile =              float(determationSettings['h_mobile'])
    f =                     float(determationSettings['frequency'])

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
            reliability_profile.append(Ptr - TXLafd  + TXGant + Gmimo - TXPenetL - PL > SensRx)
        e_matrix.append(reliability_profile)
    
    return pd.DataFrame(e_matrix)



def get_camp_optimality_index(df_potential_camp_ca: pd.DataFrame) -> int:
    camp_optimality_index = 0
    for i in range(df_potential_camp_ca.shape[1]):
        for signal_reliability in df_potential_camp_ca[i]:
            if signal_reliability == True:
                camp_optimality_index += 1
    return camp_optimality_index



def get_ca_vizualization(determationSettings: dict, optimal_camp: dict, optimal_camp_ca: pd.DataFrame) -> list:

    r_max =                 int(determationSettings['r_max'])
    profile_points_length = int(determationSettings['profilePointsLength'])
    profile_quantity =      int(determationSettings['profilesQuantity'])

    ca_fragments = []   # список массивов из массивов точек фрагмента
    shtrih_profiles = []

    d = r_max / profile_points_length                                            # длина ЭППР на профиле
    delta_asimut = 360 / profile_quantity
    asimut = 360 - delta_asimut / 2                                              # начальное значение азимута
    transmitter_coords = Point(optimal_camp['lat'], optimal_camp['lng'])
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

    df_ca_fragments_border = pd.DataFrame(shtrih_profiles).T

    for i in range(profile_quantity):
        for j in range(profile_points_length):
            if optimal_camp_ca[j][i]:
            # if i % 2 == 0:            
                ca_fragments.append([ 
                    df_ca_fragments_border[i][j], 
                    df_ca_fragments_border[i][j + 1], 
                    df_ca_fragments_border[i + 1][j + 1],
                    df_ca_fragments_border[i + 1][j], 
                    df_ca_fragments_border[i][j], 
                ])

    return ca_fragments



@app.route('/api', methods=['POST', 'GET'])
def determine_optimal_camp():
    data = request.get_json()

    if 'determation_input_data' not in data:
        return jsonify({'error': 'Invalid request'}), 400
    
    determationSettings = data['determation_input_data'][0]
    potential_camps = data['determation_input_data'][1]
    
    try:
        camp_optimality_indexes = []
        df_potential_camps_ca = []

        for potential_camp in potential_camps:
            df_potential_camps_ca.append(
                get_caverage_area(
                get_terrain_elevations(potential_camp, determationSettings), determationSettings)
            )
            camp_optimality_indexes.append(get_camp_optimality_index(df_potential_camps_ca[-1]))

        optimal_camp_id = camp_optimality_indexes.index(max(camp_optimality_indexes)) 
    
        return jsonify({ 'ca_reporting_data': {
            'ca_fragments' : get_ca_vizualization(determationSettings, potential_camps[optimal_camp_id], df_potential_camps_ca[optimal_camp_id]),
            'optimal_camp_id' : optimal_camp_id
        }})
    
    except ValueError:
        return jsonify({'error': 'Invalid input data'}), 400



if __name__ == '__main__':
    app.run(host="0.0.0.0", threaded=True, port=5000, debug=True)
    