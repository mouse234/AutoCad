// Complete polyfill for openscad-playground worker which expects Web Worker API
const { parentPort } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// Create a Response mock class that works with WebAssembly.instantiateStreaming
class ResponseMock {
    constructor(body) {
        this.body = body;
        this.ok = true;
        this.status = 200;
        this.headers = new Map();
    }
    
    async arrayBuffer() {
        if (Buffer.isBuffer(this.body)) {
            return this.body.buffer.slice(this.body.byteOffset, this.body.byteOffset + this.body.byteLength);
        }
        return this.body;
    }
    
    async text() {
        if (Buffer.isBuffer(this.body)) {
            return this.body.toString();
        }
        return String(this.body);
    }
    
    async blob() {
        if (typeof Blob !== 'undefined') {
            return new Blob([this.body]);
        }
        return this.body;
    }
    
    clone() {
        return new ResponseMock(this.body);
    }
}

// Create a Web Worker-like interface for the openscad WASM worker
const eventListeners = {};

// CRITICAL: Set up polyfills FIRST before requiring the worker

// Mock URL API - replace Node's built-in URL
global.URL = class URL {
    constructor(url, base) {
        // Handle URL construction used by openscad-playground
        if (typeof url !== 'string') {
            throw new TypeError('Invalid URL');
        }
        // For our purposes, just store the URL string
        this.href = String(url);
        this.pathname = String(url);
        this.search = '';
        this.hash = '';
        this.hostname = '';
        this.port = '';
        this.protocol = '';
    }
    
    toString() {
        return this.href;
    }
};

// Mock fetch for loading browser assets and WASM
global.fetch = async function(url) {
    try {
        // Handle various URL formats
        let resourceName = String(url).replace(/\/$/, '').split('/').pop();
        
        // IMPORTANT: First check in the openscad-playground dist directory
        const distPaths = [
            path.join(__dirname, '..', 'node_modules', 'openscad-playground', 'dist', resourceName),
            path.join(__dirname, '..', 'node_modules', 'openscad-playground', 'dist', 'wasm', resourceName),
            path.join(__dirname, '..', 'node_modules', 'browserfs', 'dist', resourceName),
        ];
        
        let data = null;
        for (const filePath of distPaths) {
            if (fs.existsSync(filePath)) {
                // console.log(`[openscad-worker] Loading ${resourceName} from ${filePath}`);
                data = fs.readFileSync(filePath);
                break;
            }
        }
        
        if (!data) {
            // Log what we're looking for if not found
            // console.log(`[openscad-worker] Could not find ${resourceName}, returning empty response`);
            
            // For WASM files, return empty mock rather than error
            if (resourceName.endsWith('.wasm')) {
                data = Buffer.from([]);
            } else {
                // For other resources, return empty response
                data = Buffer.from('');
            }
        }
        
        return new ResponseMock(data);
    } catch (err) {
        console.error(`[openscad-worker] Fetch error for ${url}:`, err.message);
        // Return empty mock response on error
        return new ResponseMock(Buffer.from(''));
    }
};

// Super important: Mock WebAssembly.instantiateStreaming to use our fetch
const OriginalInstantiateStreaming = WebAssembly.instantiateStreaming;
WebAssembly.instantiateStreaming = async function(responsePromise, imports) {
    try {
        // Resolve the promise
        const response = await Promise.resolve(responsePromise);
        
        // Get the array buffer
        const buffer = await response.arrayBuffer();
        
        // Use regular instantiate instead of streaming
        return WebAssembly.instantiate(buffer, imports);
    } catch (err) {
        console.error('[openscad-worker] instantiateStreaming error:', err.message);
        throw err;
    }
};

global.self = {
    // Mock Web Worker APIs
    addEventListener: function(event, handler) {
        if (!eventListeners[event]) {
            eventListeners[event] = [];
        }
        eventListeners[event].push(handler);
    },
    
    removeEventListener: function(event, handler) {
        if (eventListeners[event]) {
            eventListeners[event] = eventListeners[event].filter(h => h !== handler);
        }
    },
    
    postMessage: function(message) {
        if (parentPort) {
            parentPort.postMessage(message);
        }
    },
    
    // Expose other global properties needed by the worker
    ...global
};

// Forward messages from parentPort to the worker's message handlers
if (parentPort) {
    parentPort.on('message', (message) => {
        // Call any registered message event listeners
        if (eventListeners['message']) {
            eventListeners['message'].forEach(handler => {
                handler({ data: message });
            });
        }
    });
}

// NOW load and run the actual openscad worker (after all polyfills are set)
require('../node_modules/openscad-playground/dist/openscad-worker.cjs');
