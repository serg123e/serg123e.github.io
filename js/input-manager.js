/**
 * input-manager.js - Handles mouse and touch input events
 * 
 * Manages all user interactions with the canvas and nodes
 */

// Input state variables
let mouseX = 0;
let mouseY = 0;
let offsetX = 0;
let offsetY = 0;

/**
 * Set up all input handlers for the canvas
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Object} appState - Application state object
 */
function setupInputHandlers(canvas, appState) {
    // Mouse event listeners (with performance optimizations)
    canvas.addEventListener('mousedown', e => handleMouseDown(e, canvas, appState));
    canvas.addEventListener('mousemove', e => handleMouseMove(e, canvas, appState), { passive: true });
    canvas.addEventListener('mouseup', () => handleMouseUp(appState));
    // canvas.addEventListener('mouseleave', () => handleMouseUp(appState));
    
    // Touch event support (with passive where possible for performance)
    canvas.addEventListener('touchstart', e => handleTouchStart(e, canvas, appState), { passive: false });
    canvas.addEventListener('touchmove', e => handleTouchMove(e, canvas, appState), { passive: false });
    canvas.addEventListener('touchend', () => handleTouchEnd(appState), { passive: true });
    canvas.addEventListener('touchcancel', () => handleTouchEnd(appState), { passive: true });
}

/**
 * Handle mouse down events
 * @param {MouseEvent} e - Mouse event
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} appState - Application state
 */
function handleMouseDown(e, canvas, appState) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // Check if a node was clicked using spatial optimization
    checkNodeSelection(mouseX, mouseY, appState);
}

/**
 * Handle mouse move events
 * @param {MouseEvent} e - Mouse event
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} appState - Application state
 */
function handleMouseMove(e, canvas, appState) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // Reset hover state for all nodes
    appState.nodes.forEach(node => node.isHovered = false);
    
    // Check for hover state if not dragging
    if (!appState.isDragging) {
        let isOverNode = false;
        
        for (const node of appState.nodes) {
            const dx = mouseX - node.x;
            const dy = mouseY - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= node.radius * 1.5) {
                isOverNode = true;
                node.isHovered = true;
                canvas.style.cursor = 'grab';
                break;
            }
        }
        
        if (!isOverNode) {
            canvas.style.cursor = 'default';
        }
    }
    
    // Update position of dragged node
    if (appState.isDragging && appState.selectedNode) {
        const node = appState.selectedNode;
        
        node.x = mouseX - offsetX;
        node.y = mouseY - offsetY;
        
        // Keep node within canvas bounds
        node.x = Math.max(
            node.radius,
            Math.min(canvas.width - node.radius, node.x)
        );
        node.y = Math.max(
            node.radius,
            Math.min(canvas.height - node.radius, node.y)
        );
    }
}

/**
 * Handle mouse up events
 * @param {Object} appState - Application state
 */
function handleMouseUp(appState) {
    if (appState.selectedNode) {
        appState.selectedNode.isDragged = false;
    }
    appState.isDragging = false;
    appState.selectedNode = null;
    
    // Canvas cursor is reset in the mousemove handler
}

/**
 * Handle touch start events
 * @param {TouchEvent} e - Touch event
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} appState - Application state
 */
function handleTouchStart(e, canvas, appState) {
    // Prevent default to avoid scrolling
    e.preventDefault();
    
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        
        mouseX = touch.clientX - rect.left;
        mouseY = touch.clientY - rect.top;
        
        // Check if a node was touched
        checkNodeSelection(mouseX, mouseY, appState);
    }
}

/**
 * Handle touch move events
 * @param {TouchEvent} e - Touch event
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} appState - Application state
 */
function handleTouchMove(e, canvas, appState) {
    // Prevent default to avoid scrolling
    e.preventDefault();
    
    if (e.touches.length === 1 && appState.isDragging) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        
        mouseX = touch.clientX - rect.left;
        mouseY = touch.clientY - rect.top;
        
        // Move the selected node
        if (appState.selectedNode) {
            const node = appState.selectedNode;
            
            node.x = mouseX - offsetX;
            node.y = mouseY - offsetY;
            
            // Keep node within canvas bounds
            node.x = Math.max(
                node.radius,
                Math.min(canvas.width - node.radius, node.x)
            );
            node.y = Math.max(
                node.radius,
                Math.min(canvas.height - node.radius, node.y)
            );
        }
    }
}

/**
 * Handle touch end events
 * @param {Object} appState - Application state
 */
function handleTouchEnd(appState) {
    if (appState.selectedNode) {
        appState.selectedNode.isDragged = false;
    }
    appState.isDragging = false;
    appState.selectedNode = null;
}

/**
 * Check if a node is selected at the current mouse/touch position
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} appState - Application state
 */
function checkNodeSelection(x, y, appState) {
    for (const node of appState.nodes) {
        const dx = x - node.x;
        const dy = y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= node.radius * 1.5) {
            appState.isDragging = true;
            appState.selectedNode = node;
            node.isDragged = true;
            offsetX = dx;
            offsetY = dy;
            document.body.style.cursor = 'grabbing';
            break;
        }
    }
}

// Export functions
export { setupInputHandlers };