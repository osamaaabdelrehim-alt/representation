import { useEffect, useState } from 'react'
import tkislogo from './assets/thyssenkrupp-logo.svg'
import './App.css'
import * as WorkspaceAPI from "trimble-connect-workspace-api"
import ProgressControl from './Components/Structuer';

function App() {

    // const [count, setCount] = useState(0)
    const [tcApi, setTcApi] = useState<WorkspaceAPI.WorkspaceAPI>()
    /* Establish connection with Trimble connect one time*/
    useEffect(() => {
        async function connectWithTcAPI() {
            const api = await WorkspaceAPI.connect(window.parent, (_event: any, _data: any) => { });
            setTcApi(api);
        }
        connectWithTcAPI();
    }, []);


    return (
        <>
            <div>
                <a href="https://thyssenkrupp.sharepoint.com/sites/uhd-home" target="_blank">
                    <img src={tkislogo} className="logo" alt="Vite logo" width="200" height="200" />
                </a>

            </div>
            <h1 >thyssenkrupp Uhde</h1>
            <p className="read-the-docs">
                {/* text here 2*/}
                Civil, Structural & Architectural Department.
            </p>

            <div style={{ textAlign: 'left' }}>
                <h3>Notes: </h3>
                <ul style={{ listStylePosition: 'inside', paddingLeft: 0 }}>
                    <li>Max Number of Conditions is (3)</li>
                    <li>Don't forget to choose same property for all conditions</li>
                    <li>first Click on Refresh to Collect Data</li>
                    <li>Click on Clear button to back to orginal Presentation</li>
                    <li>
                        All Items out of Range is Gray Color
                        <span
                            style={{
                                display: 'inline-block',
                                width: '12px',
                                height: '12px',
                                backgroundColor: 'gray',
                                marginLeft: '8px',
                                verticalAlign: 'middle',
                                border: '1px solid #000'
                            }}
                        />
                    </li>
                </ul>
            </div>

            <ProgressControl api={tcApi as WorkspaceAPI.WorkspaceAPI}></ProgressControl>
        </>
    )
}

export default App
