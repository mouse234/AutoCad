import { useState, useEffect, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import axios from 'axios';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import './CADPreview.css';

const ModelViewer = ({ stlUrl }) => {
    const geometry = useLoader(STLLoader, stlUrl);

    // Auto-center and compute normals for better lighting
    useMemo(() => {
        if (geometry) {
            geometry.computeVertexNormals();
            geometry.center();
        }
    }, [geometry]);

    return (
        <Center>
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial color="#4a90ff" roughness={0.5} metalness={0.1} />
            </mesh>
        </Center>
    );
};

const CADPreview = ({ scadCode, fileName }) => {
    const [activeTab, setActiveTab] = useState('3d'); // Default to 3D view
    const [stlUrl, setStlUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (activeTab === 'code') {
            Prism.highlightAll();
        }
    }, [scadCode, activeTab]);

    // Generate 3D model when code changes
    useEffect(() => {
        if (!scadCode) {
            setStlUrl(null);
            return;
        }

        const generateModel = async () => {
            setIsLoading(true);
            setError(null);
            // Switch to 3D view automatically on new generation if user hasn't explicitly set code
            // or just keep current. Let's keep current tab but force update.

            try {
                console.log("Requesting render...");
                const response = await axios.post('http://localhost:3001/api/render', { scadCode });

                // Convert base64 to blob URL
                const byteCharacters = atob(response.data.stlData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'model/stl' });
                const url = URL.createObjectURL(blob);

                setStlUrl(url);
                setActiveTab('3d'); // Switch to 3D view on success
            } catch (err) {
                console.error('Render error:', err);
                setError('Failed to render 3D model. OpenSCAD may not be installed on the server.');
                // Don't switch tab on error, let them see error in 3D view or switch themselves
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce slightly to avoid rapid updates
        const timeoutId = setTimeout(generateModel, 500);
        return () => clearTimeout(timeoutId);
    }, [scadCode]);

    // Cleanup URL on unmount
    useEffect(() => {
        return () => {
            if (stlUrl) URL.revokeObjectURL(stlUrl);
        };
    }, [stlUrl]);

    const handleDownload = () => {
        if (!scadCode) return;
        const blob = new Blob([scadCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadStl = () => {
        if (!stlUrl) return;
        const a = document.createElement('a');
        a.href = stlUrl;
        a.download = fileName.replace('.scad', '.stl');
        a.click();
    };

    return (
        <div className="cad-preview">
            <div className="preview-header">
                <div className="header-left">
                    <h2>📐 CAD Preview</h2>
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === '3d' ? 'active' : ''}`}
                            onClick={() => setActiveTab('3d')}
                        >
                            3D View
                        </button>
                        <button
                            className={`tab ${activeTab === 'code' ? 'active' : ''}`}
                            onClick={() => setActiveTab('code')}
                        >
                            Code
                        </button>
                    </div>
                </div>
                <div className="header-right">
                    {stlUrl && activeTab === '3d' && (
                        <button className="download-btn secondary" onClick={handleDownloadStl}>
                            ⬇️ STL
                        </button>
                    )}
                    {scadCode && (
                        <button className="download-btn" onClick={handleDownload}>
                            ⬇️ SCAD
                        </button>
                    )}
                </div>
            </div>

            <div className="preview-content">
                {!scadCode ? (
                    <div className="placeholder">
                        <div className="placeholder-icon">📦</div>
                        <h3>No CAD Model Yet</h3>
                        <p>Ask the AI assistant to generate a CAD design, and it will appear here!</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'code' ? (
                            <div className="code-container">
                                <pre>
                                    <code className="language-javascript">
                                        {scadCode}
                                    </code>
                                </pre>
                            </div>
                        ) : (
                            <div className="model-container">
                                {isLoading ? (
                                    <div className="loading-overlay">
                                        <div className="spinner"></div>
                                        <p>Generating 3D Model...</p>
                                    </div>
                                ) : error ? (
                                    <div className="error-overlay">
                                        <div className="error-icon">⚠️</div>
                                        <p>{error}</p>
                                        <button className="retry-btn" onClick={() => setActiveTab('code')}>
                                            View Source Code
                                        </button>
                                    </div>
                                ) : stlUrl ? (
                                    <Canvas shadows camera={{ position: [50, 50, 50], fov: 45 }}>
                                        <color attach="background" args={['#151b35']} />
                                        <Stage environment="city" intensity={0.6} adjustCamera={1.2}>
                                            <ModelViewer stlUrl={stlUrl} />
                                        </Stage>
                                        <OrbitControls makeDefault autoRotate autoRotateSpeed={2} />
                                    </Canvas>
                                ) : null}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CADPreview;
