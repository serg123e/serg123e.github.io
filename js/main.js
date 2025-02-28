/**
 * main.js - Entry point for the 123automate.it interactive canvas
 * 
 * Initializes the application and orchestrates the components
 */

import { initCanvas, startAnimation, renderGrid } from './canvas.js';
import { setupInputHandlers } from './input-manager.js';
import { createNetwork } from './network.js';
import { applyForceLayout, updatePositions } from './force-layout.js';

// Application state
const appState = {
    nodes: [],
    isDragging: false,
    selectedNode: null,
    lastFrameTime: 0,
    frameRate: 60,
    frameInterval: 1000 / 60, // ms per frame
    lastForceLayoutTime: 0,
    forceLayoutInterval: 5000, // Reapply force layout every 5 seconds
    contentRect: null, // Will store the dimensions of the content div
    animationSpeed: 0.05 // Controls how quickly nodes move to their target positions
};

// Get the dimensions of content div
function updateContentRect() {
    const contentDiv = document.querySelector('.content');
    if (contentDiv) {
        const rect = contentDiv.getBoundingClientRect();
        appState.contentRect = {
            left: rect.left,
            right: rect.left + rect.width,
            top: rect.top,
            bottom: rect.top + rect.height,
            width: rect.width,
            height: rect.height
        };
    }
}

// Initialize the application
function initApp() {
    // Setup canvas with the correct dimensions
    const canvas = initCanvas();
    
    // Update content rectangle dimensions
    updateContentRect();
    
    // Create network of nodes
    appState.nodes = createNetwork(canvas.width, canvas.height);
    
    // Setup input handlers
    setupInputHandlers(canvas, appState);
    
    // Initial layout with full strength
    applyForceLayout(appState.nodes, canvas.width, canvas.height, appState.contentRect, 1.5);
    
    // Start animation loop
    startAnimation(appState, renderNodes);
    
    // Listen for window resize to update content rect
    window.addEventListener('resize', () => {
        // Resize canvas
        initCanvas();
        
        // Update content rectangle
        updateContentRect();
        
        // Reapply force layout with adjusted dimensions
        if (canvas) {
            applyForceLayout(
                appState.nodes, 
                canvas.width, 
                canvas.height, 
                appState.contentRect,
                1.5 // Medium strength for resize adjustment
            );
        }
    });
}

// Main render function for nodes
function renderNodes(ctx, time, deltaTime) {
    // Clear canvas and draw grid
    renderGrid(ctx);
    
    // Check if it's time to reapply force layout
    if (time - appState.lastForceLayoutTime > appState.forceLayoutInterval) {
        appState.lastForceLayoutTime = time;
        
        // Make sure we have the latest content dimensions
        updateContentRect();
        
        // Apply gentle force layout to calculate new velocities
        if (canvas) {
            applyForceLayout(
                appState.nodes, 
                canvas.width, 
                canvas.height, 
                appState.contentRect,
                0.5 // Reduced strength for gentle untangling
            );
        }
    }
    
    // Always update positions based on current velocities
    // This creates continuous force-directed animation
    if (canvas) {
        // Scale animation speed by deltaTime for consistent speed regardless of frame rate
        const frameAdjustedSpeed = appState.animationSpeed * (deltaTime / 16.667);
        updatePositions(appState.nodes, canvas.width, canvas.height, frameAdjustedSpeed);
        
        // Apply a small dampening factor to velocities each frame
        // This helps stabilize the layout when no new forces are applied
        appState.nodes.forEach(node => {
            // Only apply dampening if node is not being dragged
            if (!node.isDragged) {
                node.vx *= 0.999;
                node.vy *= 0.999;
            }
        });
    }
    
    // Update and draw nodes
    appState.nodes.forEach(node => {
        node.update(time, deltaTime);
        node.draw(ctx);
    });
    
    // Optional: Visualize the content rectangle for debugging
    // drawContentRect(ctx);
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

// Function to visualize content rectangle (for debugging)
function drawContentRect(ctx) {
    if (appState.contentRect) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(
            appState.contentRect.left,
            appState.contentRect.top,
            appState.contentRect.width,
            appState.contentRect.height
        );
        
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            appState.contentRect.left,
            appState.contentRect.top,
            appState.contentRect.width,
            appState.contentRect.height
        );
        ctx.globalAlpha = 1.0;
    }
}

// Export app state for other modules to use
export { appState };