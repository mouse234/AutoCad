# CAD Design Studio — Powered by Advanced AI

A professional React-based CAD generation studio that produces OpenSCAD files using advanced AI technology. The application provides a polished split-view interface with real-time 3D visualization, export capabilities, and parametric model generation.

![React](https://img.shields.io/badge/React-19.2-blue) ![AI_Powered](https://img.shields.io/badge/Powered_by-Advanced_AI-blueviolet) ![OpenSCAD](https://img.shields.io/badge/OpenSCAD-Ready-green)

## ✨ Features

## Key Features

- Natural language CAD generation: describe parts to produce parametric OpenSCAD models.
- Real-time 3D preview with export options (STL, SCAD, PNG).
- Advanced AI-powered code generation for robust and maintainable OpenSCAD output.

The following sections explain installation, running and troubleshooting for developers.
- 📐 **Live 3D Visualization** - Interactive Three.js renderer
- 💾 **STL Export** - Ready for 3D printing
- 🎨 **Beautiful UI** - Modern split-view interface
- ⚡ **Real-time Preview** - Instant code generation and rendering

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
   - Download from [nodejs.org](https://nodejs.org/)

2. **OpenSCAD** (for 3D rendering)
   - The backend uses a WASM OpenSCAD runtime (openscad-playground) for in-app rendering, so a system OpenSCAD binary is not required. If you prefer a native install for offline workflows or debugging, download it from [openscad.org/downloads](https://openscad.org/downloads.html).

3. **AI API Key**
   - Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone or download this repository**

2. **Install frontend dependencies:**
   ```powershell
   npm install
   ```

3. **Install backend dependencies:**
   ```powershell
   cd server
   npm install
   cd ..
   ```

4. **Configure API Key:**
   
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

   Also create `server/.env`:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

### Running the Application

You need to run **two servers** (backend and frontend):

#### Option 1: Using Two Terminals (Recommended)

**Terminal 1 - Backend Server:**
```powershell
cd server
npm start
```
Should show: `🚀 CAD Chatbot Server running on http://localhost:3001`

**Terminal 2 - Frontend Server:**
```powershell
npm run dev
```
Should show: `➜ Local: http://localhost:5173/`

#### Option 2: Using PowerShell Background Jobs

```powershell
# Start backend
Start-Job -ScriptBlock { cd server; npm start }

# Start frontend
npm run dev
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## � Usage Guide

### Generating CAD Models

1. **Type your request** in the chat interface, for example:
   - "Create a mounting bracket 50mm x 40mm with M4 holes"
   - "Design a cylindrical enclosure 80mm diameter, 50mm height"
   - "Make a gear with 20 teeth, 5mm bore"

2. **View the 3D model** in the preview panel (right side)
   - Rotate: Left-click and drag
   - Zoom: Scroll wheel
   - Pan: Right-click and drag

3. **Download files:**
   - Click **⬇️ STL** to download for 3D printing
   - Click **⬇️ SCAD** to download the OpenSCAD source code

### Tips for Best Results

- **Be specific** about dimensions (use millimeters)
- **Mention materials** or manufacturing constraints
- **Specify hole sizes** (e.g., "M4 clearance holes")
- **Ask for modifications** - the AI remembers context

## 🛠️ Troubleshooting

### Backend Won't Start

**Problem**: `GEMINI_API_KEY not configured`
- **Solution**: Ensure `.env` files exist with valid API key

**Problem**: `OpenSCAD not found`
- **Solution**: Install OpenSCAD to default location or add to PATH

### Frontend Shows Blank Page

**Problem**: Frontend not loading
- **Solution**: 
  1. Stop the frontend server (Ctrl+C)
  2. Run `npm run dev` again
  3. Clear browser cache and reload

### OpenSCAD Rendering Errors

**Problem**: `all points for rotate_extrude() must have the same X coordinate sign`
- **Solution**: This is an AI generation error. Try:
  1. Restart the backend server to reload improved prompts
  2. Ask the AI to regenerate the model
  3. The latest version includes fixes for this issue

**Problem**: `Command failed` or `Error: OpenSCAD not installed`
- **Solution**: If you are relying on a system-installed OpenSCAD binary, ensure it is installed and available on your `PATH`. The in-app renderer uses a WASM runtime by default, so this error usually only applies when the native binary is explicitly required.

## 📁 Project Structure

```
cad-chatbot/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── ChatInterface.jsx
│   │   └── CADPreview.jsx
│   ├── App.jsx
│   └── main.jsx
├── server/                 # Backend Node.js server
│   ├── index.js           # Express server + AI Integration
│   ├── temp/              # Temporary SCAD/STL files
│   └── .env               # API key configuration
├── public/                 # Static assets
└── package.json           # Frontend dependencies
```

## 🔧 Configuration

### Environment Variables

**`.env` (root):**
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**`server/.env`:**
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

This server runs OpenSCAD in-process using the WASM runtime bundled with `openscad-playground`, so no system-installed OpenSCAD binary is required. The `/api/render` endpoint compiles provided OpenSCAD code using the WASM runtime and returns a base64-encoded STL.

### AI Model Configuration

The application uses **Advanced AI (3 Flash Model)** by default for fast, efficient CAD generation. To change the model, edit `server/index.js`:

```javascript
const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview' // Change this
});
```

Available models:
- `gemini-3-flash-preview` - Fast and efficient (current)
- `gemini-1.5-pro` - Stable production model
- `gemini-1.5-flash` - Fast and efficient

## 🎨 Features in Detail

### AI-Powered Design
- Natural language understanding
- Context-aware conversations
- Parametric design generation
- Manufacturing-ready code

### 3D Visualization
- Real-time STL rendering
- Interactive camera controls
- Professional lighting and shadows
- Auto-rotating preview

### Code Quality
- Clean, commented OpenSCAD code
- Parametric variables for easy editing
- Best practices for 3D printing
- Manifold geometry validation

## 🐛 Known Issues

1. **First render is slow** - OpenSCAD compilation can take 30-60 seconds for complex models
2. **Large models** - Very complex geometries may timeout or run out of memory
3. **Preview models** - Flash models require API access (may have usage limits)

## 📝 Development

### Running in Development Mode

```powershell
# Frontend with hot reload
npm run dev

# Backend with auto-restart (optional)
cd server
npm install -g nodemon
nodemon index.js
```

### Building for Production

```powershell
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Advanced AI** - For the powerful language model
- **OpenSCAD** - For the amazing CAD kernel
- **Three.js** - For 3D rendering capabilities
- **React** - For the UI framework

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Ensure all prerequisites are installed
3. Verify your API key is valid
4. Restart both servers

---

**Built with ❤️ using React, Node.js, and Advanced AI**
