/**
 * node.js - Node class definition for the automation network
 * 
 * Defines the Node class and pulse animations
 */

// Maximum number of pulses at once for performance
const MAX_PULSE_COUNT = 100;
const PULSE_SPEED = 0.023;

// Reusable pulse objects pool for better performance
const pulsePool = [];

/**
 * Create a reusable pulse object from the pool or create a new one
 * @param {Node} source - Source node
 * @param {Node} target - Target node
 * @param {number} speed - Pulse speed
 * @returns {Object} Pulse object
 */
function createPulse(source, target, speed) {
    // Reuse pulse from pool if available
    if (pulsePool.length > 0) {
        const pulse = pulsePool.pop();
        pulse.source = source;
        pulse.target = target;
        pulse.progress = 0;
        pulse.speed = speed;
        return pulse;
    }
    
    // Create new pulse if pool is empty
    return {
        source: source,
        target: target,
        progress: 0,
        speed: speed
    };
}

/**
 * Return a pulse to the pool for reuse
 * @param {Object} pulse - Pulse object
 */
function recyclePulse(pulse) {
    // Prevent pool from growing too large
    if (pulsePool.length < MAX_PULSE_COUNT) {
        pulsePool.push(pulse);
    }
}

/**
 * Node class representing an automation element
 */
class Node {
    /**
     * Create a node
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} radius - Node radius
     * @param {string} type - Node type: "source", "process", or "destination"
     */
    constructor(x, y, radius, type) {
        // Position and size
        this.x = x;
        this.y = y;
        this.radius = radius;
        
        // Node properties
        this.type = type;
        this.connections = [];
        this.pulses = [];
        this.processingPulses = 0;
        
        // Appearance
        this.color = this.getColorForType(type);
        
        // State
        this.active = Math.random() > 0.5;
        this.opacity = this.active ? 1 : 0.3;
        this.targetOpacity = this.opacity;
        
        // Animation timing
        this.activationTime = Math.random() * 5000;
        this.lastPulseTime = 0;
        this.pulseInterval = 1000 + Math.random() * 2000;
        
        // Interaction states
        this.isHovered = false;
        this.isDragged = false;
        
        // Physics properties (for force-directed layout)
        this.vx = 0;
        this.vy = 0;
    }
    
    /**
     * Get color based on node type
     * @param {string} type - Node type
     * @returns {string} Color
     */
    getColorForType(type) {
        switch(type) {
            case "source": return "#00ffcc";
            case "process": return "#00ccff";
            case "destination": return "#ff00cc";
            default: return "#ffffff";
        }
    }
    
    /**
     * Connect this node to another node
     * @param {Node} node - Node to connect to
     */
    connect(node) {
        if (!this.connections.includes(node)) {
            this.connections.push(node);
        }
    }
    
    /**
     * Update node state
     * @param {number} time - Current time
     * @param {number} deltaTime - Time since last update
     */
    update(time, deltaTime) {
        // Calculate cycle position for smooth state transitions
        const cycleDuration = 15000; // 15 seconds for a complete cycle
        const cyclePosition = (time % cycleDuration) / cycleDuration;
        
        // Each node has its own phase based on activationTime
        const nodePhase = this.activationTime / 5000;
        const nodePosition = (cyclePosition + nodePhase) % 1;
        
        // Determine if node should be active (70% of the time)
        const shouldBeActive = nodePosition < 0.7;
        
        // Set target opacity based on activity state and interaction
        this.targetOpacity = shouldBeActive ? 1 : 0.3;
        
        // Increase opacity when hovered or dragged
        if (this.isHovered || this.isDragged) {
            this.targetOpacity = 1;
        }
        
        // Smooth transition between states
        if (Math.abs(this.opacity - this.targetOpacity) > 0.01) {
            this.opacity += (this.targetOpacity - this.opacity) * 0.05;
        } else {
            this.opacity = this.targetOpacity;
        }
        
        // Update active state based on opacity
        this.active = this.opacity > 0.7;
        
        // Handle impulse generation for active source nodes
        if (this.active && this.type === "source" && 
            time - this.lastPulseTime > this.pulseInterval) {
            this.lastPulseTime = time;
            
            // Send impulse to random connection
            this.sendRandomImpulse();
        }
        if (this.type == "process" && this.processingPulses > 0 && Math.random() > 0.98) {
            this.sendRandomImpulse();
        }
        // Update existing impulses
        this.updatePulses(deltaTime);
    }
    
