// Polyfill for openscad-playground worker which expects 'self' in browser context
if (typeof global.self === 'undefined') {
    global.self = global;
}

// Now load and run the actual openscad worker
require('./node_modules/openscad-playground/dist/openscad-worker.cjs');
