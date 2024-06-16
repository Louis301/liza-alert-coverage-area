import React from "react";
import * as maptilersdk from "@maptiler/sdk";
import * as maptilerClient from '@maptiler/client';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import axios from 'axios';

const apiKey = "nXWhedT4bqmfFmY1fnqL";


export default function Engine()
{
    const [searchTerm, setSearchTerm] = React.useState('');
    const [featuresList, setFeaturesList] = React.useState([]);
    const [featureId, setFeatureId] = React.useState(0);    
    const [zoom] = React.useState(12);
    const [potentialCamps, setPotentialCamps] = React.useState([]);
    const [lastPotentialCamp, setLastPotentialCamp] = React.useState(null)
    const [caReportingData, setCAReportingData] = React.useState(null)
    const mapContainer = React.useRef(null);
    const map = React.useRef(null);

    const [optimalCamp, setOptimalCamp] = React.useState(null)
    
    const [programSettings, setProgramSettings] = React.useState({
        "r_max" : 3, 
        "frequency" : 146,
        'profilePointsLength' : 3,
        'profilesQuantity' : 6,
        'Ptr' : 40,
        'TXLafd' : 0.5,
        'TXGant' : 2,
        'Gmimo' : 3,
        'TXPenetL' : 10,
        'SensRx' :  -120,
        'h_transmitter': 3,
        'h_mobile': 1.5
    })
    

    const addressBarHandler = async (e) => {
        setSearchTerm(e.target.value);
        const place_query = e.target.value
        let features_list = [];
        if (place_query)
        {
            const geocoderPromise = await maptilerClient.geocoding.forward( place_query, {
                country: ['ru'],
                types: [ 'address', 'region', 'subregion', 'joint_municipality', 'joint_submunicipality', 'municipality', 'municipal_district', 'locality', 'neighbourhood', 'place', 'postal_code', 'poi', 
                ]
            })
            for (let feature of geocoderPromise['features'])
            {
                features_list.push({
                    'address': feature['place_name_ru'],
                    'longitude': feature['center'][0],
                    'latitude': feature['center'][1],
                })
            }
        }
        setFeaturesList(features_list)  
    };
    
    const selectFutureItem = (e) => {
		let featureId = e.target.value
		setFeatureId(featureId)
        setSearchTerm(featuresList[featureId].address)
    }

    const showCamp = (e) => {
		let campId = e.target.value
        let potential_camps = [...potentialCamps]

        if(potential_camps[campId].visible)
            potential_camps[campId].visible = false
        else
            potential_camps[campId].visible = true
            
        setPotentialCamps(potential_camps)
    }

    const showCamps = () => {
        let potential_camps = [...potentialCamps]
        for(let pCamp of potential_camps)
            pCamp.visible = true
        setPotentialCamps(potential_camps)
    }
    
    const hideCamps = () => {
        let potential_camps = [...potentialCamps]
        for(let pCamp of potential_camps)
            pCamp.visible = false
        setPotentialCamps(potential_camps)
    }

    const deleteCamp = (e) => {
        let campId = e.target.value
        let potential_camps = [...potentialCamps]
        potential_camps[campId].marker.remove()
        potential_camps.splice(campId, 1)
        setPotentialCamps(potential_camps)
    }

    const deleteCamps = () => {
        hideCamps()
        let potential_camps = [...potentialCamps]
        for(let pCamp of potential_camps)
            pCamp.marker.remove()
        potential_camps.splice(0, potentialCamps.length)
        setPotentialCamps(potential_camps)
    }

    const changePotentialCampName = (e, camp_id) => {
        let potential_camps = [...potentialCamps]
        potential_camps[camp_id].name = e.target.value
        setPotentialCamps(potential_camps)
    }

    const determineOptimalCamp = async (e) => {
        e.preventDefault();
        let potential_camps_coord = [];
        let ca_reporting_data = null;
        
        for (let pCamp of potentialCamps)
            potential_camps_coord.push({ 'lat' : pCamp.lat, 'lng' : pCamp.lng })
        
        let determation_input_data = {
            "programSettings" : programSettings,
            "potentialCampsList" : potential_camps_coord
        }

        try {
            const response = await axios.post('http://192.168.1.34:5000/api', { 
                determation_input_data: Object.values(determation_input_data) 
            });
            ca_reporting_data = response.data.ca_reporting_data;
            setCAReportingData(ca_reporting_data)
            console.log(ca_reporting_data)
        } catch (error) {
            console.error(error);
            ca_reporting_data = 'Error occurred';
        }
    }


    React.useEffect(() => {
        let mapCenter
        maptilersdk.config.apiKey = apiKey;

        if (featuresList.length > 0) {
            mapCenter = { 
                lat: featuresList[featureId].latitude, 
                lng: featuresList[featureId].longitude
            }
        } else {
            mapCenter = { lng: 86.51566235975042, lat: 51.266882945784715 }
        }

        map.current = new maptilersdk.Map({
            container: mapContainer.current,
            style: maptilersdk.MapStyle.TOPO,
            center: [mapCenter.lng, mapCenter.lat],
            zoom: zoom
        });

        map.current.on('click', (e) => {
            const lat = e.lngLat.lat
            const lng = e.lngLat.lng

            setLastPotentialCamp({
                lat: lat,
                lng: lng, 
                marker: new maptilersdk.Marker({color: '#0000ff'}).setLngLat([lng, lat]),
                visible: true,
            });
        })

        map.current.on('load', async function() {
            if (caReportingData != null) 
            {
                let i = 0
                for (let fragment of caReportingData.test) 
                {
                    map.current.addSource(`rio_cats-${i}`, {
                        type: 'geojson',
                        data: {
                            "type": "FeatureCollection",
                            "features": [
                                {
                                "type": "Feature",
                                "properties": {},
                                "geometry": {
                                    "coordinates": [fragment],
                                    "type": "Polygon"
                                }
                                }
                            ]
                        }
                    });
                    map.current.addLayer({
                        'id': `rio_cats-${i}`, 
                        'type': 'fill',
                        'source': `rio_cats-${i}`,
                        'layout': {},
                        'paint': {
                            'fill-color': '#0000ff',
                            'fill-opacity': 0.4,
                        }
                    });
                    i++;
                }
            }
        });

    }, [featureId, caReportingData]);
    
    React.useMemo(() => {
        if (potentialCamps.length > 0 || lastPotentialCamp !== null) {
            let potential_camps = [...potentialCamps]
            potential_camps.push({...lastPotentialCamp, name: `camp ${potential_camps.length + 1}`, id: potentialCamps.length})
            setPotentialCamps(potential_camps)
        }

    }, [lastPotentialCamp])
    
    React.useMemo(() => {
        for (let pCamp of potentialCamps)
        {
            if(pCamp.visible)
                pCamp.marker.addTo(map.current)
            else
                pCamp.marker.remove()
        }

    }, [potentialCamps])

    
    React.useMemo(() => {

        if (caReportingData != null)
        {
            let potential_camps = [...potentialCamps]
            const oCampId = caReportingData.optimal_camp_id
            const lat = potentialCamps[oCampId].lat
            const lng = potentialCamps[oCampId].lng

            potential_camps[oCampId].marker = new maptilersdk.Marker({color: '#ff0000'}).setLngLat([lng, lat]).addTo(map.current)
            
            setPotentialCamps(potential_camps)
        }

    }, [caReportingData])

    
    return (
        <>
            <h1>Liza Alert camp search </h1>

            <button onClick={determineOptimalCamp}>Determine the optimal camp</button>
            <hr/>

            <h2>Entering of work location</h2>
            <input type='text' value={searchTerm} placeholder="Place" onChange={addressBarHandler}/>
            <ul>
                {featuresList.map((feature, idx) => (
                    <li key={idx}>
                        <button onClick={selectFutureItem} value={idx}>{feature.address}</button>
                    </li>
                ))}
            </ul>
            <hr/>

            <div className="map" ref={mapContainer}/>
            <hr/>

            <h2>Program settings</h2>
            <form>
                <span>r_max </span>
                <input value={programSettings.r_max} onChange={e => setProgramSettings({...programSettings, r_max: e.target.value})}/>
                
                <span>profilePointsLength</span>
                <input value={programSettings.profilePointsLength} onChange={e => setProgramSettings({...programSettings, profilePointsLength: e.target.value})}/>

                <span>profilesQuantity</span>
                <input value={programSettings.profilesQuantity} onChange={e => setProgramSettings({...programSettings, profilesQuantity: e.target.value})}/>

                <span>frequency</span>
                <input value={programSettings.frequency} onChange={e => setProgramSettings({...programSettings, frequency: e.target.value})}/>

                <span>Ptr</span>
                <input value={programSettings.Ptr} onChange={e => setProgramSettings({...programSettings, Ptr: e.target.value})}/>

                <span>TXLafd</span>
                <input value={programSettings.TXLafd} onChange={e => setProgramSettings({...programSettings, TXLafd: e.target.value})}/>

                <span>TXGant</span>
                <input value={programSettings.TXGant} onChange={e => setProgramSettings({...programSettings, TXGant: e.target.value})}/>
        
                <span>Gmimo</span>
                <input value={programSettings.Gmimo} onChange={e => setProgramSettings({...programSettings, Gmimo: e.target.value})}/>

                <span>TXPenetL</span>
                <input value={programSettings.TXPenetL} onChange={e => setProgramSettings({...programSettings, TXPenetL: e.target.value})}/>

                <span>SensRx</span>
                <input value={programSettings.SensRx} onChange={e => setProgramSettings({...programSettings, SensRx: e.target.value})}/>

                <span>h_transmitter</span>
                <input value={programSettings.h_transmitter} onChange={e => setProgramSettings({...programSettings, h_transmitter: e.target.value})}/>

                <span>h_mobile</span>
                <input value={programSettings.h_mobile} onChange={e => setProgramSettings({...programSettings, h_mobile: e.target.value})}/>
            </form>
            <hr/>

            <h2>Camps controller</h2>
            <button onClick={showCamps}>Show camps</button>
            <button onClick={hideCamps}>Hide camps</button>
            <button onClick={deleteCamps}>Delete camps</button>
            <ul>
                {potentialCamps.map((item, idx) => (
                    <li key={idx}>
                        <input value={item.name} onChange={e => changePotentialCampName(e, idx)}/>
                        <button onClick={showCamp} value={idx}>show</button>
                        <button onClick={deleteCamp} value={idx}>delete</button>
                    </li>
                ))}
            </ul>
            <hr/>
        </> 
    )
}