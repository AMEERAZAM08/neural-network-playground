// Initialize drag and drop functionality
function initializeDragAndDrop() {
    const nodeItems = document.querySelectorAll('.node-item');
    const canvas = document.getElementById('network-canvas');
    let draggedNode = null;
    let offsetX, offsetY;
    let isDragging = false;
    let isConnecting = false;
    let startNode = null;
    let connectionLine = null;
    let nodeCounter = {};
    
    // Track layers for proper architecture building
    let networkLayers = {
        layers: [],
        connections: []
    };
    
    // Add event listeners to draggable items
    nodeItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
    });
    
    // Canvas events for dropping nodes
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    
    // Handle drag start event
    function handleDragStart(e) {
        draggedNode = this;
        e.dataTransfer.setData('text/plain', this.getAttribute('data-type'));
        
        // Set a ghost image for drag (optional)
        const ghost = this.cloneNode(true);
        ghost.style.opacity = '0.5';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => {
            document.body.removeChild(ghost);
        }, 0);
    }
    
    // Handle drag over event
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
    
    // Handle drop event to create new nodes on the canvas
    function handleDrop(e) {
        e.preventDefault();
        
        // Hide the canvas hint when nodes are added
        const canvasHint = document.querySelector('.canvas-hint');
        if (canvasHint) {
            canvasHint.style.display = 'none';
        }
        
        const nodeType = e.dataTransfer.getData('text/plain');
        
        if (nodeType) {
            // Generate unique layer ID
            const layerId = window.neuralNetwork.getNextLayerId(nodeType);
            
            // Create a new node on the canvas
            const canvasNode = document.createElement('div');
            canvasNode.className = `canvas-node ${nodeType}-node`;
            canvasNode.setAttribute('data-type', nodeType);
            canvasNode.setAttribute('data-id', layerId);
            
            // Set node position
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            canvasNode.style.left = `${x}px`;
            canvasNode.style.top = `${y}px`;
            
            // Set node content based on type
            let nodeName, dimensions, units;
            
            switch(nodeType) {
                case 'input':
                    nodeName = 'Input Layer';
                    dimensions = '1 × 28 × 28';
                    break;
                case 'hidden':
                    // Customize if it's the first hidden layer
                    const hiddenCount = document.querySelectorAll('.canvas-node[data-type="hidden"]').length;
                    units = hiddenCount === 0 ? 128 : 64;
                    nodeName = `Hidden Layer ${hiddenCount + 1}`;
                    dimensions = `${units}`;
                    break;
                case 'output':
                    nodeName = 'Output Layer';
                    dimensions = '10';
                    break;
                case 'conv':
                    const convCount = document.querySelectorAll('.canvas-node[data-type="conv"]').length;
                    const filters = 32 * (convCount + 1);
                    nodeName = `Conv2D ${convCount + 1}`;
                    dimensions = `${filters} × 26 × 26`;
                    break;
                case 'pool':
                    const poolCount = document.querySelectorAll('.canvas-node[data-type="pool"]').length;
                    nodeName = `MaxPool ${poolCount + 1}`;
                    dimensions = '32 × 13 × 13';
                    break;
                default:
                    nodeName = 'Neural Node';
                    dimensions = '64';
            }
            
            canvasNode.innerHTML = `
                <div class="node-title">${nodeName}</div>
                <div class="node-id">${layerId}</div>
                <div class="node-dimensions">${dimensions}</div>
                <div class="node-port port-in"></div>
                <div class="node-port port-out"></div>
                <div class="node-controls">
                    <button class="node-edit-btn" title="Edit layer parameters"><i class="icon">⚙️</i></button>
                    <button class="node-delete-btn" title="Delete layer"><i class="icon">🗑️</i></button>
                </div>
            `;
            
            // Store dimensions for hover display
            canvasNode.setAttribute('data-dimensions', dimensions);
            canvasNode.setAttribute('data-name', nodeName);
            
            // Add to network layers
            const layerInfo = {
                id: layerId,
                type: nodeType,
                name: nodeName,
                dimensions: dimensions,
                position: { x, y }
            };
            
            networkLayers.layers.push(layerInfo);
            
            // Add to canvas
            canvas.appendChild(canvasNode);
            
            // Add events for moving nodes on the canvas
            canvasNode.addEventListener('mousedown', startDrag);
            
            // Connection handling
            const portIn = canvasNode.querySelector('.port-in');
            const portOut = canvasNode.querySelector('.port-out');
            
            portOut.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                startConnection(canvasNode, e);
            });
            
            portIn.addEventListener('mouseup', (e) => {
                e.stopPropagation();
                endConnection(canvasNode);
            });
            
            // Button event listeners
            const editBtn = canvasNode.querySelector('.node-edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openLayerEditor(canvasNode);
                });
            }
            
            const deleteBtn = canvasNode.querySelector('.node-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteNode(canvasNode);
                });
            }
            
            // Update node parameters (for sequential model validation)
            updateLayerConnectivity();
        }
    }
    
    // Start dragging an existing node on the canvas
    function startDrag(e) {
        if (isConnecting) return;
        
        // Only start drag if not clicking on buttons or ports
        if (e.target.closest('.node-controls') || e.target.closest('.node-port')) {
            return;
        }
        
        isDragging = true;
        const target = e.target.closest('.canvas-node');
        const rect = target.getBoundingClientRect();
        
        // Calculate offset
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        document.addEventListener('mousemove', dragNode);
        document.addEventListener('mouseup', stopDrag);
        
        // Reference to the dragged node
        draggedNode = target;
        
        // Make the dragged node appear on top
        draggedNode.style.zIndex = "100";
        
        // Add dragging class for visual feedback
        draggedNode.classList.add('dragging');
        
        // Prevent default behavior
        e.preventDefault();
    }
    
    // Drag node on the canvas
    function dragNode(e) {
        if (!isDragging) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        let x = e.clientX - canvasRect.left - offsetX;
        let y = e.clientY - canvasRect.top - offsetY;
        
        // Constrain to canvas
        x = Math.max(0, Math.min(canvasRect.width - draggedNode.offsetWidth, x));
        y = Math.max(0, Math.min(canvasRect.height - draggedNode.offsetHeight, y));
        
        draggedNode.style.left = `${x}px`;
        draggedNode.style.top = `${y}px`;
        
        // Update node position in network layers
        const nodeId = draggedNode.getAttribute('data-id');
        const layerIndex = networkLayers.layers.findIndex(layer => layer.id === nodeId);
        if (layerIndex !== -1) {
            networkLayers.layers[layerIndex].position = { x, y };
        }
        
        // Update connected lines if any
        updateConnections();
    }
    
    // Stop dragging
    function stopDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        document.removeEventListener('mousemove', dragNode);
        document.removeEventListener('mouseup', stopDrag);
        
        // Reset z-index and remove dragging class
        if (draggedNode) {
            draggedNode.style.zIndex = "10";
            draggedNode.classList.remove('dragging');
            
            // Trigger connections update one more time
            updateConnections();
        }
    }
    
    // Start creating a connection between nodes
    function startConnection(node, e) {
        isConnecting = true;
        startNode = node;
        
        // Create a temporary line
        connectionLine = document.createElement('div');
        connectionLine.className = 'connection temp-connection';
        
        // Get start position (center of the port)
        const portOut = node.querySelector('.port-out');
        const portRect = portOut.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        const startX = portRect.left + portRect.width / 2 - canvasRect.left;
        const startY = portRect.top + portRect.height / 2 - canvasRect.top;
        
        // Position the line
        connectionLine.style.left = `${startX}px`;
        connectionLine.style.top = `${startY}px`;
        connectionLine.style.width = '0px';
        connectionLine.style.transform = 'rotate(0deg)';
        
        // Add active class to the starting port
        portOut.classList.add('active-port');
        
        // Highlight valid target ports
        highlightValidConnectionTargets(node);
        
        canvas.appendChild(connectionLine);
        
        // Add event listeners for drawing the line
        document.addEventListener('mousemove', drawConnection);
        document.addEventListener('mouseup', cancelConnection);
        
        e.preventDefault();
    }
    
    // Highlight valid targets for connection
    function highlightValidConnectionTargets(sourceNode) {
        const sourceType = sourceNode.getAttribute('data-type');
        const sourceId = sourceNode.getAttribute('data-id');
        
        document.querySelectorAll('.canvas-node').forEach(node => {
            if (node !== sourceNode) {
                const nodeType = node.getAttribute('data-type');
                const nodeId = node.getAttribute('data-id');
                const isValidTarget = isValidConnection(sourceType, nodeType, sourceId, nodeId);
                
                const portIn = node.querySelector('.port-in');
                if (isValidTarget) {
                    portIn.classList.add('valid-target');
                } else {
                    portIn.classList.add('invalid-target');
                }
            }
        });
    }
    
    // Remove highlights from all ports
    function removePortHighlights() {
        document.querySelectorAll('.port-in, .port-out').forEach(port => {
            port.classList.remove('active-port', 'valid-target', 'invalid-target');
        });
    }
    
    // Check if a connection between two node types is valid
    function isValidConnection(sourceType, targetType, sourceId, targetId) {
        // Basic hierarchy validation
        if (sourceType === 'output' || targetType === 'input') {
            return false; // Output can't have outgoing connections, Input can't have incoming
        }
        
        // Prevent cycles
        const existingConnection = networkLayers.connections.find(
            conn => conn.target === sourceId && conn.source === targetId
        );
        if (existingConnection) {
            return false;
        }
        
        // Specific connection rules
        switch(sourceType) {
            case 'input':
                return ['hidden', 'conv'].includes(targetType);
            case 'conv':
                return ['conv', 'pool', 'hidden'].includes(targetType);
            case 'pool':
                return ['conv', 'hidden'].includes(targetType);
            case 'hidden':
                return ['hidden', 'output'].includes(targetType);
            default:
                return false;
        }
    }
    
    // Draw the connection line as mouse moves
    function drawConnection(e) {
        if (!isConnecting || !connectionLine) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const portOut = startNode.querySelector('.port-out');
        const portRect = portOut.getBoundingClientRect();
        
        // Calculate start and end points
        const startX = portRect.left + portRect.width / 2 - canvasRect.left;
        const startY = portRect.top + portRect.height / 2 - canvasRect.top;
        const endX = e.clientX - canvasRect.left;
        const endY = e.clientY - canvasRect.top;
        
        // Calculate length and angle
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
        
        // Update line
        connectionLine.style.width = `${length}px`;
        connectionLine.style.transform = `rotate(${angle}deg)`;
        
        // Highlight the port under cursor
        document.querySelectorAll('.canvas-node').forEach(node => {
            if (node !== startNode) {
                const nodeRect = node.getBoundingClientRect();
                const portIn = node.querySelector('.port-in');
                const portInRect = portIn.getBoundingClientRect();
                
                // Check if mouse is over the input port
                if (e.clientX >= portInRect.left && e.clientX <= portInRect.right &&
                    e.clientY >= portInRect.top && e.clientY <= portInRect.bottom) {
                    portIn.classList.add('port-hover');
                } else {
                    portIn.classList.remove('port-hover');
                }
            }
        });
    }
    
    // Cancel connection creation
    function cancelConnection(e) {
        if (!isConnecting) return;
        
        // Find if we're over a valid input port
        let targetNode = null;
        document.querySelectorAll('.canvas-node').forEach(node => {
            if (node !== startNode) {
                const portIn = node.querySelector('.port-in');
                const portRect = portIn.getBoundingClientRect();
                
                if (e.clientX >= portRect.left && e.clientX <= portRect.right &&
                    e.clientY >= portRect.top && e.clientY <= portRect.bottom) {
                    
                    // Check if this would be a valid connection
                    const sourceType = startNode.getAttribute('data-type');
                    const targetType = node.getAttribute('data-type');
                    const sourceId = startNode.getAttribute('data-id');
                    const targetId = node.getAttribute('data-id');
                    
                    if (isValidConnection(sourceType, targetType, sourceId, targetId)) {
                        targetNode = node;
                    }
                }
            }
        });
        
        // If we found a valid target, create the connection
        if (targetNode) {
            endConnection(targetNode);
        } else {
            // Otherwise, remove the temporary line
            if (connectionLine && connectionLine.parentNode) {
                connectionLine.parentNode.removeChild(connectionLine);
            }
        }
        
        // Remove all port highlights
        removePortHighlights();
        document.querySelectorAll('.port-hover').forEach(port => {
            port.classList.remove('port-hover');
        });
        
        // Reset variables
        isConnecting = false;
        startNode = null;
        connectionLine = null;
        
        // Remove event listeners
        document.removeEventListener('mousemove', drawConnection);
        document.removeEventListener('mouseup', cancelConnection);
    }
    
    // End creating a connection
    function endConnection(targetNode) {
        if (!isConnecting) return;
        
        // Check if a valid node port was targeted
        if (targetNode && targetNode.classList && targetNode.classList.contains('canvas-node')) {
            // Get node IDs for the connection
            const sourceId = startNode.getAttribute('data-id');
            const targetId = targetNode.getAttribute('data-id');
            
            // Check if connection already exists
            const exists = networkLayers.connections.some(conn => 
                conn.source === sourceId && conn.target === targetId
            );
            
            if (!exists) {
                // Create permanent connection
                const connection = connectionLine.cloneNode(true);
                connection.classList.remove('temp-connection');
                connection.setAttribute('data-source', sourceId);
                connection.setAttribute('data-target', targetId);
                canvas.appendChild(connection);
                
                // Add to connections array
                networkLayers.connections.push({
                    source: sourceId,
                    target: targetId,
                    sourceType: startNode.getAttribute('data-type'),
                    targetType: targetNode.getAttribute('data-type')
                });
                
                // Update parameters for model consistency
                updateLayerConnectivity();
                
                console.log(`Connected ${sourceId} to ${targetId}`);
            }
        }
        
        // Remove temporary line
        if (connectionLine && connectionLine.parentNode) {
            connectionLine.parentNode.removeChild(connectionLine);
        }
        
        // Remove port highlights
        removePortHighlights();
        
        // Reset variables
        isConnecting = false;
        startNode = null;
        connectionLine = null;
        
        // Remove event listeners
        document.removeEventListener('mousemove', drawConnection);
        document.removeEventListener('mouseup', cancelConnection);
    }
    
    // Update layer connectivity to ensure model consistency
    function updateLayerConnectivity() {
        // This is where we'd propagate input/output shapes between connected layers
        // For now we'll just highlight connected nodes
        
        // Reset all nodes
        document.querySelectorAll('.canvas-node').forEach(node => {
            node.classList.remove('connected-node');
        });
        
        // Mark all nodes that have connections
        const connectedNodeIds = new Set();
        networkLayers.connections.forEach(conn => {
            connectedNodeIds.add(conn.source);
            connectedNodeIds.add(conn.target);
        });
        
        connectedNodeIds.forEach(id => {
            const node = document.querySelector(`.canvas-node[data-id="${id}"]`);
            if (node) {
                node.classList.add('connected-node');
            }
        });
        
        // Trigger a custom event that the main script can listen for
        const event = new CustomEvent('networkUpdated', { detail: networkLayers });
        document.dispatchEvent(event);
    }
    
    // Delete a node and its connections
    function deleteNode(node) {
        if (!node) return;
        
        const nodeId = node.getAttribute('data-id');
        
        // Remove all connections to/from this node
        document.querySelectorAll(`.connection[data-source="${nodeId}"], .connection[data-target="${nodeId}"]`).forEach(conn => {
            conn.parentNode.removeChild(conn);
        });
        
        // Remove from network layers
        networkLayers.layers = networkLayers.layers.filter(layer => layer.id !== nodeId);
        networkLayers.connections = networkLayers.connections.filter(conn => 
            conn.source !== nodeId && conn.target !== nodeId
        );
        
        // Remove the node
        node.parentNode.removeChild(node);
        
        // Update layer connectivity
        updateLayerConnectivity();
    }
    
    // Open layer editor modal
    function openLayerEditor(node) {
        if (!node) return;
        
        const nodeId = node.getAttribute('data-id');
        const nodeType = node.getAttribute('data-type');
        const nodeName = node.getAttribute('data-name');
        const dimensions = node.getAttribute('data-dimensions');
        
        // Trigger custom event
        const event = new CustomEvent('openLayerEditor', { 
            detail: { id: nodeId, type: nodeType, name: nodeName, dimensions: dimensions }
        });
        document.dispatchEvent(event);
    }
    
    // Update connections when nodes are moved
    function updateConnections() {
        const connections = document.querySelectorAll('.connection');
        connections.forEach(connection => {
            const sourceId = connection.getAttribute('data-source');
            const targetId = connection.getAttribute('data-target');
            
            const sourceNode = document.querySelector(`.canvas-node[data-id="${sourceId}"]`);
            const targetNode = document.querySelector(`.canvas-node[data-id="${targetId}"]`);
            
            if (sourceNode && targetNode) {
                const sourcePort = sourceNode.querySelector('.port-out');
                const targetPort = targetNode.querySelector('.port-in');
                
                if (sourcePort && targetPort) {
                    const sourceRect = sourcePort.getBoundingClientRect();
                    const targetRect = targetPort.getBoundingClientRect();
                    const canvasRect = canvas.getBoundingClientRect();
                    
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
                // If either node is missing, remove the connection
                if (connection.parentNode) {
                    connection.parentNode.removeChild(connection);
                    
                    // Remove from the connections array
                    const connIndex = networkLayers.connections.findIndex(conn => 
                        conn.source === sourceId && conn.target === targetId
                    );
                    if (connIndex !== -1) {
                        networkLayers.connections.splice(connIndex, 1);
                    }
                }
            }
        });
    }
    
    // Get the current network architecture
    function getNetworkArchitecture() {
        return networkLayers;
    }
    
    // Clear all nodes from the canvas
    function clearAllNodes() {
        // Clear all nodes and connections
        document.querySelectorAll('.canvas-node, .connection').forEach(el => {
            el.parentNode.removeChild(el);
        });
        
        // Reset network layers
        networkLayers = {
            layers: [],
            connections: []
        };
        
        // Reset layer counter
        window.neuralNetwork.resetLayerCounter();
        
        // Show the canvas hint
        const canvasHint = document.querySelector('.canvas-hint');
        if (canvasHint) {
            canvasHint.style.display = 'block';
        }
        
        // Trigger network updated event
        const event = new CustomEvent('networkUpdated', { detail: networkLayers });
        document.dispatchEvent(event);
    }
    
    // Export functions
    window.dragDrop = {
        getNetworkArchitecture,
        clearAllNodes,
        updateConnections
    };
} 