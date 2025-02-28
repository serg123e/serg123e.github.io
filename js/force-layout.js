/**
 * Improved force-layout.js - Force-directed layout algorithm with mobile fixes
 */

/**
 * Apply force-directed layout to calculate node velocities without immediate position updates
 * @param {Array} nodes - Array of Node objects
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} contentRect - The dimensions of content div to avoid
 * @param {number} strength - Strength of the force application (0-1)
 * @returns {Array} Updated nodes with calculated velocities
 */
function applyForceLayout(nodes, width, height, contentRect, strength = 1) {
    if (strength <= 0) return;

    // Parameters for the simulation - adjusted for better mobile display
    const config = {
        iterations: strength > 0.5 ? 2 : 1,    // More iterations for initial layout
        repulsionForce: 5000 * strength,       // Reduced from 5000 for less aggressive spreading
        attractionForce: 0.004 * strength,     // Increased from 0.004 for stronger connections
        contentRepulsionForce: 3.0 * strength, // Force pushing nodes away from content div
        contentPadding: 20,                    // Extra padding around content div
        maxDisplacement: 15 * strength,        // Reduced from 15 for more controlled movement
        coolingFactor: 0.9,                    // Reduces movement over time
        minDistance: Math.min(width, height) * 0.15, // Scale with screen size instead of fixed 300
        edgePadding: Math.min(width, height) * 0.01,  // Scale with screen size instead of fixed 100
        edgeForce: 1 * strength                // Reduced from 20 for more gentle boundary forces
    };
    
    // Get center of canvas
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Preserve existing velocities for smoother transitions
    const originalVelocities = new Map();
    nodes.forEach(node => {
        // Store original velocities
        originalVelocities.set(node, { vx: node.vx, vy: node.vy });
        
        // Set to zero for force calculation
        node.vx = 0;
        node.vy = 0;
    });
    
    // Get the content div dimensions
    if (!contentRect) {
        // Default content rectangle if not provided - adaptive to screen size
        const contentWidth = Math.min(600, width * 0.8);
        const contentHeight = Math.min(400, height * 0.6);
        
        contentRect = {
            left: width / 2 - contentWidth / 2,
            right: width / 2 + contentWidth / 2,
            top: height / 2 - contentHeight / 2,
            bottom: height / 2 + contentHeight / 2,
            width: contentWidth,
            height: contentHeight
        };
    }
    
    // Run simulation for a set number of iterations
    for (let iteration = 0; iteration < config.iterations; iteration++) {
        applyForces(nodes, centerX, centerY, width, height, contentRect, config);
        
        // Instead of updating positions, just limit velocity and apply cooling
        limitVelocities(nodes, config);
    }
    
    // Blend new velocities with existing ones for smoother transitions
    nodes.forEach(node => {
        const original = originalVelocities.get(node);
        if (original) {
            // Linear interpolation between old and new velocities
            const blendFactor = 0.7;
            node.vx = node.vx * blendFactor + original.vx * (1 - blendFactor);
            node.vy = node.vy * blendFactor + original.vy * (1 - blendFactor);
        }
        
        // Add extra boundary enforcement
        enforceBoundaries(node, width, height);
    });
    
    return nodes;
}

/**
 * Add extra boundary enforcement to keep nodes within the visible canvas
 * @param {Object} node - Node to check
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height 
 */
function enforceBoundaries(node, width, height) {
    const margin = node.radius * 2;
    
    // Check if node is outside or very close to the boundary
    if (node.x < margin) {
        node.x = margin;
        node.vx = Math.abs(node.vx) * 0.5; // Bounce with reduced velocity
    }
    if (node.x > width - margin) {
        node.x = width - margin;
        node.vx = -Math.abs(node.vx) * 0.5;
    }
    if (node.y < margin) {
        node.y = margin;
        node.vy = Math.abs(node.vy) * 0.5;
    }
    if (node.y > height - margin) {
        node.y = height - margin;
        node.vy = -Math.abs(node.vy) * 0.5;
    }
}

/**
 * Limit node velocities based on maximum displacement
 * @param {Array} nodes - Array of nodes
 * @param {Object} config - Simulation parameters
 */
