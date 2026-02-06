import { useState, useEffect } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import CADPreview from './components/CADPreview';
import CADToolbar from './components/CADToolbar';
import AuthModal from './components/AuthModal';
import SessionsList from './components/SessionsList';

function App() {
  const [scadCode, setScadCode] = useState('');
  const [fileName, setFileName] = useState('design.scad');
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(localStorage.getItem('lastSessionId') || null);
  const [projectName, setProjectName] = useState('Untitled Design');
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showScadModal, setShowScadModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to CAD Design Studio. Describe the mechanical part you need and our Advanced AI Design Engine will produce parametric OpenSCAD code.\n\nExamples:\n- Create a gear with 20 teeth and 5mm bore\n- Mounting bracket 50 x 40 mm with four clearance holes\n- Cylindrical shaft, 20 mm diameter, 100 mm length'
    }
  ]);

  const handleGuest = () => {
    setUser({ name: 'Guest', avatar: null });
  };

  const handleNewSession = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/session/create', { method: 'POST' });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('lastSessionId', data.sessionId);
        // Reset CAD state
        setScadCode('');
        setFileName('design.scad');
        setChatMessages([
          {
            role: 'assistant',
            content: 'Welcome to CAD Design Studio. Describe the mechanical part you need and our Advanced AI Design Engine will produce parametric OpenSCAD code.\n\nExamples:\n- Create a gear with 20 teeth and 5mm bore\n- Mounting bracket 50 x 40 mm with four clearance holes\n- Cylindrical shaft, 20 mm diameter, 100 mm length'
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleResumeSession = async (sessionIdToResume) => {
    try {
      const res = await fetch(`http://localhost:3001/api/session/${sessionIdToResume}`);
      const session = await res.json();

      if (session.id) {
        setSessionId(session.id);
        localStorage.setItem('lastSessionId', session.id);

        // Reconstruct messages for display
        const displayMessages = session.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Add welcome message if no messages
        if (displayMessages.length === 0) {
          displayMessages.push({
            role: 'assistant',
            content: 'Welcome to CAD Design Studio. Describe the mechanical part you need and our Advanced AI Design Engine will produce parametric OpenSCAD code.\n\nExamples:\n- Create a gear with 20 teeth and 5mm bore\n- Mounting bracket 50 x 40 mm with four clearance holes\n- Cylindrical shaft, 20 mm diameter, 100 mm length'
          });
        }

        setChatMessages(displayMessages);

        // Load latest SCAD code if available
        const lastAssistantMsg = [...session.messages].reverse().find(m => m.role === 'assistant' && m.scadCode);
        if (lastAssistantMsg) {
          setScadCode(lastAssistantMsg.scadCode);
          setFileName(lastAssistantMsg.fileName || 'design.scad');
        }
      }
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  // Auto-initialize session on first load
  useEffect(() => {
    if (!sessionId && user) {
      handleNewSession();
    }
  }, [user]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">🎨</div>
          <h1 className="app-name">Design Studio</h1>
          <span className="version">v1.0</span>
        </div>
        <div className="toolbar-container">
          <CADToolbar onToolSelect={(toolId) => console.log('Tool:', toolId)} onAction={(action) => console.log('Action:', action)} />
        </div>
        <div className="header-center">
          {isEditingProject ? (
            <input
              type="text"
              className="project-name-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingProject(false)}
              onKeyPress={(e) => e.key === 'Enter' && setIsEditingProject(false)}
              autoFocus
            />
          ) : (
            <div className="breadcrumb" onClick={() => setIsEditingProject(true)} title="Click to edit project name">
              Project / <span className="editable">{projectName}</span>
            </div>
          )}
        </div>
        <div className="header-right">
          {scadCode && (
            <button className="icon-btn" title="View SCAD Code" onClick={() => setShowScadModal(true)}>{'</>'}</button>
          )}
          <button className="icon-btn" title="View Sessions" onClick={() => setShowSessions(true)}>📚</button>
          <button className="icon-btn" title="New Session" onClick={handleNewSession}>+</button>
          <button className="icon-btn" title="Help" onClick={() => setShowHelp(true)}>?</button>
          <button className="icon-btn" title="Settings" onClick={() => setShowSettings(true)}>⚙️</button>
          {user && <div className="user-badge">{user.name.charAt(0)}</div>}
          {!user && <button className="login-btn" onClick={() => setUser({ name: 'Guest' })}>Sign In</button>}
        </div>
      </header>

      <div className="workspace">
        <div className="viewport-section">
          <CADPreview scadCode={scadCode} fileName={fileName} />
        </div>
        <div className="chat-section">
          <ChatInterface 
            onScadGenerated={(code, name) => {
              setScadCode(code);
              setFileName(name);
            }} 
            user={user}
            sessionId={sessionId}
            onSessionChange={setSessionId}
            initialMessages={chatMessages}
            onMessagesChange={setChatMessages}
          />
        </div>
      </div>

      {!user && <AuthModal onGuest={handleGuest} />}
      {showSessions && user && (
        <SessionsList
          currentSessionId={sessionId}
          onResumeSession={handleResumeSession}
          onClose={() => setShowSessions(false)}
        />
      )}

      {/* SCAD Code Viewer Modal */}
      {showScadModal && scadCode && (
        <div className="modal-backdrop" onClick={() => setShowScadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generated SCAD Code</h3>
              <button className="close-btn" onClick={() => setShowScadModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <pre><code>{scadCode}</code></pre>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => {
                const blob = new Blob([scadCode], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                📥 Download SCAD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Settings</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="settings-group">
                <label>Project Name</label>
                <p>Current: <strong>{projectName}</strong></p>
              </div>
              <div className="settings-group">
                <label>Backend Server</label>
                <p>http://localhost:3001</p>
              </div>
              <div className="settings-group">
                <label>Frontend Server</label>
                <p>http://localhost:5173</p>
              </div>
              <div className="settings-group">
                <label>Session ID</label>
                <p className="monospace">{sessionId || 'None'}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Help & Documentation</h3>
              <button className="close-btn" onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="modal-body">
              <h4>Getting Started</h4>
              <p>1. Describe the mechanical part you need in natural language</p>
              <p>2. The AI will generate parametric OpenSCAD code</p>
              <p>3. View the 3D model in real-time</p>
              <p>4. Download as SCAD, STL, or PNG</p>

              <h4 style={{ marginTop: '16px' }}>Keyboard Shortcuts</h4>
              <p><strong>Ctrl+S</strong> - Save project (future)</p>
              <p><strong>Click project name</strong> - Edit name</p>

              <h4 style={{ marginTop: '16px' }}>Toolbar Controls</h4>
              <p>🔍+ / 🔍− - Zoom in/out</p>
              <p>⊡ - Fit all (zoom to model)</p>
              <p>🔄 - Reset view</p>
              <p>⬆ - Extrude</p>
              <p>⬇ - Pocket</p>
              <p>~ - Fillet</p>
              <p>∧ - Chamfer</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowHelp(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
