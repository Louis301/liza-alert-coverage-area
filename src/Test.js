import React from "react";
import axios from 'axios';


export default function Test() {

    const [determationInputData, setDetermationInputData] = React.useState({
        "programSettings" : {
            "fraquency" : 146,
            "caverageAreaMaxRadius" : 30
        },
        "potentialCampsList" : [
            { "lat" : 46,   "lng" : 12 },
            { "lat" :29,    "lng" : 0 },
        ]
    })
    const [elevationList, setElevationList] = React.useState([])


    const handleSubmit = async (event) => {
		event.preventDefault();
		try {
			const response = await axios.post('http://192.168.1.33:5000/api', { 
				determation_input_data: Object.values(determationInputData) 
			});
			setElevationList(response.data.elevation_list);
		} catch (error) {
			console.error(error);
            setElevationList('Error occurred');
		}
	};

    const printData = () => {
        console.log(elevationList)
    }


    return (
        <>
            <button onClick={handleSubmit}>Get elevation</button>
            <button onClick={printData}>Print elevation list</button>
        </>
    )
}


