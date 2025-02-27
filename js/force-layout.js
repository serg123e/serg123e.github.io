/**
 * force-layout.js - Force-directed layout algorithm
 * 
 * Implements a physics-based layout algorithm to position nodes optimally
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
    // Parameters for the simulation
    const config = {
        iterations: strength > 0.5 ? 1 : 1, // Fewer iterations for gentle updates
        repulsionForce: 5000 * strength,      // Force pushing nodes apart
        attractionForce: 0.004 * strength,    // Force pulling connected nodes together
        contentRepulsionForce: 3.0 * strength,// Force pushing nodes away from content div
        contentPadding: 20,                   // Extra padding around content div
        maxDisplacement: 15 * strength,       // Max movement per step
        coolingFactor: 0.9,                   // Reduces movement over time
        minDistance: 300,                     // Minimum target distance between nodes
        edgePadding: 100,                     // Padding from canvas edges
        edgeForce: 20 * strength            // Force keeping nodes away from edges
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
        // Default content rectangle if not provided
        contentRect = {
            left: width / 2 - 300,
            right: width / 2 + 300,
            top: height / 2 - 200,
            bottom: height / 2 + 200
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
            // Higher blendFactor means more influence from new calculation
            const blendFactor = 0.7;
            node.vx = node.vx * blendFactor + original.vx * (1 - blendFactor);
            node.vy = node.vy * blendFactor + original.vy * (1 - blendFactor);
        }
    });
    
    return nodes; // Return nodes with updated velocities for animation
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
        
        // Apply edge forces to keep nodes within canvas
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
        
        // Apply force in direction of closest edge
        const force = config.contentRepulsionForce * 2;
        
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
        const repulsionRadius = 100; // How far the repulsion extends
        
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
 * Apply edge forces to keep a node within canvas
 * @param {Object} node - Node to apply force to
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} config - Simulation parameters
 */
function applyEdgeForces(node, width, height, config) {
    // Left edge
    if (node.x < config.edgePadding) {
        node.vx += config.edgeForce * (1 - node.x / config.edgePadding);
    }
    
    // Right edge
    if (node.x > width - config.edgePadding) {
        node.vx -= config.edgeForce * 
            (1 - (width - node.x) / config.edgePadding);
    }
    
    // Top edge
    if (node.y < config.edgePadding) {
        node.vy += config.edgeForce * (1 - node.y / config.edgePadding);
    }
    
    // Bottom edge
    if (node.y > height - config.edgePadding) {
        node.vy -= config.edgeForce * 
            (1 - (height - node.y) / config.edgePadding);
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
        if (distance < config.minDistance * 3) {
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
 * Update node positions based on velocities
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
        
        // Keep nodes within canvas boundaries with some padding
        const padding = node.radius * 2;
        node.x = Math.max(padding, Math.min(width - padding, node.x));
        node.y = Math.max(padding, Math.min(height - padding, node.y));
    });
}

// Export functions
export { applyForceLayout, updatePositions };