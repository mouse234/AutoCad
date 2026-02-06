import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
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

// NOTE: This server uses the WASM OpenSCAD runtime (openscad-playground) via a worker
// so no system-installed OpenSCAD binary is required.

// Render endpoint — local OpenSCAD only (standalone SCAD server)
app.post('/api/render', async (req, res) => {
    try {
        const { scadCode } = req.body;
        if (!scadCode) return res.status(400).json({ error: 'SCAD code is required' });

        const stlBase64 = await renderLocally(scadCode);
        res.json({ stlData: stlBase64, scadCode });
    } catch (error) {
        console.error('Render API Error:', error);
        res.status(500).json({ error: 'Internal server error during rendering' });
    }
});

// (Standalone) local helper will handle file read/cleanup; no cloud endpoint in standalone mode.

// Helper: render SCAD code locally and return base64 STL
function renderLocally(scadCode) {
    return new Promise((resolve, reject) => {
        try {
            // Use the openscad-playground worker (WASM) bundled in node_modules
            const workerPath = path.join(__dirname, '..', 'node_modules', 'openscad-playground', 'dist', 'openscad-worker.cjs');
            if (!fs.existsSync(workerPath)) return reject(new Error(`openscad-playground worker not found at ${workerPath}`));

            const w = new Worker(workerPath, { argv: [], execArgv: [] });

            const timeout = setTimeout(() => {
                w.terminate();
                reject(new Error('OpenSCAD WASM worker timed out'));
            }, parseInt(process.env.OPENSCAD_WASM_TIMEOUT || '120000', 10));

            w.on('message', (msg) => {
                if (msg && msg.result) {
                    clearTimeout(timeout);
                    const result = msg.result;
                    // result.outputs is array of [path, Uint8Array]
                    if (result.outputs && result.outputs.length > 0) {
                        const out = result.outputs[0][1];
                        const buf = Buffer.from(out);
                        w.terminate();
                        resolve(buf.toString('base64'));
                        return;
                    }
                    w.terminate();
                    reject(new Error('No output produced by OpenSCAD WASM worker'));
                } else if (msg && msg.error) {
                    clearTimeout(timeout);
                    w.terminate();
                    reject(new Error(msg.error));
                }
            });

            w.on('error', (err) => {
                reject(err);
            });

            w.on('exit', (code) => {
                if (code !== 0) {
                    // if worker exits without message, reject
                    reject(new Error(`OpenSCAD worker exited with code ${code}`));
                }
            });

            // Post the message to the worker: inputs + args + outputPaths
            w.postMessage({
                inputs: [ { path: 'input.scad', content: scadCode } ],
                args: [ '-o', 'output.stl', 'input.scad' ],
                outputPaths: [ 'output.stl' ]
            });
        } catch (e) {
            reject(e);
        }
    });
}

// No remote cloud renderer in standalone mode.

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
