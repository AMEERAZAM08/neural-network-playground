// Complete drag and drop fix for neural network playground
// This handles both initial node creation and moving existing nodes

(function() {
    console.log('Loading complete drag and drop fix...');
    
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit to ensure other scripts have loaded
        setTimeout(initializeCompleteDragFix, 1000);
    });
    
    function initializeCompleteDragFix() {
        console.log('Initializing complete drag and drop fix');
        
        // Get necessary elements
        const canvas = document.getElementById('network-canvas');
        const nodeItems = document.querySelectorAll('.node-item');
        
        if (!canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        // Track state for moving existing nodes
        let activeNode = null;
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;
        
        // Track node counts for naming
        const nodeCounter = {};
        
        // Anti-duplication system for new nodes
        const recentlyCreated = {
            nodeIds: new Set(),
            timestamp: 0
        };
        
        // Network model structure (reused from original code)
        let networkLayers = {
            layers: [],
            connections: []
        };
        
        // Helper function for formatting numbers
        function formatNumber(num) {
            if (num === 0) return '0';
            if (!num) return 'N/A';
            
            if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
            if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
            if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
            return num.toString();
        }
        
        // Add debug button for Conv2D parameters
        addConv2DFixButton();
        
        // 1. DRAGGING NEW NODES FROM PANEL TO CANVAS
        
        // Setup draggable items
        nodeItems.forEach(item => {
            // Override existing dragstart handler for reliability
            item.addEventListener('dragstart', function(e) {
                const nodeType = this.getAttribute('data-type');
                console.log(`Starting drag for new ${nodeType} node`);
                
                // Ensure data is properly set for transfer
                e.dataTransfer.setData('text/plain', nodeType);
                e.dataTransfer.effectAllowed = 'copy';
                
                // Create ghost image
                const ghost = this.cloneNode(true);
                ghost.style.opacity = '0.5';
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 0, 0);
                
                // Remove ghost image after dragstart completes
                setTimeout(() => {
                    document.body.removeChild(ghost);
                }, 0);
            });
        });
        
        // Add canvas event handlers for dropping new nodes
        function handleDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        }
        
        // Remove old handlers first to prevent duplicates
        canvas.removeEventListener('dragover', handleDragOver);
        canvas.addEventListener('dragover', handleDragOver);
        
        // Create drop handler for new nodes
        function handleDrop(e) {
            e.preventDefault();
            console.log('Drop event triggered');
            
            // Debounce: prevent multiple drops in quick succession
            const now = Date.now();
            if (now - recentlyCreated.timestamp < 500) {
                console.log('Debouncing drop event');
                return;
            }
            recentlyCreated.timestamp = now;
            
            // Get node type from dataTransfer
            const nodeType = e.dataTransfer.getData('text/plain');
            if (!nodeType) {
                console.error('No node type found in drop data');
                return;
            }
            
            console.log(`Creating new ${nodeType} node`);
            
            // Calculate position for new node
            const canvasRect = canvas.getBoundingClientRect();
            const x = e.clientX - canvasRect.left - 75;
            const y = e.clientY - canvasRect.top - 30;
            
            // Ensure position is within canvas
            const posX = Math.max(0, Math.min(canvasRect.width - 150, x));
            const posY = Math.max(0, Math.min(canvasRect.height - 100, y));
            
            // Generate unique ID
            const layerId = `${nodeType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            // Create the new node
            createNode(nodeType, layerId, posX, posY);
        }
        
        // Remove old handler first to prevent duplicates
        canvas.removeEventListener('drop', handleDrop);
        canvas.addEventListener('drop', handleDrop);
        
        // Function to create a new node
        function createNode(nodeType, layerId, posX, posY) {
            // Increment counter for this node type
            nodeCounter[nodeType] = (nodeCounter[nodeType] || 0) + 1;
            
            // Get default configuration from neural network module or use our own defaults
            let nodeConfig;
            if (window.neuralNetwork && window.neuralNetwork.createNodeConfig) {
                nodeConfig = window.neuralNetwork.createNodeConfig(nodeType);
            } else {
                // Fallback default configs if neural network module is not available
                nodeConfig = {};
                switch (nodeType) {
                    case 'input':
                        nodeConfig = {
                            shape: [28, 28, 1],
                            outputShape: [28, 28, 1],
                            parameters: 0
                        };
                        break;
                        
                    case 'hidden':
                        nodeConfig = {
                            units: 128,
                            activation: 'relu',
                            outputShape: [128],
                            parameters: 0
                        };
                        break;
                        
                    case 'output':
                        nodeConfig = {
                            units: 10,
                            activation: 'softmax',
                            outputShape: [10],
                            parameters: 0
                        };
                        break;
                        
                    case 'conv':
                        nodeConfig = {
                            filters: 32,
                            kernelSize: [3, 3],
                            strides: [1, 1],
                            padding: 'same',
                            activation: 'relu',
                            outputShape: ['?', '?', 32],
                            parameters: 0
                        };
                        break;
                        
                    case 'pool':
                        nodeConfig = {
                            poolSize: [2, 2],
                            strides: [2, 2],
                            padding: 'valid',
                            poolType: 'max',
                            outputShape: ['?', '?', '?'],
                            parameters: 0
                        };
                        break;
                        
                    case 'lstm':
                        nodeConfig = {
                            units: 64,
                            returnSequences: true,
                            activation: 'tanh',
                            recurrentActivation: 'sigmoid',
                            useBias: true,
                            outputShape: ['?', 64],
                            parameters: 0
                        };
                        break;
                        
                    case 'rnn':
                        nodeConfig = {
                            units: 32,
                            returnSequences: true,
                            activation: 'tanh',
                            useBias: true,
                            outputShape: ['?', 32],
                            parameters: 0
                        };
                        break;
                        
                    case 'gru':
                        nodeConfig = {
                            units: 48,
                            returnSequences: true,
                            activation: 'tanh',
                            recurrentActivation: 'sigmoid',
                            useBias: true,
                            outputShape: ['?', 48],
                            parameters: 0
                        };
                        break;
                }
            }
            
            // Ensure Conv2D has properly formatted array values
            if (nodeType === 'conv') {
                if (!nodeConfig.kernelSize || typeof nodeConfig.kernelSize === 'string') {
                    nodeConfig.kernelSize = [3, 3];
                }
                if (!nodeConfig.strides || typeof nodeConfig.strides === 'string') {
                    nodeConfig.strides = [1, 1];
                }
                if (!nodeConfig.filters || isNaN(nodeConfig.filters)) {
                    nodeConfig.filters = 32;
                }
                nodeConfig.padding = nodeConfig.padding || 'same';
                nodeConfig.activation = nodeConfig.activation || 'relu';
            }
            
            // Create node element
            const canvasNode = document.createElement('div');
            canvasNode.className = `canvas-node ${nodeType}-node`;
            canvasNode.setAttribute('data-type', nodeType);
            canvasNode.setAttribute('data-id', layerId);
            canvasNode.style.position = 'absolute';
            canvasNode.style.left = `${posX}px`;
            canvasNode.style.top = `${posY}px`;
            
            // Set up node content (input/output shape, parameters)
            let nodeName, inputShape, outputShape, parameters;
            
            switch(nodeType) {
                case 'input':
                    nodeName = 'Input Layer';
                    inputShape = 'N/A';
                    outputShape = '[' + nodeConfig.shape.join(' × ') + ']';
                    parameters = nodeConfig.parameters;
                    break;
                case 'hidden':
                    nodeConfig.units = nodeCounter[nodeType] === 1 ? 128 : 64;
                    nodeName = `Hidden Layer ${nodeCounter[nodeType]}`;
                    inputShape = 'Connect input';
                    outputShape = `[${nodeConfig.units}]`;
                    parameters = 'Connect input to calculate';
                    break;
                case 'output':
                    nodeName = 'Output Layer';
                    inputShape = 'Connect input';
                    outputShape = `[${nodeConfig.units}]`;
                    parameters = 'Connect input to calculate';
                    break;
                case 'conv':
                    nodeConfig.filters = 32 * nodeCounter[nodeType];
                    nodeName = `Conv2D ${nodeCounter[nodeType]}`;
                    inputShape = 'Connect input';
                    outputShape = 'Depends on input';
                    parameters = `Kernel: ${nodeConfig.kernelSize.join('×')}\nStride: ${nodeConfig.strides.join('×')}\nPadding: ${nodeConfig.padding}`;
                    break;
                case 'pool':
                    nodeName = `Pooling ${nodeCounter[nodeType]}`;
                    inputShape = 'Connect input';
                    outputShape = 'Depends on input';
                    parameters = `Pool size: ${nodeConfig.poolSize.join('×')}\nStride: ${nodeConfig.strides.join('×')}\nPadding: ${nodeConfig.padding}`;
                    break;
                case 'lstm':
                    nodeName = `LSTM ${nodeCounter[nodeType]}`;
                    inputShape = 'Connect input';
                    outputShape = `[?, ${nodeConfig.units}]`;
                    parameters = `Units: ${nodeConfig.units}\nReturn Sequences: ${nodeConfig.returnSequences ? 'Yes' : 'No'}\nGates: 4`;
                    break;
                case 'rnn':
                    nodeName = `RNN ${nodeCounter[nodeType]}`;
                    inputShape = 'Connect input';
                    outputShape = `[?, ${nodeConfig.units}]`;
                    parameters = `Units: ${nodeConfig.units}\nReturn Sequences: ${nodeConfig.returnSequences ? 'Yes' : 'No'}`;
                    break;
                case 'gru':
                    nodeName = `GRU ${nodeCounter[nodeType]}`;
                    inputShape = 'Connect input';
                    outputShape = `[?, ${nodeConfig.units}]`;
                    parameters = `Units: ${nodeConfig.units}\nReturn Sequences: ${nodeConfig.returnSequences ? 'Yes' : 'No'}\nGates: 3`;
                    break;
                default:
                    nodeName = 'Unknown Layer';
                    inputShape = 'N/A';
                    outputShape = 'N/A';
                    parameters = 'N/A';
            }
            
            // Create node content
            const nodeContent = document.createElement('div');
            nodeContent.className = 'node-content';
            
            // Add shape information
            const shapeInfo = document.createElement('div');
            shapeInfo.className = 'shape-info';
            shapeInfo.innerHTML = `
                <div class="shape-row"><span class="shape-label">Input:</span> <span class="input-shape">${inputShape}</span></div>
                <div class="shape-row"><span class="shape-label">Output:</span> <span class="output-shape">${outputShape}</span></div>
            `;
            
            // Add parameters section
            const paramsSection = document.createElement('div');
            paramsSection.className = 'params-section';
            paramsSection.innerHTML = `
                <div class="params-details">${parameters}</div>
                <div class="node-parameters">Params: ${nodeConfig.parameters !== undefined ? formatNumber(nodeConfig.parameters) : '?'}</div>
            `;
            
            // Assemble content
            nodeContent.appendChild(shapeInfo);
            nodeContent.appendChild(paramsSection);
            
            // Add dimensions section
            const dimensionsSection = document.createElement('div');
            dimensionsSection.className = 'node-dimensions';
            
            // Set dimensions text based on node type
            let dimensionsText = '';
            switch(nodeType) {
                case 'input':
                    dimensionsText = nodeConfig.shape.join(' × ');
                    break;
                case 'hidden':
                case 'output':
                    dimensionsText = nodeConfig.units.toString();
                    break;
                case 'conv':
                    if (nodeConfig.inputShape && nodeConfig.outputShape) {
                        dimensionsText = `${nodeConfig.inputShape.join('×')} → ${nodeConfig.outputShape.join('×')}`;
                    } else {
                        dimensionsText = `? → ${nodeConfig.filters} filters`;
                    }
                    break;
                case 'pool':
                    if (nodeConfig.inputShape && nodeConfig.outputShape) {
                        dimensionsText = `${nodeConfig.inputShape.join('×')} → ${nodeConfig.outputShape.join('×')}`;
                    } else {
                        dimensionsText = `? → ?`;
                    }
                    break;
            }
            dimensionsSection.textContent = dimensionsText;
            
            // Create node title
            const nodeTitle = document.createElement('div');
            nodeTitle.className = 'node-title';
            nodeTitle.textContent = nodeName;
            
            // Add node controls (edit and delete buttons)
            const nodeControls = document.createElement('div');
            nodeControls.className = 'node-controls';
            
            const editButton = document.createElement('button');
            editButton.className = 'node-edit-btn';
            editButton.innerHTML = '✎';
            editButton.title = 'Edit Layer';
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'node-delete-btn';
            deleteButton.innerHTML = '×';
            deleteButton.title = 'Delete Layer';
            
            nodeControls.appendChild(editButton);
            nodeControls.appendChild(deleteButton);
            
            // Add connection ports
            const portIn = document.createElement('div');
            portIn.className = 'node-port port-in';
            
            const portOut = document.createElement('div');
            portOut.className = 'node-port port-out';
            
            // Assemble the node
            canvasNode.appendChild(nodeTitle);
            canvasNode.appendChild(nodeControls);
            canvasNode.appendChild(dimensionsSection);
            canvasNode.appendChild(nodeContent);
            canvasNode.appendChild(portIn);
            canvasNode.appendChild(portOut);
            
            // Store metadata
            canvasNode.setAttribute('data-name', nodeName);
            canvasNode.setAttribute('data-dimensions', dimensionsText);
            canvasNode.layerConfig = nodeConfig;
            
            // Add node to canvas
            canvas.appendChild(canvasNode);
            
            // Add to network model
            networkLayers.layers.push({
                id: layerId,
                type: nodeType,
                name: nodeName,
                position: { x: posX, y: posY },
                dimensions: dimensionsText,
                config: nodeConfig,
                parameters: nodeConfig.parameters || 0
            });
            
            // Set up event handlers (edit, delete, connections)
            setupNodeEventHandlers(canvasNode);
            
            // Hide canvas hint
            const canvasHint = document.querySelector('.canvas-hint');
            if (canvasHint) {
                canvasHint.style.display = 'none';
            }
            
            // Notify model update
            document.dispatchEvent(new CustomEvent('networkUpdated', {
                detail: networkLayers
            }));
            
            console.log(`Node created: ${nodeType} (${layerId})`);
            return canvasNode;
        }
        
        // 2. MOVING EXISTING NODES ON CANVAS
        
        // Setup event handlers for node actions
        function setupNodeEventHandlers(node) {
            // Setup direct mouse handlers for dragging
            node.addEventListener('mousedown', function(e) {
                // Skip if clicking on controls or ports
                if (e.target.closest('.node-controls') || e.target.closest('.node-port')) {
                    return;
                }
                
                console.log(`Mouse down on node: ${node.getAttribute('data-id')}`);
                
                // Initialize drag
                activeNode = node;
                const rect = node.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                isDragging = true;
                
                // Visual indication
                node.classList.add('dragging');
                document.body.classList.add('node-dragging');
                node.style.zIndex = '1000';
                
                e.preventDefault();
            });
            
            // Edit button click
            const editButton = node.querySelector('.node-edit-btn');
            if (editButton) {
                editButton.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openLayerEditor(node);
                });
            }
            
            // Delete button click
            const deleteButton = node.querySelector('.node-delete-btn');
            if (deleteButton) {
                deleteButton.addEventListener('click', function(e) {
                    e.stopPropagation();
                    deleteNode(node);
                });
            }
            
            // Double-click to edit
            node.addEventListener('dblclick', function() {
                openLayerEditor(node);
            });
            
            // Right-click to delete
            node.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                deleteNode(node);
            });
            
            // Connection port events
            const portOut = node.querySelector('.port-out');
            if (portOut) {
                portOut.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                    // Use our own connection handler instead of relying on window.startConnection
                    startConnectionHandler(node, e);
                });
            }
        }
        
        // Global mouse handlers for dragging
        document.addEventListener('mousemove', function(e) {
            if (!isDragging || !activeNode) return;
            
            // Log occasionally for debugging
            if (Math.random() < 0.05) {
                console.log('Node is being dragged...');
            }
            
            const canvasRect = canvas.getBoundingClientRect();
            let x = e.clientX - canvasRect.left - offsetX;
            let y = e.clientY - canvasRect.top - offsetY;
            
            // Keep within canvas
            const nodeWidth = activeNode.offsetWidth || 180;
            const nodeHeight = activeNode.offsetHeight || 120;
            
            x = Math.max(0, Math.min(canvasRect.width - nodeWidth, x));
            y = Math.max(0, Math.min(canvasRect.height - nodeHeight, y));
            
            // Move node
            activeNode.style.left = `${x}px`;
            activeNode.style.top = `${y}px`;
            
            // Update model
            const nodeId = activeNode.getAttribute('data-id');
            const layerIndex = networkLayers.layers.findIndex(layer => layer.id === nodeId);
            if (layerIndex !== -1) {
                networkLayers.layers[layerIndex].position = { x, y };
            }
            
            // Update connections
            updateConnections(nodeId);
        });
        
        document.addEventListener('mouseup', function() {
            if (!isDragging || !activeNode) return;
            
            console.log('Node drag complete');
            
            // Visual cleanup
            activeNode.classList.remove('dragging');
            document.body.classList.remove('node-dragging');
            activeNode.style.zIndex = '10';
            
            // Final connection update
            updateConnections();
            
            // Cleanup
            isDragging = false;
            activeNode = null;
            
            // Notify model update
            document.dispatchEvent(new CustomEvent('networkUpdated', {
                detail: networkLayers
            }));
        });
        
        // Add handlers to existing nodes (for page refresh cases)
        document.querySelectorAll('.canvas-node').forEach(setupNodeEventHandlers);
        
        // 3. SUPPORTING FUNCTIONS
        
        // Delete a node
        function deleteNode(node) {
            if (!node) return;
            
            const nodeId = node.getAttribute('data-id');
            console.log(`Deleting node: ${nodeId}`);
            
            // Remove connections
            const connections = document.querySelectorAll(`.connection[data-source="${nodeId}"], .connection[data-target="${nodeId}"]`);
            connections.forEach(conn => {
                if (conn.parentNode) {
                    conn.parentNode.removeChild(conn);
                }
            });
            
            // Update model
            networkLayers.connections = networkLayers.connections.filter(conn => 
                conn.source !== nodeId && conn.target !== nodeId
            );
            
            const layerIndex = networkLayers.layers.findIndex(layer => layer.id === nodeId);
            if (layerIndex !== -1) {
                networkLayers.layers.splice(layerIndex, 1);
            }
            
            // Remove from DOM
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
            
            // Show hint if no nodes left
            if (document.querySelectorAll('.canvas-node').length === 0) {
                const canvasHint = document.querySelector('.canvas-hint');
                if (canvasHint) {
                    canvasHint.style.display = 'block';
                }
            }
            
            // Notify model update
            document.dispatchEvent(new CustomEvent('networkUpdated', {
                detail: networkLayers
            }));
        }
        
        // Open layer editor
        function openLayerEditor(node) {
            if (!node) return;
            
            const nodeId = node.getAttribute('data-id');
            const nodeType = node.getAttribute('data-type');
            const nodeName = node.getAttribute('data-name');
            const dimensions = node.getAttribute('data-dimensions');
            
            console.log(`Opening editor for node: ${nodeId}`);
            
            // Trigger editor event
            document.dispatchEvent(new CustomEvent('openLayerEditor', { 
                detail: { 
                    id: nodeId, 
                    type: nodeType, 
                    name: nodeName, 
                    dimensions: dimensions,
                    node: node
                }
            }));
        }
        
        // Update connections
        function updateConnections(specificNodeId = null) {
            // Get connections to update
            let connections;
            if (specificNodeId) {
                connections = document.querySelectorAll(`.connection[data-source="${specificNodeId}"], .connection[data-target="${specificNodeId}"]`);
            } else {
                connections = document.querySelectorAll('.connection:not(.temp-connection)');
            }
            
            connections.forEach(connection => {
                const sourceId = connection.getAttribute('data-source');
                const targetId = connection.getAttribute('data-target');
                
                const sourceNode = document.querySelector(`.canvas-node[data-id="${sourceId}"]`);
                const targetNode = document.querySelector(`.canvas-node[data-id="${targetId}"]`);
                
                if (sourceNode && targetNode) {
                    const sourcePort = sourceNode.querySelector('.port-out');
                    const targetPort = targetNode.querySelector('.port-in');
                    
                    if (sourcePort && targetPort) {
                        const canvasRect = canvas.getBoundingClientRect();
                        const sourceRect = sourcePort.getBoundingClientRect();
                        const targetRect = targetPort.getBoundingClientRect();
                        
                        const startX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
                        const startY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
                        const endX = targetRect.left + targetRect.width / 2 - canvasRect.left;
                        const endY = targetRect.top + targetRect.height / 2 - canvasRect.top;
                        
                        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
                        
                        connection.style.left = `${startX}px`;
                        connection.style.top = `${startY}px`;
                        connection.style.width = `${length}px`;
                        connection.style.transform = `rotate(${angle}deg)`;
                    }
                } else {
                    // Remove orphaned connection
                    if (connection.parentNode) {
                        connection.parentNode.removeChild(connection);
                    }
                }
            });
        }
        
        // 5. CONNECTION HANDLING
        
        // Connection state tracking
        let tempConnection = null;
        let connectionSource = null;
        
        // Start creating a connection
        function startConnectionHandler(sourceNode, event) {
            console.log('Starting connection from node:', sourceNode.getAttribute('data-id'));
            
            // Cancel any existing connection attempt
            if (tempConnection && tempConnection.parentNode) {
                tempConnection.parentNode.removeChild(tempConnection);
            }
            
            // Create a temporary connection element
            tempConnection = document.createElement('div');
            tempConnection.className = 'connection temp-connection';
            canvas.appendChild(tempConnection);
            
            // Store the source node
            connectionSource = sourceNode;
            
            // Get initial positions
            const sourceId = sourceNode.getAttribute('data-id');
            const sourcePort = sourceNode.querySelector('.port-out');
            const canvasRect = canvas.getBoundingClientRect();
            const sourceRect = sourcePort.getBoundingClientRect();
            const startX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
            const startY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
            
            // Set initial position
            tempConnection.style.left = `${startX}px`;
            tempConnection.style.top = `${startY}px`;
            tempConnection.setAttribute('data-source', sourceId);
            
            // Add event listeners for moving and completing the connection
            document.addEventListener('mousemove', moveConnectionHandler);
            document.addEventListener('mouseup', endConnectionHandler);
            
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Update the temporary connection during drag
        function moveConnectionHandler(event) {
            if (!tempConnection || !connectionSource) return;
            
            const canvasRect = canvas.getBoundingClientRect();
            const sourcePort = connectionSource.querySelector('.port-out');
            const sourceRect = sourcePort.getBoundingClientRect();
            
            const startX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
            const startY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
            const endX = event.clientX - canvasRect.left;
            const endY = event.clientY - canvasRect.top;
            
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
            
            tempConnection.style.left = `${startX}px`;
            tempConnection.style.top = `${startY}px`;
            tempConnection.style.width = `${length}px`;
            tempConnection.style.transform = `rotate(${angle}deg)`;
        }
        
        // Complete or cancel the connection
        function endConnectionHandler(event) {
            // Remove the event listeners
            document.removeEventListener('mousemove', moveConnectionHandler);
            document.removeEventListener('mouseup', endConnectionHandler);
            
            if (!tempConnection || !connectionSource) return;
            
            // Check if we're over a valid target (port-in)
            const targetPort = document.elementFromPoint(event.clientX, event.clientY);
            let targetNode = null;
            
            if (targetPort && targetPort.classList.contains('port-in')) {
                targetNode = targetPort.closest('.canvas-node');
            }
            
            if (targetNode) {
                const sourceId = connectionSource.getAttribute('data-id');
                const targetId = targetNode.getAttribute('data-id');
                
                // Prevent self-connections
                if (sourceId === targetId) {
                    console.log('Cannot connect a node to itself');
                    if (tempConnection.parentNode) {
                        tempConnection.parentNode.removeChild(tempConnection);
                    }
                    tempConnection = null;
                    connectionSource = null;
                    return;
                }
                
                // Check if connection already exists
                const existingConnection = document.querySelector(`.connection[data-source="${sourceId}"][data-target="${targetId}"]`);
                if (existingConnection) {
                    console.log('Connection already exists');
                    if (tempConnection.parentNode) {
                        tempConnection.parentNode.removeChild(tempConnection);
                    }
                    tempConnection = null;
                    connectionSource = null;
                    return;
                }
                
                console.log(`Creating connection: ${sourceId} → ${targetId}`);
                
                // Create the permanent connection
                tempConnection.classList.remove('temp-connection');
                tempConnection.setAttribute('data-target', targetId);
                
                // Add to network model
                networkLayers.connections.push({
                    source: sourceId,
                    target: targetId
                });
                
                // Update connection display
                updateConnections();
                
                // Update parameters based on the new connection
                updateParametersAfterConnection(sourceId, targetId);
                
                // Notify model update
                document.dispatchEvent(new CustomEvent('networkUpdated', {
                    detail: networkLayers
                }));
            } else {
                // No valid target, remove the temp connection
                if (tempConnection.parentNode) {
                    tempConnection.parentNode.removeChild(tempConnection);
                }
            }
            
            // Reset state
            tempConnection = null;
            connectionSource = null;
        }
        
        // Update parameters after a connection is made
        function updateParametersAfterConnection(sourceId, targetId) {
            const sourceNode = document.querySelector(`.canvas-node[data-id="${sourceId}"]`);
            const targetNode = document.querySelector(`.canvas-node[data-id="${targetId}"]`);
            
            if (!sourceNode || !targetNode) return;
            
            const sourceType = sourceNode.getAttribute('data-type');
            const targetType = targetNode.getAttribute('data-type');
            
            const sourceConfig = sourceNode.layerConfig || {};
            const targetConfig = targetNode.layerConfig || {};
            
            console.log(`Updating parameters: ${sourceType} → ${targetType}`);
            
            // Check if target has a manual output shape (user set)
            const hasManualOutputShape = targetConfig.outputShape && 
                Array.isArray(targetConfig.outputShape) && 
                targetConfig.outputShape.length > 0 &&
                targetConfig.outputShape.some(dim => dim !== '?' && dim !== '');
            
            console.log(`Target has manual output shape: ${hasManualOutputShape}`, targetConfig.outputShape);
            
            // Set input shape of target based on output shape of source
            if (sourceConfig.outputShape) {
                targetConfig.inputShape = [...sourceConfig.outputShape];
                
                // Update the display
                const inputShapeDisplay = targetNode.querySelector('.input-shape');
                if (inputShapeDisplay) {
                    inputShapeDisplay.textContent = `[${sourceConfig.outputShape.join(' × ')}]`;
                }
            }
            
            // If target has a manual output shape, don't recalculate the output shape
            if (hasManualOutputShape) {
                console.log('Preserving manual output shape:', targetConfig.outputShape);
            } else {
                // Calculate output shape and parameters based on node type
                if (window.neuralNetwork && window.neuralNetwork.calculateOutputShape) {
                    // Use neural network module if available
                    const outputShape = window.neuralNetwork.calculateOutputShape(targetConfig, targetType);
                    const parameters = window.neuralNetwork.calculateParameters(targetConfig, targetType);
                    
                    if (outputShape) {
                        targetConfig.outputShape = outputShape;
                        
                        // Update output shape display
                        const outputShapeDisplay = targetNode.querySelector('.output-shape');
                        if (outputShapeDisplay) {
                            outputShapeDisplay.textContent = `[${outputShape.join(' × ')}]`;
                        }
                    }
                    
                    if (parameters !== undefined) {
                        targetConfig.parameters = parameters;
                        
                        // Update parameters display
                        const paramsDisplay = targetNode.querySelector('.node-parameters');
                        if (paramsDisplay) {
                            paramsDisplay.textContent = `Params: ${formatNumber(parameters)}`;
                        }
                    }
                } else {
                    // Fallback calculations if neural network module is not available
                    let outputShape, parameters;
                    
                    switch (targetType) {
                        case 'hidden':
                            outputShape = [targetConfig.units || 64];
                            if (sourceConfig.outputShape) {
                                const inputSize = sourceConfig.outputShape.reduce((a, b) => a * b, 1);
                                parameters = inputSize * targetConfig.units + targetConfig.units; // weights + biases
                            }
                            break;
                            
                        case 'output':
                            outputShape = [targetConfig.units || 10];
                            if (sourceConfig.outputShape) {
                                const inputSize = sourceConfig.outputShape.reduce((a, b) => a * b, 1);
                                parameters = inputSize * targetConfig.units + targetConfig.units; // weights + biases
                            }
                            break;
                            
                        case 'rnn':
                            // Get units and check if returning sequences
                            const rnnUnits = parseInt(targetConfig.units) || 32;
                            const rnnReturnSequences = targetConfig.returnSequences === 'true' || targetConfig.returnSequences === true;
                            
                            // Set output shape based on return_sequences setting
                            if (rnnReturnSequences && sourceConfig.outputShape && sourceConfig.outputShape.length > 0) {
                                // If return_sequences is true, output is [sequence_length, units]
                                outputShape = [sourceConfig.outputShape[0], rnnUnits];
                            } else {
                                // If return_sequences is false, output is just [units]
                                outputShape = [rnnUnits];
                            }
                            
                            // Calculate parameters if we have input shape
                            if (sourceConfig.outputShape && sourceConfig.outputShape.length > 0) {
                                // Get the last dimension of the input as input_features
                                const inputFeatures = sourceConfig.outputShape[sourceConfig.outputShape.length - 1];
                                const useBias = targetConfig.useBias !== 'false' && targetConfig.useBias !== false;
                                
                                // Formula: input_features * units + units * units + units (bias)
                                const inputParams = inputFeatures * rnnUnits;
                                const recurrentParams = rnnUnits * rnnUnits;
                                const biasParams = useBias ? rnnUnits : 0;
                                
                                parameters = inputParams + recurrentParams + biasParams;
                                
                                console.log(`RNN parameter calculation:
                                    Input features: ${inputFeatures}
                                    Units: ${rnnUnits}
                                    Input weights: ${inputParams}
                                    Recurrent weights: ${recurrentParams}
                                    Bias: ${biasParams}
                                    Total: ${parameters}`);
                            }
                            break;
                            
                        case 'lstm':
                            // Get units and check if returning sequences
                            const lstmUnits = parseInt(targetConfig.units) || 64;
                            const lstmReturnSequences = targetConfig.returnSequences === 'true' || targetConfig.returnSequences === true;
                            
                            // Set output shape based on return_sequences setting
                            if (lstmReturnSequences && sourceConfig.outputShape && sourceConfig.outputShape.length > 0) {
                                outputShape = [sourceConfig.outputShape[0], lstmUnits];
                            } else {
                                outputShape = [lstmUnits];
                            }
                            
                            // Calculate parameters if we have input shape
                            if (sourceConfig.outputShape && sourceConfig.outputShape.length > 0) {
                                // LSTM has 4 gates, each with its own weights and biases
                                const inputFeatures = sourceConfig.outputShape[sourceConfig.outputShape.length - 1];
                                const useBias = targetConfig.useBias !== 'false' && targetConfig.useBias !== false;
                                
                                // Formula: 4 * (input_features * units + units * units + units (bias))
                                const inputParams = 4 * (inputFeatures * lstmUnits);
                                const recurrentParams = 4 * (lstmUnits * lstmUnits);
                                const biasParams = useBias ? 4 * lstmUnits : 0;
                                
                                parameters = inputParams + recurrentParams + biasParams;
                                
                                console.log(`LSTM parameter calculation:
                                    Input features: ${inputFeatures}
                                    Units: ${lstmUnits}
                                    Gates: 4 (input, forget, cell, output)
                                    Input weights: ${inputParams}
                                    Recurrent weights: ${recurrentParams}
                                    Bias: ${biasParams}
                                    Total: ${parameters}`);
                            }
                            break;
                            
                        case 'gru':
                            // Get units and check if returning sequences
                            const gruUnits = parseInt(targetConfig.units) || 48;
                            const gruReturnSequences = targetConfig.returnSequences === 'true' || targetConfig.returnSequences === true;
                            
                            // Set output shape based on return_sequences setting
                            if (gruReturnSequences && sourceConfig.outputShape && sourceConfig.outputShape.length > 0) {
                                outputShape = [sourceConfig.outputShape[0], gruUnits];
                            } else {
                                outputShape = [gruUnits];
                            }
                            
                            // Calculate parameters if we have input shape
                            if (sourceConfig.outputShape && sourceConfig.outputShape.length > 0) {
                                // GRU has 3 gates, each with its own weights and biases
                                const inputFeatures = sourceConfig.outputShape[sourceConfig.outputShape.length - 1];
                                const useBias = targetConfig.useBias !== 'false' && targetConfig.useBias !== false;
                                
                                // Formula: 3 * (input_features * units + units * units + units (bias))
                                const inputParams = 3 * (inputFeatures * gruUnits);
                                const recurrentParams = 3 * (gruUnits * gruUnits);
                                const biasParams = useBias ? 3 * gruUnits : 0;
                                
                                parameters = inputParams + recurrentParams + biasParams;
                                
                                console.log(`GRU parameter calculation:
                                    Input features: ${inputFeatures}
                                    Units: ${gruUnits}
                                    Gates: 3 (update, reset, new)
                                    Input weights: ${inputParams}
                                    Recurrent weights: ${recurrentParams}
                                    Bias: ${biasParams}
                                    Total: ${parameters}`);
                            }
                            break;
                            
                        case 'conv':
                            if (sourceConfig.outputShape && sourceConfig.outputShape.length >= 3) {
                                // Very explicit type conversion - ensure all values are numbers
                                const height = Math.max(1, parseInt(sourceConfig.outputShape[0]) || 1);  // Ensure at least 1
                                const width = Math.max(1, parseInt(sourceConfig.outputShape[1]) || 1);   // Ensure at least 1
                                const channels = Math.max(1, parseInt(sourceConfig.outputShape[2]) || 1); // Ensure at least 1
                                
                                console.log(`Conv2D CONNECTION INPUT SHAPE: [${height}, ${width}, ${channels}]`, 
                                    {original: sourceConfig.outputShape, parsed: [height, width, channels]});
                                
                                // Ensure filters is a positive number
                                const filters = Math.max(1, parseInt(targetConfig.filters) || 32);
                                
                                // Explicit processing of kernelSize with safety checks
                                let kernelSize = [3, 3]; // Default fallback
                                if (targetConfig.kernelSize) {
                                    if (typeof targetConfig.kernelSize === 'string') {
                                        kernelSize = targetConfig.kernelSize.split(',')
                                            .map(v => Math.max(1, parseInt(v.trim()) || 1)); // Ensure at least 1
                                    } else if (Array.isArray(targetConfig.kernelSize)) {
                                        kernelSize = targetConfig.kernelSize
                                            .map(v => Math.max(1, parseInt(v) || 1)); // Ensure at least 1
                                    }
                                }
                                
                                // Explicit processing of strides with safety checks
                                let strides = [1, 1]; // Default fallback
                                if (targetConfig.strides) {
                                    if (typeof targetConfig.strides === 'string') {
                                        strides = targetConfig.strides.split(',')
                                            .map(v => Math.max(1, parseInt(v.trim()) || 1)); // Ensure at least 1
                                    } else if (Array.isArray(targetConfig.strides)) {
                                        strides = targetConfig.strides
                                            .map(v => Math.max(1, parseInt(v) || 1)); // Ensure at least 1
                                    }
                                }
                                
                                // Ensure we have at least 2 elements for kernelSize and strides and all values are at least 1
                                kernelSize = kernelSize.length >= 2 ? 
                                    [Math.max(1, kernelSize[0]), Math.max(1, kernelSize[1])] : 
                                    [Math.max(1, kernelSize[0] || 3), Math.max(1, kernelSize[0] || 3)];
                                    
                                strides = strides.length >= 2 ? 
                                    [Math.max(1, strides[0]), Math.max(1, strides[1])] : 
                                    [Math.max(1, strides[0] || 1), Math.max(1, strides[0] || 1)];
                                
                                console.log(`Conv2D CONNECTION CONFIG:`, {
                                    filters: filters,
                                    kernelSize: kernelSize,
                                    strides: strides
                                });
                                
                                // Store cleaned values back in config
                                targetConfig.filters = filters;
                                targetConfig.kernelSize = kernelSize;
                                targetConfig.strides = strides;
                                
                                const padding = targetConfig.padding || 'same';
                                
                                // Calculate output dimensions based on padding
                                let outHeight, outWidth;
                                if (padding === 'same') {
                                    outHeight = Math.ceil(height / strides[0]);
                                    outWidth = Math.ceil(width / strides[1]);
                                } else { // 'valid' padding
                                    outHeight = Math.ceil((height - kernelSize[0] + 1) / strides[0]);
                                    outWidth = Math.ceil((width - kernelSize[1] + 1) / strides[1]);
                                }
                                
                                // Ensure output dimensions are at least 1
                                outHeight = Math.max(1, outHeight);
                                outWidth = Math.max(1, outWidth);
                                
                                // Final output shape with proper validation
                                outputShape = [outHeight, outWidth, filters];
                                
                                // Calculate parameters step by step to avoid any overflow or multiplication errors
                                const kh = Number(kernelSize[0]);
                                const kw = Number(kernelSize[1]);
                                const c = Number(channels);
                                const f = Number(filters);
                                
                                // Check for any zeros or negative values that would make the calculation invalid
                                if (kh <= 0 || kw <= 0 || c <= 0 || f <= 0) {
                                    console.error(`Invalid Conv2D connection parameter values: kh=${kh}, kw=${kw}, c=${c}, f=${f}`);
                                    parameters = 0;
                                } else {
                                    // Calculate with explicit steps to avoid any overflow
                                    const kernelParams = kh * kw * c * f;
                                    const biasParams = f;
                                    parameters = kernelParams + biasParams;
                                    
                                    console.log(`Conv2D CONNECTION CALCULATION STEPS:
                                      Kernel height (kh) = ${kh}
                                      Kernel width (kw) = ${kw}
                                      Input channels (c) = ${c}
                                      Filters (f) = ${f}
                                      Kernel params = ${kh} × ${kw} × ${c} × ${f} = ${kernelParams}
                                      Bias params = ${biasParams}
                                      Total params = ${kernelParams} + ${biasParams} = ${parameters}
                                    `);
                                }
                                
                                console.log(`Conv2D connection output shape: ${outHeight}×${outWidth}×${filters}`);
                            } else {
                                console.log('Cannot calculate Conv2D connection parameters - invalid input shape:', sourceConfig.outputShape);
                                const filters = parseInt(targetConfig.filters) || 32;
                                outputShape = ['?', '?', filters];
                                parameters = 0;  // Set to 0 instead of '?' to avoid display issues
                            }
                            break;
                            
                        case 'pool':
                            if (sourceConfig.outputShape && sourceConfig.outputShape.length >= 3) {
                                const [height, width, channels] = sourceConfig.outputShape;
                                const poolSize = targetConfig.poolSize || [2, 2];
                                const stride = targetConfig.strides || poolSize;
                                const padding = targetConfig.padding || 'valid';
                                
                                // Calculate output dimensions
                                let outHeight, outWidth;
                                if (padding === 'same') {
                                    outHeight = Math.ceil(height / stride[0]);
                                    outWidth = Math.ceil(width / stride[1]);
                                } else { // 'valid' padding
                                    outHeight = Math.ceil((height - poolSize[0] + 1) / stride[0]);
                                    outWidth = Math.ceil((width - poolSize[1] + 1) / stride[1]);
                                }
                                
                                outputShape = [outHeight, outWidth, channels];
                                parameters = 0; // Pooling layers have no parameters
                            }
                            break;
                    }
                    
                    // Update target config and display only for automatically calculated shapes
                    if (outputShape) {
                        targetConfig.outputShape = outputShape;
                        
                        // Update output shape display
                        const outputShapeDisplay = targetNode.querySelector('.output-shape');
                        if (outputShapeDisplay) {
                            outputShapeDisplay.textContent = `[${outputShape.join(' × ')}]`;
                        }
                    }
                    
                    if (parameters !== undefined) {
                        targetConfig.parameters = parameters;
                        
                        // Update parameters display
                        const paramsDisplay = targetNode.querySelector('.node-parameters');
                        if (paramsDisplay) {
                            paramsDisplay.textContent = `Params: ${formatNumber(parameters)}`;
                        }
                    }
                }
            }
            
            // Store updated config back to the node
            targetNode.layerConfig = targetConfig;
            
            // Update model
            const layerIndex = networkLayers.layers.findIndex(layer => layer.id === targetId);
            if (layerIndex !== -1) {
                networkLayers.layers[layerIndex].config = targetConfig;
                if (targetConfig.parameters) {
                    networkLayers.layers[layerIndex].parameters = targetConfig.parameters;
                }
            }
            
            // Force re-render the node to show updated info
            const dimensions = targetNode.querySelector('.node-dimensions');
            if (dimensions && targetConfig.outputShape) {
                let dimensionsText = '';
                if (targetType === 'hidden' || targetType === 'output') {
                    dimensionsText = targetConfig.units || '';
                } else if (targetType === 'conv' || targetType === 'pool') {
                    dimensionsText = targetConfig.outputShape.join('×');
                }
                dimensions.textContent = dimensionsText;
            }
        }
        
        // 4. EXPORT GLOBAL FUNCTIONS
        
        // Expose functions to window for compatibility
        window.dragDrop = {
            getNetworkArchitecture: function() {
                return networkLayers;
            },
            clearAllNodes: function() {
                // Clear all nodes
                document.querySelectorAll('.canvas-node, .connection').forEach(el => {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                });
                
                // Reset model
                networkLayers = {
                    layers: [],
                    connections: []
                };
                
                // Reset counters
                for (let key in nodeCounter) {
                    nodeCounter[key] = 0;
                }
                
                // Show hint
                const canvasHint = document.querySelector('.canvas-hint');
                if (canvasHint) {
                    canvasHint.style.display = 'block';
                }
                
                // Reset layer counter in neural network module
                if (window.neuralNetwork && window.neuralNetwork.resetLayerCounter) {
                    window.neuralNetwork.resetLayerCounter();
                }
                
                // Notify update
                document.dispatchEvent(new CustomEvent('networkUpdated', {
                    detail: networkLayers
                }));
            },
            updateConnections: updateConnections,
            
            // Force update all node parameters in the network
            forceUpdateNetworkParameters: function() {
                console.log('Force updating all network parameters');
                
                // Get all root nodes (nodes with no incoming connections)
                const rootNodes = [];
                const allNodeIds = networkLayers.layers.map(layer => layer.id);
                const targetNodeIds = networkLayers.connections.map(conn => conn.target);
                
                allNodeIds.forEach(nodeId => {
                    if (!targetNodeIds.includes(nodeId)) {
                        rootNodes.push(nodeId);
                    }
                });
                
                console.log('Root nodes for parameter propagation:', rootNodes);
                
                // Start update from root nodes
                rootNodes.forEach(nodeId => {
                    updateDownstreamNodes(nodeId);
                });
                
                // Recursive function to update downstream nodes
                function updateDownstreamNodes(nodeId) {
                    console.log(`Updating downstream from node: ${nodeId}`);
                    
                    // Find all connections from this node
                    const outgoingConnections = networkLayers.connections.filter(conn => conn.source === nodeId);
                    
                    // If no outgoing connections, we're done with this branch
                    if (outgoingConnections.length === 0) {
                        console.log(`Node ${nodeId} has no outgoing connections`);
                        return;
                    }
                    
                    // Get source node and its config
                    const sourceNode = document.querySelector(`.canvas-node[data-id="${nodeId}"]`);
                    if (!sourceNode || !sourceNode.layerConfig) {
                        console.warn(`Source node ${nodeId} not found or has no config`);
                        return;
                    }
                    
                    const sourceConfig = sourceNode.layerConfig;
                    const sourceType = sourceNode.getAttribute('data-type');
                    
                    // Double check source outputShape is valid
                    if (!sourceConfig.outputShape || !Array.isArray(sourceConfig.outputShape)) {
                        console.warn(`Source node ${nodeId} (${sourceType}) has invalid output shape:`, sourceConfig.outputShape);
                        // Try to fix based on node type
                        if (sourceType === 'input' && Array.isArray(sourceConfig.shape)) {
                            sourceConfig.outputShape = [...sourceConfig.shape];
                            console.log(`Fixed input node output shape to:`, sourceConfig.outputShape);
                        }
                    }
                    
                    console.log(`Source node ${nodeId} (${sourceType}) output shape:`, sourceConfig.outputShape);
                    
                    // For each outgoing connection, update the target node
                    outgoingConnections.forEach(conn => {
                        const targetId = conn.target;
                        const targetNode = document.querySelector(`.canvas-node[data-id="${targetId}"]`);
                        
                        if (!targetNode) {
                            console.warn(`Target node ${targetId} not found`);
                            return;
                        }
                        
                        // Update target node
                        const targetType = targetNode.getAttribute('data-type');
                        const targetConfig = targetNode.layerConfig || {};
                        
                        console.log(`Updating connection: ${sourceType}(${nodeId}) → ${targetType}(${targetId})`);
                        
                        // Check if target has manually set output shape
                        const hasManualOutputShape = targetConfig.outputShape && 
                            Array.isArray(targetConfig.outputShape) && 
                            targetConfig.outputShape.length > 0 &&
                            targetConfig.outputShape.some(dim => dim !== '?' && dim !== '');
                            
                        console.log(`Target node ${targetId} has manual output shape: ${hasManualOutputShape}`, 
                            targetConfig.outputShape);
                        
                        // Set input shape of target based on output shape of source
                        if (sourceConfig.outputShape) {
                            // Make a deep copy to avoid reference issues
                            targetConfig.inputShape = JSON.parse(JSON.stringify(sourceConfig.outputShape));
                            console.log(`Set target node ${targetId} input shape to:`, targetConfig.inputShape);
                            
                            // Update the input shape display
                            const inputShapeDisplay = targetNode.querySelector('.input-shape');
                            if (inputShapeDisplay) {
                                inputShapeDisplay.textContent = `[${sourceConfig.outputShape.join(' × ')}]`;
                            }
                            
                            // Only update output shape if not manually set
                            if (!hasManualOutputShape) {
                                // Special handling for Conv2D
                                if (targetType === 'conv') {
                                    console.log(`Special handling for Conv2D target node ${targetId}`);
                                    
                                    // Force update the parameters
                                    if (window.updateParametersAfterConnection) {
                                        try {
                                            window.updateParametersAfterConnection(nodeId, targetId);
                                            console.log(`Updated Conv2D node ${targetId} parameters through connection handler`);
                                        } catch (error) {
                                            console.error(`Error updating Conv2D parameters:`, error);
                                        }
                                    } else {
                                        console.warn('updateParametersAfterConnection not available');
                                    }
                                } else {
                                    // Use standard update for other node types
                                    if (window.updateParametersAfterConnection) {
                                        window.updateParametersAfterConnection(nodeId, targetId);
                                    } else {
                                        // Otherwise, manually update the target node
                                        updateNodeDisplay(targetNode, targetConfig);
                                    }
                                }
                            } else {
                                console.log(`Preserving manual output shape for node ${targetId}:`, targetConfig.outputShape);
                                
                                // Still update parameters even if output shape is manual
                                if (window.neuralNetwork && window.neuralNetwork.calculateParameters) {
                                    try {
                                        const parameters = window.neuralNetwork.calculateParameters(targetConfig, targetType);
                                        if (parameters !== undefined) {
                                            targetConfig.parameters = parameters;
                                            
                                            // Update parameters display
                                            const paramsDisplay = targetNode.querySelector('.node-parameters');
                                            if (paramsDisplay) {
                                                paramsDisplay.textContent = `Params: ${formatNumber(parameters)}`;
                                            }
                                        }
                                    } catch (error) {
                                        console.error(`Error calculating parameters with manual shape:`, error);
                                    }
                                }
                            }
                            
                            // Store updated config back to the node
                            targetNode.layerConfig = targetConfig;
                            
                            // Continue propagation down the network
                            updateDownstreamNodes(targetId);
                        } else {
                            console.warn(`Source node ${nodeId} has no output shape, cannot update target ${targetId}`);
                        }
                    });
                }
                
                // Update node's display without trigger events that would cause loops
                function updateNodeDisplay(node, config) {
                    if (!node) return;
                    
                    const nodeType = node.getAttribute('data-type');
                    node.layerConfig = config;
                    
                    // Update input shape display
                    const inputShapeDisplay = node.querySelector('.input-shape');
                    if (inputShapeDisplay && config.inputShape) {
                        inputShapeDisplay.textContent = `[${config.inputShape.join(' × ')}]`;
                    }
                    
                    // Other updates would depend on neural network module
                    // This is just a basic update without recalculating everything
                }
                
                // Update all connections visually
                updateConnections();
                
                // Notify that network has been updated
                document.dispatchEvent(new CustomEvent('networkUpdated', {
                    detail: networkLayers
                }));
                
                console.log('Finished force updating network parameters');
            }
        };
        
        // Add global connection handlers for compatibility with existing code
        window.startConnection = startConnectionHandler;
        window.updateParametersAfterConnection = updateParametersAfterConnection;
        
        // Debugging help
        console.log('Complete drag and drop fix initialized');
        
        // Add a button to manually fix Conv2D parameters
        function addConv2DFixButton() {
            // Check if button already exists
            if (document.getElementById('fix-conv2d-button')) {
                return;
            }
            
            // Create the button
            const fixButton = document.createElement('button');
            fixButton.id = 'fix-conv2d-button';
            fixButton.textContent = 'Fix Conv2D Params';
            fixButton.title = 'Manually recalculate parameters for Conv2D nodes';
            
            // Style the button
            Object.assign(fixButton.style, {
                position: 'absolute',
                right: '10px',
                top: '10px',
                zIndex: '9999',
                padding: '5px 10px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            });
            
            // Add hover effect
            fixButton.onmouseover = function() {
                this.style.backgroundColor = '#3367d6';
            };
            fixButton.onmouseout = function() {
                this.style.backgroundColor = '#4285f4';
            };
            
            // Add click handler
            fixButton.addEventListener('click', function() {
                console.log('Manually fixing Conv2D parameters...');
                
                // Check if our helper function exists
                if (window.forceRecalculateConv2DParameters) {
                    window.forceRecalculateConv2DParameters();
                    fixButton.textContent = 'Conv2D Fixed!';
                    setTimeout(() => {
                        fixButton.textContent = 'Fix Conv2D Params';
                    }, 2000);
                } else {
                    console.error('Conv2D helper function not found');
                    alert('Conv2D helper function not found! Please refresh the page and try again.');
                }
            });
            
            // Add to body
            document.body.appendChild(fixButton);
            console.log('Added Conv2D fix button');
        }
    }
})(); 