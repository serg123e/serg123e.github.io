/**
 * network.js - Creates and manages the network of nodes
 * 
 * Handles node creation, connection, and network optimization
 */

import { Node } from './node.js';
import { applyForceLayout } from './force-layout.js';

/**
 * Create a network of nodes with connections
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height 
 * @returns {Array} Array of Node objects
 */
function createNetwork(width, height) {
    const nodes = [];
    const numNodes = calculateOptimalNodeCount(width, height);
    
    // Create nodes with full canvas distribution
    createNodes(nodes, numNodes, width, height);
    
    // Create connections between nodes
    initializeConnections(nodes);
    
    // Remove nodes without proper connections
    optimizeNetwork(nodes);
    
    // Initial force-directed layout is now handled in main.js
    // to have access to the content rectangle
    
    return nodes;
}

/**
 * Calculate optimal number of nodes based on canvas size
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {number} Optimal node count
 */
function calculateOptimalNodeCount(width, height) {
    // Base number of nodes on canvas area
    const area = width * height;
    const baseCount = 300;
    
    // Scale node count based on screen size
    // More nodes for larger screens, fewer for smaller screens
    return Math.max(15, Math.min(50, Math.floor(baseCount * Math.sqrt(area) / 1500)));
}

/**
 * Create nodes with proper distribution
 * @param {Array} nodes - Array to populate with nodes
 * @param {number} numNodes - Number of nodes to create
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
function createNodes(nodes, numNodes, width, height) {
    for (let i = 0; i < numNodes; i++) {
        // Distribute nodes with some spacing
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = 5 + Math.random() * 8;
        
        // Assign node types with proper distribution
        let type;
        if (i < numNodes * 0.2) {
            type = "source";
        } else if (i < numNodes * 0.8) {
            type = "process";
        } else {
            type = "destination";
        }
        
        nodes.push(new Node(x, y, radius, type));
    }
}

/**
 * Initialize connections between nodes
 * @param {Array} nodes - Array of nodes
 */
function initializeConnections(nodes) {
    // Get nodes by type for easier access
    const sources = nodes.filter(node => node.type === "source");
    const processes = nodes.filter(node => node.type === "process");
    const destinations = nodes.filter(node => node.type === "destination");
    
    // Connect source nodes to process nodes
    sources.forEach(source => {
        const numConnections = 1 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numConnections && i < processes.length; i++) {
            // Pick random process node without repetition
            const randomIndex = Math.floor(Math.random() * processes.length);
            const randomProcess = processes[randomIndex];
            source.connect(randomProcess);
        }
    });
    
    // Connect process nodes to other processes and destinations
    processes.forEach(process => {
        // Connect to other processes (0-1 connections)
        const otherProcesses = processes.filter(p => p !== process);
        const numProcessConnections = Math.floor(Math.random() * 2);
        
        for (let i = 0; i < numProcessConnections && i < otherProcesses.length; i++) {
            const randomIndex = Math.floor(Math.random() * otherProcesses.length);
            const randomProcess = otherProcesses[randomIndex];
            process.connect(randomProcess);
        }
        
        // Connect to destinations (1-2 connections)
        const numDestConnections = 1 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < numDestConnections && i < destinations.length; i++) {
            const randomIndex = Math.floor(Math.random() * destinations.length);
            const randomDest = destinations[randomIndex];
            process.connect(randomDest);
        }
    });
}

/**
 * Optimize network by removing unconnected nodes
 * @param {Array} nodes - Array of nodes
 */
function optimizeNetwork(nodes) {
    let hasRemovedNodes = false;
    let iterations = 0;
    const MAX_ITERATIONS = 5;
    
    // Iteratively remove nodes without incoming connections
    while (iterations < MAX_ITERATIONS) {
        hasRemovedNodes = removeUnconnectedNodes(nodes);
        
        if (!hasRemovedNodes) {
            break;
        }
        
        iterations++;
    }
}

/**
 * Remove nodes without incoming connections
 * @param {Array} nodes - Array of nodes
 * @returns {boolean} True if any nodes were removed
 */
function removeUnconnectedNodes(nodes) {
    let hasRemovedNodes = false;
    
    // Map of nodes with incoming connections
    const hasIncoming = new Map();
    
    // Check each node's connections
    nodes.forEach(node => {
        node.connections.forEach(connectedNode => {
            hasIncoming.set(connectedNode, true);
        });
    });
    
    // Remove nodes without incoming connections (except sources)
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        
        // Skip source nodes, as they don't need incoming connections
        if (node.type !== "source" && !hasIncoming.has(node)) {
            // Remove this node from all other nodes' connections
            nodes.forEach(otherNode => {
                otherNode.connections = otherNode.connections.filter(
                    conn => conn !== node
                );
            });
            
            // Remove the node
            nodes.splice(i, 1);
            hasRemovedNodes = true;
        }
    }
    
    return hasRemovedNodes;
}

// Export functions
export { createNetwork };