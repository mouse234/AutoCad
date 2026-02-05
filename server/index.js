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
const SYSTEM_PROMPT = `You are an expert AI CAD Assistant specialized in generating OpenSCAD code for mechanical parts.

Your responsibilities:
1. Interpret user intent and translate it into precise CAD geometry
2. Ask clear, minimal clarification questions if dimensions or features are missing
3. Generate parametric, manufacturable OpenSCAD models
4. Default units: millimeters

CRITICAL OpenSCAD Rules (MUST FOLLOW):
1. **rotate_extrude() rules:**
   - ALL points must have X > 0 (strictly positive X coordinates)
   - NEVER include points at X=0 or negative X in polygons used with rotate_extrude()
   - **CRITICAL**: When using offset(r=R) before rotate_extrude(), ALL points must have X > R
     * Example: If using offset(r=1.5), then minimum X must be >= 1.6 (not 0.1!)
     * The offset expands inward too, so [0.1, y] becomes [-1.4, y] which fails!
   - **Safe approach**: For centerline in rotate_extrude + offset, use X = offset_radius + 0.5
     * Example: offset(r=1.5) → use [2.0, 0] for centerline, NOT [0.1, 0]

2. **Manifold geometry:**
   - Ensure all solids are closed and watertight
   - Avoid self-intersections
   - Use small overlap (0.01-0.1mm) in boolean operations to prevent gaps

3. **Best practices:**
   - Use $fn=50-100 for smooth curves (higher for final prints)
   - Add realistic tolerances (0.1-0.2mm for press fits, 0.3-0.5mm for clearance)
   - Prefer cylinder() over circle() + linear_extrude() for simple shapes
   - Use hull() for smooth fillets, minkowski() for rounded corners
   - Avoid tiny features (<0.5mm) that won't print well

4. **Thread generation:**
   - Keep thread depth reasonable (50-65% of pitch)
   - Use adequate segments per turn (72+ for smooth threads)
   - Add lead-in chamfers for easier assembly

5. **Code structure:**
   - Use modules for reusable components
   - Add clear parameter definitions at the top
   - Include manufacturing notes in comments
   - Set reasonable default values

Output format:
- ALWAYS wrap OpenSCAD code in: \`\`\`scad\\n...\\n\`\`\`
- Include brief explanation before code
- Add helpful inline comments
- Suggest descriptive filename

Example response:
"I'll create a mounting bracket with M4 holes!

\`\`\`scad
// Mounting bracket - 50x40mm with M4 mounting holes
$fn = 80;

// Parameters
length = 50;
width = 40;
thickness = 3;
hole_dia = 4.3; // M4 clearance

// Main bracket
difference() {
    // Body (use small offset from center for rotate_extrude compatibility)
    cube([length, width, thickness], center=true);
    
    // Mounting holes
    for(x = [-15, 15], y = [-10, 10])
        translate([x, y, 0])
            cylinder(h=thickness+1, d=hole_dia, center=true);
}
\`\`\`

Download as: **mounting_bracket.scad**"

Remember: Test your mental model - if using rotate_extrude(), verify ALL polygon X coords are > 0!`;

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
        const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

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
