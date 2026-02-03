# 🤖 AI CAD Chatbot

A beautiful React-based AI chatbot that generates OpenSCAD CAD files using Google's Gemini API. Features a split-view interface similar to Claude's artifact view.

![CAD Chatbot](https://img.shields.io/badge/React-18.3-blue) ![Gemini-API](https://img.shields.io/badge/Gemini-AI-orange) ![OpenSCAD](https://img.shields.io/badge/OpenSCAD-Ready-green)

## ✨ Features

- 💬 **Natural Language CAD Design** - Describe parts in plain English
- 📐 **Live Code Preview** - See generated OpenSCAD code instantly
- ⬇️ **One-Click Download** - Download `.scad` files directly
- 🎨 **Beautiful UI** - Modern dark theme with glassmorphism effects
- 🚀 **Powered by Gemini** - Advanced AI understanding of CAD requirements

## 🖼️ Interface

Split-view design:
- **Left Panel**: Chat interface with AI assistant
- **Right Panel**: Live CAD code preview with syntax highlighting

## 🚀 Quick Start

### 1️⃣ Get Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key

### 2️⃣ Configure Environment

Edit `.env` file in the root directory:

```bash
GEMINI_API_KEY=your_actual_api_key_here
```

### 3️⃣ Install Dependencies

```bash
# Install frontend dependencies (already done)
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 4️⃣ Run the Application

**Terminal 1 - Backend Server:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend (Vite Dev Server):**
```bash
npm run dev
```

### 5️⃣ Open Browser

Navigate to: **http://localhost:5173**

## 📝 Usage Examples

Try these prompts:

- *"Create a box 100x60x30mm with 4 M4 screw holes in the corners"*
- *"Design a gear with 20 teeth and 5mm bore"*
- *"Make a mounting bracket 50x40mm with 4 holes"*
- *"Create a cylindrical shaft 20mm diameter, 100mm long"*

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Axios** - HTTP client
- **Prism.js** - Syntax highlighting
- **CSS3** - Modern styling with gradients & animations

### Backend
- **Express.js** - Web server
- **Google Gemini AI** - Natural language processing
- **CORS** - Cross-origin support
- **dotenv** - Environment variables

## 📁 Project Structure

```
cad-chatbot/
├── src/
│   ├── components/
│   │   ├── ChatInterface.jsx       # Chat UI component
│   │   ├── ChatInterface.css
│   │   ├── CADPreview.jsx          # Code preview panel
│   │   └── CADPreview.css
│   ├── App.jsx                     # Main app component
│   ├── App.css
│   └── main.jsx
├── server/
│   ├── index.js                    # Express + Gemini API
│   └── package.json
├── .env                            # API keys (DO NOT COMMIT)
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

### Port Configuration

- **Frontend**: `http://localhost:5173` (Vite default)
- **Backend**: `http://localhost:3001` (Express server)

## 🎨 Design Features

- **Dark Theme** - Easy on the eyes
- **Glassmorphism** - Modern frosted glass effects
- **Gradient Accents** - Blue & orange color scheme
- **Smooth Animations** - Micro-interactions for better UX
- **Responsive Layout** - Mobile-friendly design

## 🐛 Troubleshooting

### Backend won't start
- Check if `GEMINI_API_KEY` is set in `.env`
- Ensure port 3001 is available

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check CORS is enabled (already configured)

### No SCAD code generated
- Ensure you're asking for CAD designs
- Check backend logs for Gemini API errors

## 📦 Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## 🤝 Contributing

Feel free to open issues or submit PRs!

## 📄 License

MIT License - feel free to use for your own projects!

---

**Made with ❤️ using React + Gemini AI**
