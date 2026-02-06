import { useState } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import CADPreview from './components/CADPreview';

function App() {
  const [scadCode, setScadCode] = useState('');
  const [fileName, setFileName] = useState('design.scad');

  return (
    <div className="app-container">
      <div className="split-view">
        <div className="cad-panel">
          <CADPreview scadCode={scadCode} fileName={fileName} />
        </div>
        <div className="chat-panel">
          <ChatInterface 
            onScadGenerated={(code, name) => {
              setScadCode(code);
              setFileName(name);
            }} 
          />
        </div>
      </div>
    </div>
  );
}

export default App;
