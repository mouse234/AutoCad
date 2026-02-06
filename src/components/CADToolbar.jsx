import { useState } from 'react';
import './CADToolbar.css';

const CADToolbar = ({ onToolSelect, onAction }) => {
    const [activeTool, setActiveTool] = useState(null);
    const [hoveredTool, setHoveredTool] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const handleToolClick = (toolId) => {
        setActiveTool(activeTool === toolId ? null : toolId);
        if (onToolSelect) {
            onToolSelect(toolId);
        }
    };

    const handleUndo = () => {
        if (undoStack.length > 0) {
            const newUndo = [...undoStack];
            newUndo.pop();
            setUndoStack(newUndo);
            setRedoStack([...redoStack, {}]);
        }
    };

    const handleRedo = () => {
        if (redoStack.length > 0) {
            const newRedo = [...redoStack];
            newRedo.pop();
            setRedoStack(newRedo);
            setUndoStack([...undoStack, {}]);
        }
    };

    const allTools = [
        // Edit Tools
        { id: 'select', icon: '⬚', label: 'Select', desc: 'Pick objects to edit', category: 'edit' },
        { id: 'move', icon: '↔', label: 'Move', desc: 'Shift objects to new position', category: 'edit' },
        { id: 'copy', icon: '⎘', label: 'Copy', desc: 'Duplicate geometry', category: 'edit' },
        { id: 'rotate', icon: '↻', label: 'Rotate', desc: 'Turn around base point', category: 'edit' },
        { id: 'scale', icon: '⚖', label: 'Scale', desc: 'Increase or reduce size', category: 'edit' },
        { id: 'trim', icon: '✂', label: 'Trim', desc: 'Remove unwanted portions', category: 'edit' },
        { id: 'extend', icon: '→|', label: 'Extend', desc: 'Lengthen objects', category: 'edit' },
        { id: 'offset', icon: '⟦⟧', label: 'Offset', desc: 'Parallel copies at distance', category: 'edit' },
        { id: 'mirror', icon: '⟷', label: 'Mirror', desc: 'Symmetrical copy across axis', category: 'edit' },
        { id: 'erase', icon: '🗑', label: 'Erase', desc: 'Remove selected objects', category: 'edit' },
        // Divider
        { id: 'divider1', isDivider: true },
        // View Tools
        { id: 'zoomIn', icon: '🔍+', label: 'Zoom In', desc: 'Focus on details', category: 'view' },
        { id: 'zoomOut', icon: '🔍−', label: 'Zoom Out', desc: 'See more area', category: 'view' },
        { id: 'zoomExtents', icon: '⊡', label: 'Zoom Extents', desc: 'View all content', category: 'view' },
        { id: 'pan', icon: '✋', label: 'Pan', desc: 'Move around drawing', category: 'view' },
        { id: 'divider2', isDivider: true },
        { id: 'undo', icon: '↶', label: 'Undo', desc: 'Fix mistakes (Ctrl+Z)', category: 'view', disabled: undoStack.length === 0 },
        { id: 'redo', icon: '↷', label: 'Redo', desc: 'Redo action (Ctrl+Y)', category: 'view', disabled: redoStack.length === 0 },
        { id: 'divider3', isDivider: true },
        { id: 'osnap', icon: '◉', label: 'OSNAP', desc: 'Precise object snapping', category: 'view' },
        { id: 'grips', icon: '●', label: 'Grips', desc: 'Quick edit handles', category: 'view' },
    ];

    return (
        <div className="cad-toolbar">
            {allTools.map((tool) => {
                if (tool.isDivider) {
                    return <div key={tool.id} className="toolbar-divider"></div>;
                }

                const isActive = activeTool === tool.id;
                const isHovered = hoveredTool === tool.id && !tool.disabled;

                return (
                    <div key={tool.id} className="tool-wrapper">
                        <button
                            className={`tool-icon-btn ${isActive ? 'active' : ''} ${tool.disabled ? 'disabled' : ''}`}
                            onClick={() => {
                                if (tool.id === 'undo') handleUndo();
                                else if (tool.id === 'redo') handleRedo();
                                else handleToolClick(tool.id);
                            }}
                            onMouseEnter={() => setHoveredTool(tool.id)}
                            onMouseLeave={() => setHoveredTool(null)}
                            disabled={tool.disabled}
                            title={`${tool.label}: ${tool.desc}`}
                        >
                            {tool.icon}
                        </button>
                        
                        {/* Tooltip on Hover */}
                        {isHovered && (
                            <div className="tool-tooltip">
                                <div className="tooltip-label">{tool.label}</div>
                                <div className="tooltip-desc">{tool.desc}</div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default CADToolbar;
