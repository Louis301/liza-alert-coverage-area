import React from "react";
import * as maptilersdk from "@maptiler/sdk";
import './optimalCampLocation.css'


const apiKey = "nXWhedT4bqmfFmY1fnqL"
maptilersdk.config.apiKey = apiKey



//====================================================================================================
export default function OptimalCampLocation() 
{
    const transmitter = JSON.parse(localStorage.getItem('transmitter'))
    const location = JSON.parse(localStorage.getItem('location'))
    const [potentialCamps, setPotentialCamps] = React.useState([])
    const mapContainer = React.useRef(null)
    const [zoom] = React.useState(12)
    const map = React.useRef(null)
    const [borders, setBorders] = React.useState([])

    const [optimalCampCoords, setOptimalCampCoords] = React.useState(0)
    

    //----------------------------------------------------------------------------------------
    const getBorderPoints = (campCenter) => 
    {
        // transmitterRadiusKm должен меняться при расчёте границы каждой зоны покрытия

        const transmitterRadiusKm = Math.floor(Math.random() * transmitter.radius) / 1000
        // const transmitterRadiusKm = transmitter.radius / 1000
        const earthRadiusKm = 6371;
        const degreesToRadians = Math.PI / 180
        const radiansToDegrees = 180 / Math.PI
        const pCampLat = campCenter.lat * degreesToRadians
        const pCampLng = campCenter.lng * degreesToRadians
        const radioTrassQuantity = 64
        const stepAngle = (360 / radioTrassQuantity)

        let currentAngle = 0
        let borderPointLan
        let borderPointLng
        let borderPoints = []

        while (currentAngle !== 360)
        {
            // let transmitterRadiusKm = Math.floor(Math.random() * transmitter.radius) / 1000
            // const transmitterRadiusKm = transmitter.radius / 1000

            const borderPointRelativePotentialCampHeightKm = Math.cos(currentAngle * degreesToRadians) * transmitterRadiusKm
            const borderPointRelativePotentialCampWidthKm = Math.sin(currentAngle * degreesToRadians) * transmitterRadiusKm
    
            borderPointLan = borderPointRelativePotentialCampHeightKm / earthRadiusKm + pCampLat
            borderPointLng = borderPointRelativePotentialCampWidthKm / earthRadiusKm + pCampLng
    
            borderPointLan *= radiansToDegrees
            borderPointLng *= radiansToDegrees

            currentAngle += stepAngle

            borderPoints.push([
                borderPointLng,
                borderPointLan,
            ])

            borderPoints.push([
                campCenter.lng,
                campCenter.lat,
            ])
        }

        // borderPoints.push(borderPoints[0])

        return borderPoints
    }


    //----------------------------------------------------------------------------------------
    // const initBorders = () => 
    // {
    //     let borders_local = []

    //     for (let pCamp of potentialCamps) 
    //     {
    //         // if (!pCamp.displayed)
    //         // {
    //             borders_local.push(pCamp.coverageAreaBorder)
    //             // borders_local = pCamp.coverageAreaBorder
    //             // pCamp.displayed = true
    //         // }
    //     }

    //     setBorders(borders_local)
    // }


    //----------------------------------------------------------------------------------------
    const calculateCoverageAreaBorder = () =>
    {
        for (let pCamp of potentialCamps)
        {
            if (pCamp.coverageAreaBorder.length === 0)
                pCamp.coverageAreaBorder = getBorderPoints(pCamp.center)
        }

        let borders_local = []

        for (let pCamp of potentialCamps) 
        {
            // if (!pCamp.displayed)
            // {
                borders_local.push(pCamp.coverageAreaBorder)
                // borders_local = pCamp.coverageAreaBorder
                // pCamp.displayed = true
            // }
        }

        setBorders(borders_local)
    }


    //----------------------------------------------------------------------------------------
    const calculateOptimalCampCoords = () =>
    {
        const earthRadiusKm = 6371;
        const degreesToRadians = Math.PI / 180

        // Определяем площади покрытия потенциальных лагерей
        for (let pCamp of potentialCamps)
        {
            let coverageArea = 0

            // if(pCamp.coverageArea === 0)
            // {
                const pCampLng = pCamp.center.lng * degreesToRadians
                const pCampLat = pCamp.center.lat * degreesToRadians
                let lon2
                let lat2

                for(let borderPoint of pCamp.coverageAreaBorder)
                {
                    lon2 = borderPoint[0] * degreesToRadians;
                    lat2 = borderPoint[1] * degreesToRadians;

                    // Haversine formula 
                    let dlon = lon2 - pCampLng; 
                    let dlat = lat2 - pCampLat;
                    
                    let a = Math.pow(Math.sin(dlat / 2), 2) 
                        + Math.cos(pCampLat) * Math.cos(lat2)
                        * Math.pow(Math.sin(dlon / 2),2);
                    
                    let c = 2 * Math.asin(Math.sqrt(a));

                    let radioTrassLength = c * earthRadiusKm

                    coverageArea += radioTrassLength  // Моделирование вычисления площади
                }

                pCamp.coverageArea = coverageArea

                console.log(pCamp.coverageArea)
            // }
        }


        // Определяем лагерь с наибольшей зоной покрытия
        let maxCoverageArea = 0
        for (let pCamp of potentialCamps)
        {
            if(pCamp.coverageArea > maxCoverageArea) 
                maxCoverageArea = pCamp.coverageArea
        }


        // Определяем координаты оптимального лагеря
        for (let pCamp of potentialCamps)
        {
            if(pCamp.coverageArea === maxCoverageArea) 
            {
                setOptimalCampCoords({
                    lng : pCamp.center.lng, 
                    lat : pCamp.center.lat, 
                })
                break
            }
        }
    }


    //----------------------------------------------------------------------------------------
    const determineOptimalCamp = () => 
    {
        calculateCoverageAreaBorder()
        calculateOptimalCampCoords()  // Включает отображение лагеря

        // Вычисляем площади зон; находим наибольшую. 
        // Ставим зелёный маркер на потенциальный лагерь, к которому относится эта зона. 
        // Этот лагерь является оптимальным.
    }

   
    //----------------------------------------------------------------------------------------
    const showMarker = (coords, color) => 
    {
        new maptilersdk.Marker({color: color})
        .setLngLat([coords.lng, coords.lat])
        .addTo(map.current)
    }


    //----------------------------------------------------------------------------------------
    React.useEffect(() => {

        map.current = new maptilersdk.Map({
            container: mapContainer.current,
            style: maptilersdk.MapStyle.TOPO,
            center: [location.center.lng, location.center.lat],
            zoom: zoom,
        })
        showMarker(location.center, "#ff0000")  


        map.current.on('click', (e) => {
            showMarker(e.lngLat, "#0000ff")
            const pCampslength = potentialCamps.length
            potentialCamps.push({
                id: pCampslength,
                center : {
                    lng: e.lngLat.lng, 
                    lat: e.lngLat.lat,
                },
                coverageAreaBorder : [],
                displayed : false,
                coverageArea : 0,
            })
            setPotentialCamps(potentialCamps)
        })


        map.current.on('load', function() {

            console.log('potentialCamps ->', potentialCamps)
            console.log('borders ->', borders)

            for (let pCamp of potentialCamps)
            {
                // if(!pCamp.displayed)
                // {
                    showMarker(pCamp.center, "#0000ff")
                    showMarker(optimalCampCoords, "#00ff00")

                    map.current.addSource(`potential-camp-border-${pCamp.id}`, {
                        'type': 'geojson',
                        'data': {
                            'type': 'Feature',
                            'properties': {},
                            'geometry': {
                            'type': 'LineString',
                            'coordinates': borders[pCamp.id]
                            }
                        }
                    });

                    map.current.addLayer({
                        'id': `potential-camp-border-${pCamp.id}`,
                        'type': 'line',
                        'source': `potential-camp-border-${pCamp.id}`,
                        'layout': {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        'paint': {
                            'line-color': '#222',
                            'line-width': 1
                        }
                    });

                //     pCamp.displayed = true
                // }
            }
        })

    }, [zoom, location, potentialCamps, borders, optimalCampCoords])


    //----------------------------------------------------------------------------------------
    return (
        <>
            <p>location_address = {location.address}</p>
            <p>location_lat = {location.center.lat}</p>
            <p>location_lng = {location.center.lng}</p>
            
            <p>TRANSMITTER RADIUS = {transmitter.radius}</p>

            <ul>
                {potentialCamps.map(pCamp => (
                    <li key={pCamp.id}>
                        <button  value={pCamp.id}>
                            {/* (ID: {pCamp.id})  LNG: {pCamp.center.lng};  LAT {pCamp.center.lat} */}
                            ID: {pCamp.id};  LNG: {pCamp.center.lng};  LAT: {pCamp.center.lat}
                        </button>
                    </li>
                ))}
            </ul>

            <button className='optimal-camp-determine-btn' onClick={determineOptimalCamp}>Determine the optimal camp</button>
        
            <div className="map"  ref={mapContainer}/>
        </>
    ) 
}