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
    const [showCode, setShowCode] = useState(false); // Code hidden by default
    const [stlUrl, setStlUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (showCode) {
            Prism.highlightAll();
        }
    }, [scadCode, showCode]);

    // Generate 3D model when code changes
    useEffect(() => {
        if (!scadCode) {
            setStlUrl(null);
            return;
        }

        const generateModel = async () => {
            setIsLoading(true);
            setError(null);

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
            } catch (err) {
                console.error('Render error:', err);
                setError('Failed to render 3D model. Check the server logs.');
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
                <h2>📐 3D Model</h2>
                <div className="header-buttons">
                    {stlUrl && (
                        <button className="download-btn secondary" onClick={handleDownloadStl}>
                            ⬇️ STL
                        </button>
                    )}
                    {scadCode && (
                        <button className="download-btn" onClick={handleDownload}>
                            ⬇️ SCAD
                        </button>
                    )}
                    {scadCode && (
                        <button className={`toggle-code-btn ${showCode ? 'active' : ''}`} onClick={() => setShowCode(!showCode)}>
                            {showCode ? '✕ Hide Code' : '< Code'}
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
                        <div className={`model-container ${showCode ? 'with-code' : ''}`}>
                            {isLoading ? (
                                <div className="loading-overlay">
                                    <div className="spinner"></div>
                                    <p>Generating 3D Model...</p>
                                </div>
                            ) : error ? (
                                <div className="error-overlay">
                                    <div className="error-icon">⚠️</div>
                                    <p>{error}</p>
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
                        
                        {showCode && (
                            <div className="code-section">
                                <div className="code-header">Generated OpenSCAD Code</div>
                                <div className="code-container">
                                    <pre>
                                        <code className="language-scad">
                                            {scadCode}
                                        </code>
                                    </pre>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CADPreview;
