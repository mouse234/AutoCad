import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';



const app = express();
const PORT = 3001;

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt for CAD generation
const SYSTEM_PROMPT = `You are an expert AI CAD Wrapper integrated into a CAD generation system.
Users interact with you using natural language to design mechanical parts and assemblies.

Your responsibilities:
1. Interpret user intent and translate it into precise CAD geometry
2. Ask clear, minimal clarification questions if dimensions, constraints, or features are missing
3. Generate parametric OpenSCAD models suitable for manufacturing
4. Default units: millimeters

Modeling rules:
- Ensure solids are closed (manifold / watertight)
- Avoid self-intersections
- Use realistic tolerances
- Prefer simple, editable geometry

Output rules:
- ALWAYS wrap your OpenSCAD code in triple backticks with 'scad' language identifier
- Format: \`\`\`scad\\nYOUR_CODE_HERE\\n\`\`\`
- Include helpful comments in the code
- Provide brief explanations before the code
- Suggest download filename like "design_name.scad"

Example response format:
"I'll create a mounting bracket for you!

\`\`\`scad
// Mounting bracket 50x40mm with 4 M4 holes
bracket_length = 50;
bracket_width = 40;
// ... rest of code
\`\`\`

You can download this as: **mounting_bracket.scad**"`;

// Cross-platform OpenSCAD path detection
function getOpenSCADPath() {
    const platform = os.platform();

    if (platform === 'win32') {
        // Windows paths - check common installation locations
        const windowsPaths = [
            'C:\\Program Files\\OpenSCAD\\openscad.exe',
            'C:\\Program Files (x86)\\OpenSCAD\\openscad.exe',
            path.join(process.env.LOCALAPPDATA || '', 'Programs\\OpenSCAD\\openscad.exe')
        ];

        for (const p of windowsPaths) {
            if (fs.existsSync(p)) {
                console.log(`Found OpenSCAD at: ${p}`);
                return p;
            }
        }

        // Try PATH as fallback
        console.log('OpenSCAD not found in standard Windows locations, trying PATH...');
        return 'openscad';

    } else if (platform === 'darwin') {
        // macOS path
        const macPath = '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD';
        if (fs.existsSync(macPath)) {
            console.log(`Found OpenSCAD at: ${macPath}`);
            return macPath;
        }
        return 'openscad'; // Try PATH

    } else {
        // Linux - typically in PATH
        console.log('Linux detected, using openscad from PATH');
        return 'openscad';
    }
}

// Render endpoint
app.post('/api/render', async (req, res) => {
    try {
        const { scadCode } = req.body;

        if (!scadCode) {
            return res.status(400).json({ error: 'SCAD code is required' });
        }

        const timestamp = Date.now();
        const scadPath = path.join(TEMP_DIR, `model_${timestamp}.scad`);
        const stlPath = path.join(TEMP_DIR, `model_${timestamp}.stl`);

        // Write SCAD file
        fs.writeFileSync(scadPath, scadCode);

        // Get OpenSCAD executable path based on platform
        const openscadCmd = getOpenSCADPath();

        exec(`"${openscadCmd}" -o "${stlPath}" "${scadPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('OpenSCAD Error:', error);

                // Fallback: try just 'openscad' if the path failed, maybe it's in PATH
                if (error.code === 127 || error.message.includes('not found')) {
                    exec(`openscad -o "${stlPath}" "${scadPath}"`, (err2, out2, stderr2) => {
                        if (err2) {
                            console.error('OpenSCAD Fallback Error:', err2);
                            return res.status(500).json({
                                error: 'OpenSCAD executable not found',
                                details: `Please install OpenSCAD from https://openscad.org/downloads.html\nTried paths: ${openscadCmd}, openscad (PATH)`
                            });
                        }
                        // Success block for fallback
                        sendResponse(stlPath, scadPath, scadCode, res);
                    });
                    return;
                }

                return res.status(500).json({
                    error: 'Failed to generate model',
                    details: stderr || error.message
                });
            }
            sendResponse(stlPath, scadPath, scadCode, res);
        });

    } catch (error) {
        console.error('Render API Error:', error);
        res.status(500).json({ error: 'Internal server error during rendering' });
    }
});

function sendResponse(stlPath, scadPath, scadCode, res) {
    try {
        const stlContent = fs.readFileSync(stlPath);

        // Clean up
        try {
            if (fs.existsSync(scadPath)) fs.unlinkSync(scadPath);
            if (fs.existsSync(stlPath)) fs.unlinkSync(stlPath);
        } catch (e) {
            console.error("Cleanup error", e);
        }

        res.json({
            stlData: stlContent.toString('base64'),
            scadCode
        });
    } catch (readError) {
        console.error('Read Error:', readError);
        res.status(500).json({ error: 'Failed to read generated model' });
    }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env file'
            });
        }

        // Initialize model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Build chat history for context
        const chatHistory = history
            .filter(msg => msg.role !== 'assistant' || !msg.content.includes('Hi! I\'m your AI CAD Assistant'))
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

        // Start chat with history
        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                {
                    role: 'model',
                    parts: [{ text: 'Understood! I\'m ready to help design CAD parts. I\'ll generate OpenSCAD code for any mechanical parts you describe.' }]
                },
                ...chatHistory
            ]
        });

        // Send message
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        // Extract SCAD code from response
        const scadMatch = responseText.match(/```scad\n([\s\S]*?)\n```/);
        const scadCode = scadMatch ? scadMatch[1] : null;

        // Extract filename suggestion
        const filenameMatch = responseText.match(/download.*?[:\*\*]*\s*([a-zA-Z0-9_-]+\.scad)/i);
        const fileName = filenameMatch ? filenameMatch[1] : 'design.scad';

        res.json({
            message: responseText,
            scadCode,
            fileName
        });

    } catch (error) {
        console.error('Error Details:', error);
        console.error('Response Error:', error.response);
        res.status(500).json({
            error: 'Failed to process request',
            details: error.message,
            stack: error.stack
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', geminiConfigured: !!process.env.GEMINI_API_KEY });
});

app.listen(PORT, () => {
    console.log(`🚀 CAD Chatbot Server running on http://localhost:${PORT}`);
    console.log(`📡 Gemini API configured: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
});
