import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';

// Polyfill for openscad-playground worker which expects 'self' in browser context
if (typeof global.self === 'undefined') {
    global.self = global;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, 'temp');
const SESSIONS_DIR = path.join(__dirname, 'sessions');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR);
}

// Middleware
const isDev = process.env.NODE_ENV === 'development';
if (isDev) {
    app.use(cors({
        origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
        credentials: true,
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
}
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files (production build)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Session management helpers
function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getSessionPath(sessionId) {
    return path.join(SESSIONS_DIR, `${sessionId}.json`);
}

function createSession() {
    const sessionId = generateSessionId();
    const session = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
    };
    fs.writeFileSync(getSessionPath(sessionId), JSON.stringify(session, null, 2));
    return session;
}

function getSession(sessionId) {
    const sessionPath = getSessionPath(sessionId);
    if (!fs.existsSync(sessionPath)) return null;
    return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
}

function saveSession(session) {
    session.updatedAt = new Date().toISOString();
    fs.writeFileSync(getSessionPath(session.id), JSON.stringify(session, null, 2));
}

function listSessions() {
    if (!fs.existsSync(SESSIONS_DIR)) return [];
    const files = fs.readdirSync(SESSIONS_DIR);
    return files
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const data = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
            return { id: data.id, createdAt: data.createdAt, updatedAt: data.updatedAt, messageCount: data.messages.length };
        })
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

// System prompt for CAD generation — professional phrasing, Gemini-powered
const SYSTEM_PROMPT = `You are Gemini, a CAD code generation engine specialized in producing clean, parametric OpenSCAD models for mechanical parts.

Responsibilities:
1. Translate user requirements into precise parametric OpenSCAD code
2. Ask concise clarification questions only when necessary to complete the design
3. Produce manufacturable, watertight geometry with sensible defaults
4. Default units: millimeters

Strict OpenSCAD rules (must follow):
- When using rotate_extrude(), ensure polygon X coordinates are strictly positive to avoid invalid geometry.
- Avoid self-intersections and keep small overlaps (0.01–0.1 mm) for reliable boolean operations.

Best practices:
- Use appropriate $fn for smooth curves, and reasonable tolerances for fits.
- Structure code with modules and parameter blocks for easy edits.

Output format:
- Wrap OpenSCAD code with triple-backticks and the scad language tag (three backticks followed by the word "scad").
- Provide a brief one-line description and suggest a filename.

Example (conceptual):
Mounting bracket — 50 x 40 mm with M4 clearance holes

// Mounting bracket
$fn = 80;
...

Download as: mounting_bracket.scad
`;

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
            // Use the wrapper that sets up the 'self' polyfill
            const workerPath = path.join(__dirname, 'openscad-worker-wrapper.cjs');
            if (!fs.existsSync(workerPath)) return reject(new Error(`openscad-worker-wrapper not found at ${workerPath}`));

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

// Chat endpoint with session support
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env file'
            });
        }

        // Get or create session
        let session = sessionId ? getSession(sessionId) : null;
        if (!session) {
            session = createSession();
        }

        // Initialize model
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

        // Build full chat history from session messages as context
        const chatHistory = session.messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Start chat with full session history
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

        // Save messages to session
        session.messages.push({ role: 'user', content: message });
        session.messages.push({ role: 'assistant', content: responseText, scadCode, fileName });
        saveSession(session);

        res.json({
            sessionId: session.id,
            message: responseText,
            scadCode,
            fileName
        });

    } catch (error) {
        console.error('Chat API Error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({
            error: 'Failed to process request',
            details: error.message
        });
    }
});

// Session management endpoints
app.post('/api/session/create', (req, res) => {
    try {
        const session = createSession();
        res.json({ sessionId: session.id, createdAt: session.createdAt });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create session' });
    }
});

app.get('/api/session/:id', (req, res) => {
    try {
        const session = getSession(req.params.id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve session' });
    }
});

app.get('/api/sessions', (req, res) => {
    try {
        const sessions = listSessions();
        res.json({ sessions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list sessions' });
    }
});

app.delete('/api/session/:id', (req, res) => {
    try {
        const sessionPath = getSessionPath(req.params.id);
        if (fs.existsSync(sessionPath)) {
            fs.unlinkSync(sessionPath);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', geminiConfigured: !!process.env.GEMINI_API_KEY });
});

// Serve index.html for SPA routes (catch-all must come after API routes)
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: 'Frontend not built. Run: npm run build' });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 CAD Chatbot Server running on http://localhost:${PORT}`);
    console.log(`📡 Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`🤖 Model: gemini-3-flash-preview`);
    console.log(`📁 Sessions dir: ${SESSIONS_DIR}`);
    console.log(`✅ Ready to accept connections\n`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    }
    process.exit(1);
});