    /**
     * Send an impulse to a random connection
     */
    sendRandomImpulse() {
        if (this.connections.length > 0 && Math.random() > 0.3) {
            const randomIndex = Math.floor(Math.random() * this.connections.length);
            const randomConnection = this.connections[randomIndex];
            
            if (randomConnection.opacity > 0.5) {
                // Add pulse to active connection
                const pulse = createPulse(
                    this,
                    randomConnection,
                    0.002 + Math.random() * PULSE_SPEED
                );
                
                this.pulses.push(pulse);

                if (this.processingPulses>0) { 
                    this.processingPulses -= 1; 
                }
            }
        }
    }
    
    /**
     * Update all pulses for this node
     * @param {number} deltaTime - Time since last update
     */
    updatePulses(deltaTime) {
        // Update progress of existing pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const pulse = this.pulses[i];
            
            // Scale speed by deltaTime for consistent animation regardless of frame rate
            pulse.progress += pulse.speed * (deltaTime / 16.667);
            
            if (pulse.progress >= 1) {
                pulse.target.processingPulses += 1;
                pulse.target.active = true;
                pulse.target.opacity = pulse.target.active ? 1 : 0.3;
                pulse.target.targetOpacity = pulse.target.opacity;

                // When an impulse reaches its target
                if (pulse.target.active) {
                    // Process nodes forward received impulses to their connections
                    if (pulse.target.type === "process" && Math.random() > 0.7) {
                        pulse.target.sendRandomImpulse();
                    }
                }

                // Recycle the pulse object
                recyclePulse(pulse);
                
                // Remove from active pulses
                this.pulses.splice(i, 1);
            }
        }
    }
    
    /**
     * Draw the node and its connections
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        // Don't render nearly invisible nodes for performance
        if (this.opacity < 0.05) return;
        
        // Draw connections
        this.drawConnections(ctx);
        
        // Draw node
        this.drawNode(ctx);
        
        // Draw pulses
        this.drawPulses(ctx);
    }
    
    /**
     * Draw connections to other nodes
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    drawConnections(ctx) {
        ctx.globalAlpha = this.opacity * 0.3;
        
        this.connections.forEach(node => {
            if (node.opacity > 0.1 || this.opacity > 0.1) {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(node.x, node.y);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }
    
    /**
     * Draw the node itself
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    drawNode(ctx) {
        // Calculate effective radius with interaction effects
        const scaleFactor = this.isHovered || this.isDragged ? 1.2 : 1;
        const effectiveRadius = this.radius * scaleFactor;
        
        // Draw glow effect when interacting
        if (this.isHovered || this.isDragged) {
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, effectiveRadius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        // Draw node
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, effectiveRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // Draw node type indicator
        this.drawNodeTypeIndicator(ctx, effectiveRadius);
        
        // Reset global alpha
        ctx.globalAlpha = 1;
    }
    
    /**
     * Draw the indicator specific to node type
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} effectiveRadius - Current node radius with scaling
     */
    drawNodeTypeIndicator(ctx, effectiveRadius) {
        switch(this.type) {
            case "source":
                // Arrow icon for source
                ctx.beginPath();
                ctx.moveTo(this.x - effectiveRadius * 0.3, this.y - effectiveRadius * 0.3);
                ctx.lineTo(this.x + effectiveRadius * 0.5, this.y);
                ctx.lineTo(this.x - effectiveRadius * 0.3, this.y + effectiveRadius * 0.3);
                ctx.fillStyle = "#121212";
                ctx.fill();
                break;
                
            case "destination":
                // Ring design for destination
                ctx.beginPath();
                ctx.arc(this.x, this.y, effectiveRadius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = "#121212";
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(this.x, this.y, effectiveRadius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                break;
            case "process":
                // Smaller inner circle for process
                ctx.beginPath();
                ctx.arc(this.x, this.y, effectiveRadius * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = "#121212";
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(this.x, this.y, effectiveRadius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                break;
        }
    }
    
    /**
     * Draw pulses traveling between nodes
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    drawPulses(ctx) {
        this.pulses.forEach(pulse => {
            const targetX = pulse.target.x;
            const targetY = pulse.target.y;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            
            const pulseX = this.x + dx * pulse.progress;
            const pulseY = this.y + dy * pulse.progress;
            
            ctx.globalAlpha = this.opacity;
            ctx.beginPath();
            ctx.arc(pulseX, pulseY, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        });
    }
}

// Export Node class and pulse utilities
export { Node, createPulse, recyclePulse };
