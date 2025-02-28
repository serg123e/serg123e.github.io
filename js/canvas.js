/**
 * canvas.js - Handles canvas setup and main rendering loop
 * 
 * Manages the canvas element, its context, and the animation loop
 */

let canvas;
let ctx;

/**
 * Initialize canvas and get context
 * Sets up canvas dimensions based on device pixel ratio for crisp rendering
 * @returns {HTMLCanvasElement} The initialized canvas
 */
function initCanvas() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d', { alpha: false });
    
    // Set canvas size accounting for device pixel ratio
    const dpr = 1; // window.devicePixelRatio || 1;
    resizeCanvas(dpr);
    
    return canvas;
}

/**
 * Resize canvas to match window dimensions
 * @param {number} dpr - Device pixel ratio
 */
function resizeCanvas(dpr = 1) {
    // Set display size (css pixels)
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    
    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);
}

/**
 * Starts the animation loop with frame rate control
 * @param {Object} appState - Application state object
 * @param {Function} renderCallback - Function to call for rendering
 */
function startAnimation(appState, renderCallback) {
    // Animation loop with time-based animation
    function animate(timestamp) {
        // Calculate delta time for smooth animations
        const deltaTime = timestamp - (appState.lastFrameTime || timestamp);
        appState.lastFrameTime = timestamp;
        
        // Only render if enough time has passed since last frame
        if (deltaTime >= appState.frameInterval) {
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Call the render callback
            renderCallback(ctx, timestamp, deltaTime);
        }
        
        // Schedule next frame
        requestAnimationFrame(animate);
    }
    
    // Start the animation loop
    requestAnimationFrame(animate);
}

/**
 * Render a faint grid pattern on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 */
function renderGrid(ctx) {
    // Draw faint grid
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    
    const gridSize = 30;
    const width = canvas.width;
    const height = canvas.height;
    
    // Optimize grid rendering by calculating visible grid lines only
    const startX = Math.floor(0 / gridSize) * gridSize;
    const endX = width;
    const startY = Math.floor(0 / gridSize) * gridSize;
    const endY = height;
    
    // Draw vertical lines
    for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Reset global alpha
    ctx.globalAlpha = 1;
}

// Export functions
export { initCanvas, resizeCanvas, startAnimation, renderGrid };