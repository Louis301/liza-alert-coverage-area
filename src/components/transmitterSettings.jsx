import React, { useState } from "react";
import './transmitterSettings.css'


export default function TransmitterSettings() 
{
    // console.log(JSON.parse(localStorage.getItem('transmitter')).radius + 10)

    const [radius, setRadius] = useState(0)

    if(localStorage.getItem('transmitter') != null)
        setRadius(JSON.parse(localStorage.getItem('transmitter')).radius)
    //     setRadius(1000)
    // else
    //     localStorage.setItem('transmitter', JSON.stringify({'radius': 0}))


    const saveTransmitterSettings = (e) => 
    {
        e.preventDefault()
        const formData = new FormData(e.target)
        const transmitterSettings = Object.fromEntries(formData.entries())
        localStorage.setItem('transmitter', JSON.stringify(transmitterSettings))
    }

    
    const setTransmitterRadius = (e) => {
        setRadius(e.target.value)
    }


    return (
        <form onSubmit={saveTransmitterSettings}>
            <input placeholder="Radius, m" onChange={setTransmitterRadius} name="radius" value={radius}/>
            <button className='transmitter-save-settings-btn' type="submit">Save settings</button>
        </form>
    );
  }