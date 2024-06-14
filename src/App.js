import React from "react";
import LocationSetter from "./components/locationSetter.jsx"
import TransmitterSettings from "./components/transmitterSettings.jsx"
import OptimalCampLocation from "./components/optimalCampLocation.jsx"
import "./App.css";

export default function App()
{
    const [pageContent, setPageContent] = React.useState(null);
    const [pageId, setPageId] = React.useState('ls_page');

    const pageController = (e) => {
        setPageId(e.target.value)
    }

    React.useEffect(() => {
        switch(pageId)
        {
            case 'ls_page':   setPageContent(<LocationSetter/>);       break;
            case 'ts_page':   setPageContent(<TransmitterSettings/>);  break;
            case 'ocl_page':  setPageContent(<OptimalCampLocation/>);  break;

            default:
                break;
        }

    }, [pageId])    

    return (
        <> 
            <section className="page-controller">
                <button className="page-controller-btn" onClick={pageController} value='ls_page'>Place on the map</button>
                <button className="page-controller-btn" onClick={pageController} value='ts_page'>Transmitter Settings </button>
                <button className="page-controller-btn" onClick={pageController} value='ocl_page'>The point of optimal camp location</button>    
            </section> 
            <section className="page-content">
                {pageContent}
            </section>
        </>
    )
}