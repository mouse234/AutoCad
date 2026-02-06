import { useState, useEffect, useMemo, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import axios from 'axios';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, Stage, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';

import './CADPreview.css';

const ModelViewer = ({ stlUrl, scale = 1, onMetrics, cameraRef, onCanvasReady }) => {
    const geometry = useLoader(STLLoader, stlUrl);
    const { camera, gl } = useThree();
    const controlsRef = useRef(null);

    // Expose canvas through callback
    useEffect(() => {
        if (gl && gl.domElement && onCanvasReady) {
            onCanvasReady(gl.domElement);
        }
    }, [gl, onCanvasReady]);

    // Auto-center, compute normals and bounding box for metrics
    useMemo(() => {
        if (geometry) {
            geometry.computeVertexNormals();
            geometry.center();
            geometry.computeBoundingBox();

            if (geometry.boundingBox && typeof onMetrics === 'function') {
                const size = new THREE.Vector3();
                geometry.boundingBox.getSize(size);
                onMetrics({ x: size.x * scale, y: size.y * scale, z: size.z * scale });
            }
        }
    }, [geometry, onMetrics, scale]);

    // Expose camera controls to parent
    useEffect(() => {
        if (controlsRef.current && cameraRef) {
            cameraRef.current = {
                controls: controlsRef.current,
                camera,
                fitAll: () => {
                    if (controlsRef.current && geometry) {
                        geometry.computeBoundingBox();
                        const size = new THREE.Vector3();
                        geometry.boundingBox.getSize(size);
                        const maxDim = Math.max(size.x, size.y, size.z);
                        const fov = camera.fov * (Math.PI / 180);
                        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                        cameraZ = Math.max(cameraZ, 10);
                        camera.position.set(cameraZ, cameraZ, cameraZ);
                        controlsRef.current.target.set(0, 0, 0);
                        controlsRef.current.update();
                    }
                },
                resetView: () => {
                    camera.position.set(50, 50, 50);
                    controlsRef.current.target.set(0, 0, 0);
                    controlsRef.current.update();
                },
                zoomIn: () => {
                    if (controlsRef.current) {
                        controlsRef.current.dollyIn(1.2);
                        controlsRef.current.update();
                    }
                },
                zoomOut: () => {
                    if (controlsRef.current) {
                        controlsRef.current.dollyOut(1.2);
                        controlsRef.current.update();
                    }
                }
            };
        }
    }, [controlsRef, camera, geometry]);

    return (
        <>
            <Center>
                <mesh geometry={geometry} castShadow receiveShadow>
                    <meshStandardMaterial color="#4a90ff" roughness={0.5} metalness={0.1} />
                </mesh>
            </Center>
            <OrbitControls ref={controlsRef} makeDefault autoRotate autoRotateSpeed={2} />
        </>
    );
};

const CADPreview = ({ scadCode, fileName }) => {
    const [showCode, setShowCode] = useState(false); // Code hidden by default
    const [stlUrl, setStlUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scale, setScale] = useState(1.0);
    const [dimensions, setDimensions] = useState(null);
    const [units, setUnits] = useState('mm'); // 'mm' or 'in'
    const cameraRef = useRef(null);
    const [showOpDialog, setShowOpDialog] = useState(null); // 'extrude', 'pocket', 'fillet', 'chamfer', or null
    const [opParams, setOpParams] = useState({});
    const [showToolbar, setShowToolbar] = useState(true); // Show CAD toolbar by default
    const [activeTool, setActiveTool] = useState(null);
    const canvasRef = useRef(null); // Store canvas reference for PNG export

    const handleViewportControl = (action) => {
        if (!cameraRef.current) return;
        switch (action) {
            case 'zoomIn':
                cameraRef.current.zoomIn?.();
                break;
            case 'zoomOut':
                cameraRef.current.zoomOut?.();
                break;
            case 'fitAll':
                cameraRef.current.fitAll?.();
                break;
            case 'resetView':
                cameraRef.current.resetView?.();
                break;
            default:
                break;
        }
    };

    const handleToolSelect = (toolId) => {
        setActiveTool(toolId);
        console.log(`Selected tool: ${toolId}`);
        // Tool-specific actions can be implemented here
        switch (toolId) {
            case 'zoomIn':
                handleViewportControl('zoomIn');
                break;
            case 'zoomOut':
                handleViewportControl('zoomOut');
                break;
            case 'zoomExtents':
                handleViewportControl('fitAll');
                break;
            case 'pan':
                // Pan mode would be toggled here
                break;
            case 'select':
                // Selection mode would be activated
                break;
            case 'move':
                // Move mode
                break;
            case 'rotate':
                // Rotate mode
                break;
            case 'scale':
                // Scale mode
                break;
            case 'copy':
                // Copy mode
                break;
            case 'mirror':
                // Mirror mode
                break;
            case 'offset':
                // Offset mode
                break;
            case 'erase':
                // Delete mode
                break;
            case 'trim':
                // Trim mode
                break;
            case 'extend':
                // Extend mode
                break;
            case 'osnap':
                // Object snap toggle
                break;
            case 'grips':
                // Grips mode
                break;
            default:
                break;
        }
    };

    const handleToolAction = (actionId) => {
        console.log(`Tool action: ${actionId}`);
        // Handle specific tool actions
    };

    const handleModelOperation = (operation) => {
        setShowOpDialog(operation);
        setOpParams({
            extrude: { height: 10, face: 'top' },
            pocket: { depth: 5, face: 'top' },
            fillet: { radius: 2, edges: 'all' },
            chamfer: { distance: 1, edges: 'all' }
        }[operation] || {});
    };

    const applyModelOperation = () => {
        // Placeholder: In a real CAD app, this would modify geometry
        // For now, we'll show a notification and close the dialog
        console.log(`Applied ${showOpDialog} with params:`, opParams);
        setShowOpDialog(null);
    };

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
                const response = await axios.post('/api/render', { scadCode });

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

    const handleExportPNG = () => {
        if (!canvasRef.current) {
            console.warn('Canvas not available for PNG export');
            return;
        }
        
        try {
            // Get canvas data URL with proper context
            const canvas = canvasRef.current;
            
            // Check if canvas has actual content
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 1, 1);
            const hasContent = imageData.data[3] > 0; // Check alpha channel
            
            if (!hasContent) {
                console.warn('Canvas appears blank, attempting to capture anyway');
            }
            
            const dataUrl = canvas.toDataURL('image/png');
            
            if (dataUrl === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==') {
                console.error('Canvas generated blank image');
                return;
            }
            
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = fileName.replace('.scad', '.png');
            a.click();
        } catch (e) {
            console.error('Export PNG failed:', e);
            alert('Failed to export PNG. Please try again.');
        }
    };

    const handleCopyDimensions = async () => {
        if (!dimensions) return;
        const fmt = (v) => (units === 'mm' ? `${v.toFixed(2)} mm` : `${(v / 25.4).toFixed(3)} in`);
        const text = `X: ${fmt(dimensions.x)}, Y: ${fmt(dimensions.y)}, Z: ${fmt(dimensions.z)}`;
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            console.error('Clipboard copy failed', e);
        }
    };

    return (
        <div className="cad-preview">
            {/* Viewport Controls Toolbar - Always Visible */}
            <div className="viewport-toolbar">
                <div className="toolbar-group">
                    <button className="toolbar-icon-btn" disabled={!stlUrl} onClick={() => handleViewportControl('zoomIn')} title="Zoom in">🔍+</button>
                    <button className="toolbar-icon-btn" disabled={!stlUrl} onClick={() => handleViewportControl('zoomOut')} title="Zoom out">🔍−</button>
                    <button className="toolbar-icon-btn" disabled={!stlUrl} onClick={() => handleViewportControl('fitAll')} title="Fit all">⊡</button>
                    <button className="toolbar-icon-btn" disabled={!stlUrl} onClick={() => handleViewportControl('resetView')} title="Reset view">🔄</button>
                </div>
                <div className="toolbar-divider-vertical"></div>
                <div className="toolbar-group">
                    <button className="toolbar-icon-btn" disabled={!stlUrl} onClick={() => handleModelOperation('extrude')} title="Extrude feature">⬆</button>
                    <button className="toolbar-icon-btn" disabled={!stlUrl} onClick={() => handleModelOperation('pocket')} title="Pocket (subtract)">⬇</button>
                    <button className="toolbar-icon-btn" disabled={!stlUrl} onClick={() => handleModelOperation('fillet')} title="Fillet edges">~</button>
                    <button className="toolbar-icon-btn" disabled={!stlUrl} onClick={() => handleModelOperation('chamfer')} title="Chamfer edges">∧</button>
                </div>
            </div>

            <div className="preview-toolbar">
                <div className="toolbar-left">
                    <h3 className="panel-title">3D Viewport</h3>
                </div>
                <div className="toolbar-center">
                    {stlUrl && dimensions && (
                        <button className="toolbar-btn" onClick={handleCopyDimensions} title="Copy dimensions to clipboard">
                            📋 {dimensions.x.toFixed(1)}×{dimensions.y.toFixed(1)}×{dimensions.z.toFixed(1)}
                        </button>
                    )}
                </div>
                <div className="toolbar-right">
                    {stlUrl && (
                        <>
                            <button className="icon-btn-small" onClick={handleDownloadStl} title="Download STL">
                                STL
                            </button>
                            <button className="icon-btn-small" onClick={handleExportPNG} title="Export PNG">
                                PNG
                            </button>
                        </>
                    )}
                    {scadCode && (
                        <button className="icon-btn-small" onClick={handleDownload} title="Download SCAD source">
                            CODE
                        </button>
                    )}
                    <div className="toolbar-divider"></div>
                    <div className="scale-control">
                        <label>Scale:</label>
                        <input type="range" min="0.1" max="5" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} />
                        <span className="scale-value">{scale.toFixed(1)}x</span>
                    </div>
                    <div className="unit-control">
                        <select value={units} onChange={(e) => setUnits(e.target.value)} aria-label="Units">
                            <option value="mm">mm</option>
                            <option value="in">in</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="preview-content">
                {!scadCode ? (
                        <div className="placeholder">
                        <div className="placeholder-icon">📦</div>
                        <h3>No CAD Model Yet</h3>
                        <p>Describe your design using natural language and our AI will generate a CAD model — it will appear here.</p>
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
                                        <group scale={[scale, scale, scale]}>
                                            <ModelViewer stlUrl={stlUrl} scale={scale} onMetrics={setDimensions} cameraRef={cameraRef} onCanvasReady={(canvas) => canvasRef.current = canvas} />
                                        </group>
                                    </Stage>
                                </Canvas>
                            ) : null}
                        </div>
                        {dimensions && (
                            <div className="dimensions-overlay">
                                <div>Dimensions (approx):</div>
                                <div className="dims">X: {dimensions.x.toFixed(1)} mm</div>
                                <div className="dims">Y: {dimensions.y.toFixed(1)} mm</div>
                                <div className="dims">Z: {dimensions.z.toFixed(1)} mm</div>
                            </div>
                        )}
                        
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

            {/* Model Operation Dialog */}
            {showOpDialog && (
                <div className="operation-dialog-backdrop" onClick={() => setShowOpDialog(null)}>
                    <div className="operation-dialog" onClick={(e) => e.stopPropagation()}>
                        <h3>{showOpDialog.charAt(0).toUpperCase() + showOpDialog.slice(1)} Parameters</h3>
                        <div className="dialog-body">
                            {showOpDialog === 'extrude' && (
                                <>
                                    <label>Height (mm):</label>
                                    <input type="number" value={opParams.height} onChange={(e) => setOpParams({...opParams, height: parseFloat(e.target.value)})} />
                                    <label>Face:</label>
                                    <select value={opParams.face} onChange={(e) => setOpParams({...opParams, face: e.target.value})}>
                                        <option>top</option>
                                        <option>bottom</option>
                                        <option>all</option>
                                    </select>
                                </>
                            )}
                            {showOpDialog === 'pocket' && (
                                <>
                                    <label>Depth (mm):</label>
                                    <input type="number" value={opParams.depth} onChange={(e) => setOpParams({...opParams, depth: parseFloat(e.target.value)})} />
                                    <label>Target Face:</label>
                                    <select value={opParams.face} onChange={(e) => setOpParams({...opParams, face: e.target.value})}>
                                        <option>top</option>
                                        <option>bottom</option>
                                    </select>
                                </>
                            )}
                            {showOpDialog === 'fillet' && (
                                <>
                                    <label>Radius (mm):</label>
                                    <input type="number" value={opParams.radius} onChange={(e) => setOpParams({...opParams, radius: parseFloat(e.target.value)})} />
                                    <label>Apply to:</label>
                                    <select value={opParams.edges} onChange={(e) => setOpParams({...opParams, edges: e.target.value})}>
                                        <option value="all">All edges</option>
                                        <option value="selected">Selected edges</option>
                                    </select>
                                </>
                            )}
                            {showOpDialog === 'chamfer' && (
                                <>
                                    <label>Distance (mm):</label>
                                    <input type="number" value={opParams.distance} onChange={(e) => setOpParams({...opParams, distance: parseFloat(e.target.value)})} />
                                    <label>Apply to:</label>
                                    <select value={opParams.edges} onChange={(e) => setOpParams({...opParams, edges: e.target.value})}>
                                        <option value="all">All edges</option>
                                        <option value="selected">Selected edges</option>
                                    </select>
                                </>
                            )}
                        </div>
                        <div className="dialog-footer">
                            <button className="dialog-btn cancel" onClick={() => setShowOpDialog(null)}>Cancel</button>
                            <button className="dialog-btn apply" onClick={applyModelOperation}>Apply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CADPreview;