function limitVelocities(nodes, config) {
    nodes.forEach(node => {
        // Limit maximum displacement
        const displacement = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        
        if (displacement > config.maxDisplacement) {
            const scale = config.maxDisplacement / displacement;
            node.vx *= scale;
            node.vy *= scale;
        }
        
        // Apply cooling factor to slow down movement over time
        node.vx *= config.coolingFactor;
        node.vy *= config.coolingFactor;
    });
}

/**
 * Apply all forces to nodes in the simulation
 * @param {Array} nodes - Array of nodes
 * @param {number} centerX - X coordinate of canvas center
 * @param {number} centerY - Y coordinate of canvas center
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} contentRect - The dimensions of content div
 * @param {Object} config - Simulation parameters
 */
function applyForces(nodes, centerX, centerY, width, height, contentRect, config) {
    // Calculate all forces
    for (let a = 0; a < nodes.length; a++) {
        const nodeA = nodes[a];
        
        // Skip dragged nodes
        if (nodeA.isDragged) continue;
        
        // Apply content rectangle repulsion - push nodes away from content div
        applyContentRepulsion(nodeA, contentRect, config);
        
        // Apply edge forces to keep nodes within canvas - strengthened for mobile
        applyEdgeForces(nodeA, width, height, config);
        
        // Apply repulsion forces between all node pairs
        applyNodeRepulsion(nodeA, nodes, a, config);
    }
    
    // Apply attraction forces for connected nodes
    applyConnectionAttractions(nodes, config);
}

/**
 * Apply content area repulsion force to a node
 * @param {Object} node - Node to apply force to
 * @param {Object} contentRect - The dimensions of content div
 * @param {Object} config - Simulation parameters
 */
function applyContentRepulsion(node, contentRect, config) {
    // Extended rectangle with padding
    const extendedRect = {
        left: contentRect.left - config.contentPadding,
        right: contentRect.right + config.contentPadding,
        top: contentRect.top - config.contentPadding,
        bottom: contentRect.bottom + config.contentPadding
    };
    
    // Check if node is inside or near the extended content rectangle
    const isInXRange = node.x >= extendedRect.left && node.x <= extendedRect.right;
    const isInYRange = node.y >= extendedRect.top && node.y <= extendedRect.bottom;
    
    // If node is inside or very close to content area
    if (isInXRange && isInYRange) {
        // Calculate distances to all edges
        const distToLeft = node.x - extendedRect.left;
        const distToRight = extendedRect.right - node.x;
        const distToTop = node.y - extendedRect.top;
        const distToBottom = extendedRect.bottom - node.y;
        
        // Find closest edge
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        
        // Apply force in direction of closest edge - strengthen for mobile
        const force = config.contentRepulsionForce * 3; // Increased from 2
        
        if (minDist === distToLeft) {
            // Push left
            node.vx -= force;
        } else if (minDist === distToRight) {
            // Push right
            node.vx += force;
        } else if (minDist === distToTop) {
            // Push up
            node.vy -= force;
        } else if (minDist === distToBottom) {
            // Push down
            node.vy += force;
        }
    } else {
        // For nodes near but not inside the rectangle, apply gradient force
        // Calculate closest point on rectangle to node
        const closestX = Math.max(extendedRect.left, Math.min(node.x, extendedRect.right));
        const closestY = Math.max(extendedRect.top, Math.min(node.y, extendedRect.bottom));
        
        // Vector from closest point to node
        const dx = node.x - closestX;
        const dy = node.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only apply force if node is close to rectangle
        const repulsionRadius = Math.min(100, Math.max(50, (contentRect.width + contentRect.height)/8));
        
        if (distance < repulsionRadius && distance > 0) {
            // Force decreases with distance
            const force = config.contentRepulsionForce * (1 - distance / repulsionRadius);
            
            // Push away from closest point
            node.vx += (dx / distance) * force;
            node.vy += (dy / distance) * force;
        }
    }
}

/**
 * Apply edge forces to keep a node within canvas - improved for mobile
 * @param {Object} node - Node to apply force to
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} config - Simulation parameters
 */
