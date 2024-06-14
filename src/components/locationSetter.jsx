import React from "react";
import * as maptilersdk from "@maptiler/sdk";
import * as maptilerClient from '@maptiler/client';
import "@maptiler/geocoding-control/style.css";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import "maplibre-gl/dist/maplibre-gl.css";
import './locationSetter.css';

const apiKey = "nXWhedT4bqmfFmY1fnqL";
maptilersdk.config.apiKey = apiKey;


export default function LocationSetter()
{
    const [searchTerm, setSearchTerm] = React.useState('');
    const [featuresList, setFeaturesList] = React.useState([]);
    const [featureId, setFeatureId] = React.useState(0);    
    const [zoom] = React.useState(12);
    const mapContainer = React.useRef(null);
    const map = React.useRef(null);

    const [location, setLocation] = React.useState({})


    //----------------------------------------------------------------------------------------
    const showMarker = (coords, color) =>
    {
        new maptilersdk.Marker({color: color})
        .setLngLat([coords.lng, coords.lat])
        .addTo(map.current);
    }


    //----------------------------------------------------------------------------------------
    const addressBarHandler = async (e) => {
        setSearchTerm(e.target.value);
        const place_query = e.target.value
        let features_list = [];
        if (place_query)
        {
            const geocoderPromise = await maptilerClient.geocoding.forward( place_query, {
                country: ['ru'],
                types: [ 
                    'address', 
                    'region', 
                    'subregion', 
                    'joint_municipality', 
                    'joint_submunicipality', 
                    'municipality', 
                    'municipal_district', 
                    'locality', 
                    'neighbourhood', 
                    'place', 
                    'postal_code', 
                    'poi', 
                ]
            })
            let i = 0;
            for (let feature of geocoderPromise['features'])
            {
                features_list.push({
                    'address': feature['place_name_ru'],
                    'longitude': feature['center'][0],
                    'latitude': feature['center'][1],
                    'id': (i++),
                })
            }
        }
        setFeaturesList(features_list)
    };


    //----------------------------------------------------------------------------------------
    const selectFutureItem = (e) => {
		let featureId = e.target.value
        setSearchTerm('')
		setFeatureId(featureId)
        setSearchTerm(featuresList[featureId].address)
    }


    //----------------------------------------------------------------------------------------
    const saveLocation = () => {
        localStorage.setItem('location', JSON.stringify(location));
    }


    //----------------------------------------------------------------------------------------
    React.useEffect(() => {
        let mapCenter;
        // let barData = localStorage.getItem('location');

        // Состояния location и feature (надо сделать!):
        // 1. первый запуск программы, location не определён, feature не выбран
        // 2. переход на страницу, location определён, feature не выбран
        // 3. выбор и сохранение места, location определён, feature выбран

        // data !== undefined
        if (featuresList.length > 0)
        {
            mapCenter = { 
                lat:  featuresList[featureId].latitude, 
                lng:  featuresList[featureId].longitude,
            };  
            setLocation({
                address: featuresList[featureId].address, 
                center: mapCenter,
            }) 
            map.current = new maptilersdk.Map({
                container: mapContainer.current,
                style: maptilersdk.MapStyle.TOPO,
                center: [mapCenter.lng, mapCenter.lat],
                zoom: zoom,
            });
            showMarker(mapCenter, "#ff0000")
        }
        else
        {
            const getCurrentLocation = async () => {
                const result = await maptilerClient.geolocation.info();
                mapCenter = { 
                    lat: result.latitude, 
                    lng: result.longitude,
                }
                setLocation({
                    // address: result.address, 
                    center: mapCenter,
                })
                map.current = new maptilersdk.Map({
                    container: mapContainer.current,
                    style: maptilersdk.MapStyle.TOPO,
                    center: [mapCenter.lng, mapCenter.lat],
                    zoom: zoom,
                });
                showMarker(mapCenter, "#ff0000")
            }
            getCurrentLocation()
        }
    }, [zoom, featuresList, featureId]);


    return (
        <>
            <div className="bar">
                <input
                    className='bar-input'
                    type='text'
                    value={searchTerm}
                    placeholder="Place"
                    onChange={addressBarHandler}
                />
                <ul className='bar-features'>
                    {featuresList.map(feature => (
                        <li key={feature.id}>
                            <button className="bar-features-item" onClick={selectFutureItem} value={feature.id}>{feature.address}</button>
                        </li>
                    ))}
                </ul>
                <button className="bar-save_location" onClick={saveLocation}>Save location</button>
            </div>
            <div className="map" ref={mapContainer}/>
        </> 
    )
}