function applyEdgeForces(node, width, height, config) {
    // Calculate stronger forces for mobile screens
    const scaledEdgeForce = config.edgeForce * (1 + (1000 / Math.min(width, height)));
    
    // Left edge - progressive force (stronger when closer to edge)
    if (node.x < config.edgePadding) {
        const factor = Math.pow(1 - node.x / config.edgePadding, 2); // Exponential
        node.vx += scaledEdgeForce * factor;
    }
    
    // Right edge
    if (node.x > width - config.edgePadding) {
        const factor = Math.pow(1 - (width - node.x) / config.edgePadding, 2);
        node.vx -= scaledEdgeForce * factor;
    }
    
    // Top edge
    if (node.y < config.edgePadding) {
        const factor = Math.pow(1 - node.y / config.edgePadding, 2);
        node.vy += scaledEdgeForce * factor;
    }
    
    // Bottom edge
    if (node.y > height - config.edgePadding) {
        const factor = Math.pow(1 - (height - node.y) / config.edgePadding, 2);
        node.vy -= scaledEdgeForce * factor;
    }
}

/**
 * Apply repulsion between nodes
 * @param {Object} nodeA - Node to apply forces to
 * @param {Array} nodes - All nodes in the network
 * @param {number} startIndex - Index to start from (to avoid double calculation)
 * @param {Object} config - Simulation parameters
 */
function applyNodeRepulsion(nodeA, nodes, startIndex, config) {
    for (let b = startIndex + 1; b < nodes.length; b++) {
        const nodeB = nodes[b];
        
        // Skip dragged nodes
        if (nodeB.isDragged) continue;
        
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1; // Avoid division by zero
        
        // Stronger repulsion for closer nodes
        if (distance < config.minDistance * 2) { // Reduced from 3 for tighter layout on mobile
            const force = config.repulsionForce / (distance * distance);
            const forceX = (dx / distance) * force;
            const forceY = (dy / distance) * force;
            
            nodeA.vx -= forceX;
            nodeA.vy -= forceY;
            nodeB.vx += forceX;
            nodeB.vy += forceY;
        }
    }
}

/**
 * Apply attraction forces between connected nodes
 * @param {Array} nodes - All nodes in the network
 * @param {Object} config - Simulation parameters
 */
function applyConnectionAttractions(nodes, config) {
    nodes.forEach(node => {
        // Skip dragged nodes
        if (node.isDragged) return;
        
        node.connections.forEach(connected => {
            // Skip if connected node is being dragged
            if (connected.isDragged) return;
            
            const dx = connected.x - node.x;
            const dy = connected.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Stronger attraction for nodes that are further apart
            const force = distance * config.attractionForce;
            const forceX = (dx / distance) * force;
            const forceY = (dy / distance) * force;
            
            node.vx += forceX;
            node.vy += forceY;
            connected.vx -= forceX;
            connected.vy -= forceY;
        });
    });
}

/**
 * Update node positions based on velocities - improved for mobile
 * @param {Array} nodes - All nodes in the network
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} animationSpeed - Speed of animation (0-1)
 */
function updatePositions(nodes, width, height, animationSpeed = 0.03) {
    nodes.forEach(node => {
        // Skip updating dragged nodes - they follow the mouse directly
        if (node.isDragged) return;
        
        // Apply velocity to position with animation speed factor
        node.x += node.vx * animationSpeed;
        node.y += node.vy * animationSpeed;
        
        // More aggressive boundary enforcement
        const padding = node.radius * 2;
        
        // Check if somehow node escaped the canvas (can happen with high velocities)
        if (node.x < padding || node.x > width - padding ||
            node.y < padding || node.y > height - padding) {
            
            // Enforce boundaries and reverse velocity component
            if (node.x < padding) {
                node.x = padding;
                node.vx = Math.abs(node.vx) * 0.5; // Bounce back with reduced speed
            }
            if (node.x > width - padding) {
                node.x = width - padding;
                node.vx = -Math.abs(node.vx) * 0.5;
            }
            if (node.y < padding) {
                node.y = padding;
                node.vy = Math.abs(node.vy) * 0.5;
            }
            if (node.y > height - padding) {
                node.y = height - padding;
                node.vy = -Math.abs(node.vy) * 0.5;
            }
        }
    });
}

export { applyForceLayout, updatePositions };