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
    
    // Anti-duplication system
    const recentlyCreated = {
        nodeIds: new Set(),
        dragStartTime: 0,
        isDropHandled: false,
        inProgress: false,
        timestamp: 0
    };
    
    // Track layers for proper architecture building
    let networkLayers = {
        layers: [],
        connections: []
    };
    
    // Helper function to format numbers with K, M, B suffixes
    function formatNumber(num) {
        if (num === 0) return '0';
        if (!num) return 'N/A';
        
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toString();
    }
    
    // Add event listeners to draggable items with extra safety
    nodeItems.forEach(item => {
        // Clean dragstart handler with precise lifecycle
        item.addEventListener('dragstart', function(e) {
            // Clean up previous state
            recentlyCreated.isDropHandled = false;
            recentlyCreated.inProgress = true;
            recentlyCreated.dragStartTime = Date.now();
            
            const nodeType = this.getAttribute('data-type');
            
            // Persist data in multiple ways to ensure transfer
            e.dataTransfer.setData('text/plain', nodeType);
            e.dataTransfer.setData('application/x-neural-node-type', nodeType);
            
            // Extra backup properties
            try {
                e.dataTransfer.nodeType = nodeType;
                e.dataTransfer._neural_type = nodeType;
            } catch (err) {
                // Some browsers restrict properties on dataTransfer
            }
            
            draggedNode = this;
            
            // Set ghost image
            const ghost = this.cloneNode(true);
            ghost.style.opacity = '0.5';
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 0, 0);
            setTimeout(() => {
                document.body.removeChild(ghost);
            }, 0);
            
            // Event cleanup handler
            const dragEndHandler = function() {
                setTimeout(() => {
                    recentlyCreated.inProgress = false;
                    draggedNode = null;
                }, 100);
                // Remove this one-time handler
                item.removeEventListener('dragend', dragEndHandler);
            };
            
            // Add one-time dragend handler
            item.addEventListener('dragend', dragEndHandler);
        });
    });
    
    // Safe dragover handler
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
    
    // Canvas events
    canvas.addEventListener('dragover', handleDragOver);
    
    // One-time drop handler for each operation
    canvas.addEventListener('drop', function dropHandler(e) {
        e.preventDefault();
        
        // Multi-layer protection against duplicate drops
        if (recentlyCreated.isDropHandled) {
            return; // Already handled this drop
        }
        
        const now = Date.now();
        
        // Debounce protection
        if (now - recentlyCreated.timestamp < 500) {
            return;
        }
        
        // Set state to prevent multiple processing
        recentlyCreated.isDropHandled = true;
        recentlyCreated.timestamp = now;
        
        // Safety check for drag operation
        if (!recentlyCreated.inProgress || !draggedNode || !draggedNode.classList.contains('node-item')) {
            return;
        }
        
        // Try multiple ways to get the node type
        let nodeType = null;
        try {
            // Try standard method first
            nodeType = e.dataTransfer.getData('text/plain');
            
            // Try backup methods if needed
            if (!nodeType) {
                nodeType = e.dataTransfer.getData('application/x-neural-node-type');
            }
            if (!nodeType && e.dataTransfer.nodeType) {
                nodeType = e.dataTransfer.nodeType;
            }
            if (!nodeType && e.dataTransfer._neural_type) {
                nodeType = e.dataTransfer._neural_type;
            }
            if (!nodeType && draggedNode) {
                nodeType = draggedNode.getAttribute('data-type');
            }
        } catch (err) {
            // Error handling for dataTransfer access
        }
        
        if (!nodeType) {
            return;
        }
        
        // Calculate position relative to canvas
        const canvasRect = canvas.getBoundingClientRect();
        const x = e.clientX - canvasRect.left - 75;
        const y = e.clientY - canvasRect.top - 30;
        
        // Ensure position is within canvas bounds
        const posX = Math.max(0, Math.min(canvasRect.width - 150, x));
        const posY = Math.max(0, Math.min(canvasRect.height - 100, y));
        
        // Generate a unique ID for the node that includes a timestamp to avoid collision
        const layerId = `${nodeType}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        // Skip if this node ID was recently created (extremely unlikely due to timestamp)
        if (recentlyCreated.nodeIds.has(layerId)) {
            return;
        }
        recentlyCreated.nodeIds.add(layerId);
        
        // Limit the size of the recently created set
        if (recentlyCreated.nodeIds.size > 10) {
            const iterator = recentlyCreated.nodeIds.values();
            recentlyCreated.nodeIds.delete(iterator.next().value);
        }
        
        // Increment counter for this node type
        nodeCounter[nodeType] = (nodeCounter[nodeType] || 0) + 1;
        
        // Generate a unique ID for the node
        const layerId = `${nodeType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Create the node element
        const canvasNode = document.createElement('div');
        canvasNode.className = `canvas-node ${nodeType}-node`;
        canvasNode.setAttribute('data-type', nodeType);
        canvasNode.setAttribute('data-id', layerId);
        canvasNode.style.position = 'absolute';
        canvasNode.style.left = `${posX}px`;
        canvasNode.style.top = `${posY}px`;
        
        // Get default config for this node type
        const nodeConfig = window.neuralNetwork.createNodeConfig(nodeType);
        
        // Create node content with input and output shape information
        let nodeName, inputShape, outputShape, parameters;
        
        switch(nodeType) {
            case 'input':
                nodeName = 'Input Layer';
                inputShape = 'N/A';
                outputShape = '[' + nodeConfig.shape.join(' × ') + ']';
                parameters = nodeConfig.parameters;
                break;
            case 'hidden':
                const hiddenCount = document.querySelectorAll('.canvas-node[data-type="hidden"]').length;
                nodeConfig.units = hiddenCount === 0 ? 128 : 64;
                nodeName = `Hidden Layer ${hiddenCount + 1}`;
                // Input shape will be updated when connections are made
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
                const convCount = document.querySelectorAll('.canvas-node[data-type="conv"]').length;
                nodeConfig.filters = 32 * (convCount + 1);
                nodeName = `Conv2D ${convCount + 1}`;
                inputShape = 'Connect input';
                outputShape = 'Depends on input';
                // Create parameter string
                parameters = `Kernel: ${nodeConfig.kernelSize.join('×')}\nStride: ${nodeConfig.strides.join('×')}\nPadding: ${nodeConfig.padding}`;
                break;
            case 'pool':
                const poolCount = document.querySelectorAll('.canvas-node[data-type="pool"]').length;
                nodeName = `Pooling ${poolCount + 1}`;
                inputShape = 'Connect input';
                outputShape = 'Depends on input';
                parameters = `Pool size: ${nodeConfig.poolSize.join('×')}\nStride: ${nodeConfig.strides.join('×')}\nPadding: ${nodeConfig.padding}`;
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
        
        // Add shape information in a structured way
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
        
        // Add dimensions section to show shapes compactly
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
            case 'linear':
                dimensionsText = `${nodeConfig.inputFeatures} → ${nodeConfig.outputFeatures}`;
                break;
        }
        dimensionsSection.textContent = dimensionsText;
        
        // Add node title for clearer identification
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
        
        // Assemble the node with the new structure
        canvasNode.appendChild(nodeTitle);
        canvasNode.appendChild(nodeControls);
        canvasNode.appendChild(dimensionsSection);
        canvasNode.appendChild(nodeContent);
        canvasNode.appendChild(portIn);
        canvasNode.appendChild(portOut);
        
        // Store node data attributes for easier access
        canvasNode.setAttribute('data-name', nodeName);
        canvasNode.setAttribute('data-dimensions', dimensionsText);
        
        // Add node to the canvas
        canvas.appendChild(canvasNode);
        
        // Store node configuration
        canvasNode.layerConfig = nodeConfig;
        
        // Add event listeners for node manipulation
        canvasNode.addEventListener('mousedown', startDrag);
        
        // Update port event listeners for the new class names
        portIn.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        portOut.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            startConnection(canvasNode, e);
        });
        
        // Double-click to edit node properties
        canvasNode.addEventListener('dblclick', () => {
            openLayerEditor(canvasNode);
        });
        
        // Right-click to delete
        canvasNode.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            deleteNode(canvasNode);
        });
        
        // Add click event for edit button
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            openLayerEditor(canvasNode);
        });
        
        // Add click event for delete button
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNode(canvasNode);
        });
        
        // Add to network layers for architecture building
        networkLayers.layers.push({
            id: layerId,
            type: nodeType,
            name: nodeName,
            position: { x: posX, y: posY },
            dimensions: dimensionsText,
            config: nodeConfig,
            parameters: nodeConfig.parameters || 0
        });
        
        // Notify about network changes
        document.dispatchEvent(new CustomEvent('networkUpdated', {
            detail: networkLayers
        }));
        
        updateConnections();
        
        // Hide the canvas hint after adding a node
        const canvasHint = document.querySelector('.canvas-hint');
        if (canvasHint) {
            canvasHint.style.display = 'none';
        }
        
        // Reset states and references
        draggedNode = null;
        recentlyCreated.inProgress = false;
        
        // Force cleanup any stray global variables after a short delay
        setTimeout(() => {
            if (window.draggedNode) {
                delete window.draggedNode;
            }
            recentlyCreated.isDropHandled = false;
        }, 100);
    }
    
    // Delete a node and its associated connections
    function deleteNode(node) {
        if (!node) return;
        
        const nodeId = node.getAttribute('data-id');
        
        // Remove all connections to/from this node
        const connections = document.querySelectorAll(`.connection[data-source="${nodeId}"], .connection[data-target="${nodeId}"]`);
        
        connections.forEach(connection => {
            if (connection.parentNode) {
                connection.parentNode.removeChild(connection);
            }
        });
        
        // Remove from networkLayers.connections
        networkLayers.connections = networkLayers.connections.filter(conn => 
            conn.source !== nodeId && conn.target !== nodeId
        );
        
        // Remove from networkLayers.layers
        const layerIndex = networkLayers.layers.findIndex(layer => layer.id === nodeId);
        if (layerIndex !== -1) {
            networkLayers.layers.splice(layerIndex, 1);
        }
        
        // Remove the node from the DOM
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        
        // Show the canvas hint if no nodes left
        if (document.querySelectorAll('.canvas-node').length === 0) {
            const canvasHint = document.querySelector('.canvas-hint');
            if (canvasHint) {
                canvasHint.style.display = 'block';
            }
        }
        
        // Update connections to remove orphaned ones
        updateConnections();
        
        // Notify about network changes
        document.dispatchEvent(new CustomEvent('networkUpdated', {
            detail: networkLayers
        }));
    }
    
    // Start dragging an existing node on the canvas
    function startDrag(e) {
        console.log('[DEBUG] startDrag called', e.target);
        
        if (isConnecting) return;
        
        // Only start drag if not clicking on buttons or ports
        if (e.target.closest('.node-controls') || e.target.closest('.node-port')) {
            return;
        }
        
        isDragging = true;
        // Make sure we get the canvas-node, even if we clicked on a child element
        const target = e.target.closest('.canvas-node');
        if (!target) {
            console.error('[ERROR] No canvas-node found in startDrag');
            return;
        }
        
        const rect = target.getBoundingClientRect();
        
        // Calculate offset
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Add event listeners to document, not the element
        document.addEventListener('mousemove', dragNode);
        document.addEventListener('mouseup', stopDrag);
        
        // Reference to the dragged node
        draggedNode = target;
        
        // Make the dragged node appear on top
        draggedNode.style.zIndex = "100";
        
        // Add dragging class for visual feedback
        draggedNode.classList.add('dragging');
        
        // Add dragging class to body for consistent cursor
        document.body.classList.add('node-dragging');
        
        // Prevent default behavior
        e.preventDefault();
        
        console.log(`[DEBUG] Started dragging node: ${target.getAttribute('data-id')}`);
    }
    
    // Drag node on the canvas
    function dragNode(e) {
        if (!isDragging || !draggedNode) {
            console.log('[WARN] dragNode called but not in dragging state');
            return;
        }
        
        const canvasRect = canvas.getBoundingClientRect();
        let x = e.clientX - canvasRect.left - offsetX;
        let y = e.clientY - canvasRect.top - offsetY;
        
        // Constrain to canvas with better boundary checks
        const nodeWidth = draggedNode.offsetWidth || 150; // Default width if not set
        const nodeHeight = draggedNode.offsetHeight || 100; // Default height if not set
        
        // Ensure the node stays completely within the canvas
        x = Math.max(0, Math.min(canvasRect.width - nodeWidth, x));
        y = Math.max(0, Math.min(canvasRect.height - nodeHeight, y));
        
        // Apply position with fixed sizing to prevent layout expansion
        draggedNode.style.position = 'absolute';
        draggedNode.style.left = `${x}px`;
        draggedNode.style.top = `${y}px`;
        draggedNode.style.width = `${nodeWidth}px`; // Maintain fixed width
        
        // Update node position in network layers
        const nodeId = draggedNode.getAttribute('data-id');
        const layerIndex = networkLayers.layers.findIndex(layer => layer.id === nodeId);
        if (layerIndex !== -1) {
            networkLayers.layers[layerIndex].position = { x, y };
        }
        
        // Force update all connections immediately to make them responsive
        updateConnections();
    }
    
    // Stop dragging
    function stopDrag(e) {
        if (!isDragging) {
            return;
        }
        
        console.log('[DEBUG] stopDrag called');
        
        // Always clean up event listeners
        document.removeEventListener('mousemove', dragNode);
        document.removeEventListener('mouseup', stopDrag);
        
        isDragging = false;
        
        // Remove dragging class from body
        document.body.classList.remove('node-dragging');
        
        // Reset z-index and remove dragging class if node exists
        if (draggedNode) {
            draggedNode.style.zIndex = "10";
            draggedNode.classList.remove('dragging');
            
            // Trigger connections update one more time
            updateConnections();
            
            // Clear the reference
            const nodeId = draggedNode.getAttribute('data-id');
            console.log(`[DEBUG] Stopped dragging node: ${nodeId}`);
            draggedNode = null;
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
        const portOut = node.querySelector('.node-port.port-out');
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
                
                const portIn = node.querySelector('.node-port.port-in');
                if (portIn) {
                    if (isValidTarget) {
                        portIn.classList.add('valid-target');
                    } else {
                        portIn.classList.add('invalid-target');
                    }
                }
            }
        });
    }
    
    // Remove highlights from all ports
    function removePortHighlights() {
        document.querySelectorAll('.node-port.port-in, .node-port.port-out').forEach(port => {
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
        const portOut = startNode.querySelector('.node-port.port-out');
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
                const portIn = node.querySelector('.node-port.port-in');
                if (portIn) {
                    const portInRect = portIn.getBoundingClientRect();
                    
                    // Check if mouse is over the input port
                    if (e.clientX >= portInRect.left && e.clientX <= portInRect.right &&
                        e.clientY >= portInRect.top && e.clientY <= portInRect.bottom) {
                        portIn.classList.add('port-hover');
                    } else {
                        portIn.classList.remove('port-hover');
                    }
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
                const portIn = node.querySelector('.node-port.port-in');
                if (portIn) {
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
        document.querySelectorAll('.node-port').forEach(port => {
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
        if (!isConnecting || !connectionLine || !startNode) return;
        
        const sourceType = startNode.getAttribute('data-type');
        const targetType = targetNode.getAttribute('data-type');
        const sourceId = startNode.getAttribute('data-id');
        const targetId = targetNode.getAttribute('data-id');
        
        // Check if this is a valid connection
        if (isValidConnection(sourceType, targetType, sourceId, targetId)) {
            // Remove the temporary line
            if (connectionLine && connectionLine.parentNode) {
                connectionLine.parentNode.removeChild(connectionLine);
            }
            
            // Create a permanent connection line
            const connection = document.createElement('div');
            connection.className = 'connection';
            connection.setAttribute('data-source', sourceId);
            connection.setAttribute('data-target', targetId);
            
            // Add to canvas
            canvas.appendChild(connection);
            
            // Position the connection
            const sourcePort = startNode.querySelector('.node-port.port-out');
            const targetPort = targetNode.querySelector('.node-port.port-in');
            
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
            
            // Update network layers
            const sourceLayerIndex = networkLayers.layers.findIndex(layer => layer.id === sourceId);
            const targetLayerIndex = networkLayers.layers.findIndex(layer => layer.id === targetId);
            
            if (sourceLayerIndex !== -1 && targetLayerIndex !== -1) {
                networkLayers.connections.push({
                    source: sourceId,
                    target: targetId
                });
                
                // Initialize connections array if it doesn't exist
                if (!networkLayers.layers[sourceLayerIndex].connections) {
                    networkLayers.layers[sourceLayerIndex].connections = [];
                }
                if (!networkLayers.layers[targetLayerIndex].connections) {
                    networkLayers.layers[targetLayerIndex].connections = [];
                }
                
                // Add connection to layers
                networkLayers.layers[sourceLayerIndex].connections.push(targetId);
                networkLayers.layers[targetLayerIndex].connections.push(sourceId);
                
                // Update target node using the source node's configuration
                const sourceConfig = networkLayers.layers[sourceLayerIndex].config;
                
                if (sourceConfig && sourceConfig.outputShape) {
                    // Update target node with source's output shape
                    if (!targetNode.layerConfig) {
                        targetNode.layerConfig = {};
                    }
                    
                    // Set input shape of target to output shape of source
                    targetNode.layerConfig.inputShape = [...sourceConfig.outputShape];
                    
                    // Update parameters using our helper function
                    updateNodeParameters(targetNode, targetType, sourceConfig);
                    
                    // Recursively update downstream nodes
                    updateDownstreamNodes(targetId);
                    
                    // Force update all parameters in the network for complete synchronization
                    forceUpdateNetworkParameters();
                }
            }
            
            // Notify about network changes
            document.dispatchEvent(new CustomEvent('networkUpdated', {
                detail: networkLayers
            }));
        }
        
        // Reset variables
        isConnecting = false;
        startNode = null;
        connectionLine = null;
        
        // Remove event listeners
        document.removeEventListener('mousemove', drawConnection);
        document.removeEventListener('mouseup', cancelConnection);
    }
    
    // Update connections when nodes are moved
    function updateConnections(specificNodeId = null) {
        console.log(`[DEBUG] updateConnections called ${specificNodeId ? 'for node: ' + specificNodeId : 'for all connections'}`);
        
        // Get all connections or just those related to the specified node
        let connections;
        if (specificNodeId) {
            connections = document.querySelectorAll(`.connection[data-source="${specificNodeId}"], .connection[data-target="${specificNodeId}"]`);
        } else {
            connections = document.querySelectorAll('.connection:not(.temp-connection)');
        }
        
        console.log(`[DEBUG] Updating ${connections.length} connections`);
        
        connections.forEach(connection => {
            const sourceId = connection.getAttribute('data-source');
            const targetId = connection.getAttribute('data-target');
            
            const sourceNode = document.querySelector(`.canvas-node[data-id="${sourceId}"]`);
            const targetNode = document.querySelector(`.canvas-node[data-id="${targetId}"]`);
            
            if (sourceNode && targetNode) {
                const sourcePort = sourceNode.querySelector('.node-port.port-out');
                const targetPort = targetNode.querySelector('.node-port.port-in');
                
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
                // If either node is missing, remove the connection
                if (connection.parentNode) {
                    console.log(`[DEBUG] Removing orphaned connection between ${sourceId} and ${targetId}`);
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
    
    // Helper function to update a node's parameters and display
    function updateNodeParameters(node, nodeType, sourceConfig) {
        if (!node || !nodeType || !sourceConfig) return;
        
        const nodeId = node.getAttribute('data-id');
        
        // Ensure node's layerConfig exists
        if (!node.layerConfig) {
            node.layerConfig = {};
        }
        
        // Ensure input shape is set in the layer config
        if (sourceConfig.outputShape) {
            node.layerConfig.inputShape = [...sourceConfig.outputShape];
            
            // For specific layer types, calculate output shape based on input shape
            switch(nodeType) {
                case 'hidden':
                    node.layerConfig.outputShape = [node.layerConfig.units];
                    break;
                case 'output':
                    node.layerConfig.outputShape = [node.layerConfig.units];
                    break;
                case 'conv':
                    // Call neural network module to calculate output shape
                    if (window.neuralNetwork && window.neuralNetwork.calculateOutputShape) {
                        node.layerConfig.outputShape = window.neuralNetwork.calculateOutputShape(
                            'conv',
                            node.layerConfig.inputShape,
                            node.layerConfig
                        );
                    }
                    break;
                case 'pool':
                    // Call neural network module to calculate output shape
                    if (window.neuralNetwork && window.neuralNetwork.calculateOutputShape) {
                        node.layerConfig.outputShape = window.neuralNetwork.calculateOutputShape(
                            'pool',
                            node.layerConfig.inputShape,
                            node.layerConfig
                        );
                    }
                    break;
            }
        }
        
        // Calculate parameters using the neural network module
        let newParams = 0;
        
        if (window.neuralNetwork && window.neuralNetwork.calculateParameters) {
            newParams = window.neuralNetwork.calculateParameters(
                nodeType,
                node.layerConfig,
                sourceConfig
            );
        } else {
            // Fallback parameter calculation if neuralNetwork module is not available
            switch(nodeType) {
                case 'hidden':
                    if (node.layerConfig.inputShape && node.layerConfig.units) {
                        // Parameters = (input_size * units) + units (weights + biases)
                        const inputSize = node.layerConfig.inputShape[0];
                        newParams = (inputSize * node.layerConfig.units) + node.layerConfig.units;
                    }
                    break;
                case 'output':
                    if (node.layerConfig.inputShape && node.layerConfig.units) {
                        // Parameters = (input_size * units) + units (weights + biases)
                        const inputSize = node.layerConfig.inputShape[0];
                        newParams = (inputSize * node.layerConfig.units) + node.layerConfig.units;
                    }
                    break;
                case 'conv':
                    if (node.layerConfig.inputShape && node.layerConfig.filters && node.layerConfig.kernelSize) {
                        // Parameters = (kernel_height * kernel_width * input_channels * filters) + filters
                        const inputChannels = node.layerConfig.inputShape.length > 2 ? node.layerConfig.inputShape[2] : 1;
                        newParams = (node.layerConfig.kernelSize[0] * node.layerConfig.kernelSize[1] * 
                                     inputChannels * node.layerConfig.filters) + node.layerConfig.filters;
                    }
                    break;
                case 'pool':
                    // Pooling layers don't have trainable parameters
                    newParams = 0;
                    break;
            }
        }
        
        // Update parameter count in both the node object and network model
        if (newParams !== undefined) {
            // Update the node object
            node.layerConfig.parameters = newParams;
            
            // Update the network model
            const layerIndex = networkLayers.layers.findIndex(layer => layer.id === nodeId);
            if (layerIndex !== -1) {
                networkLayers.layers[layerIndex].parameters = newParams;
                if (networkLayers.layers[layerIndex].config) {
                    networkLayers.layers[layerIndex].config.parameters = newParams;
                    
                    // Also update output shape in model
                    if (node.layerConfig.outputShape) {
                        networkLayers.layers[layerIndex].config.outputShape = [...node.layerConfig.outputShape];
                    }
                }
            }
            
            // Force update the display
            const paramsDisplay = node.querySelector('.node-parameters');
            if (paramsDisplay) {
                paramsDisplay.textContent = `Params: ${formatNumber(newParams)}`;
            }
        }
        
        // Update input shape display
        if (node.layerConfig.inputShape) {
            const inputShapeDisplay = node.querySelector('.input-shape');
            if (inputShapeDisplay) {
                inputShapeDisplay.textContent = `[${node.layerConfig.inputShape.join(' × ')}]`;
            }
        }
        
        // Update output shape display
        if (node.layerConfig.outputShape) {
            const outputShapeDisplay = node.querySelector('.output-shape');
            if (outputShapeDisplay) {
                outputShapeDisplay.textContent = `[${node.layerConfig.outputShape.join(' × ')}]`;
            }
        }
        
        // Update the dimensions display
        updateNodeDimensions(node);
        
        // Force a rerender of this node to ensure all changes are displayed
        setTimeout(() => {
            // Minimal DOM update to force re-rendering
            const originalDisplay = node.style.display;
            node.style.display = 'none';
            // Force reflow
            void node.offsetHeight;
            node.style.display = originalDisplay;
        }, 10);
    }
    
    // Update node dimensions display
    function updateNodeDimensions(node) {
        if (!node || !node.layerConfig) return;
        
        const nodeType = node.getAttribute('data-type');
        const dimensionsSection = node.querySelector('.node-dimensions');
        if (!dimensionsSection) return;
        
        let dimensionsText = '';
        
        // Generate appropriate dimensions text based on node type
        switch (nodeType) {
            case 'input':
                if (node.layerConfig.shape) {
                    dimensionsText = node.layerConfig.shape.join(' × ');
                }
                break;
            case 'hidden':
            case 'output':
                dimensionsText = node.layerConfig.units ? node.layerConfig.units.toString() : '?';
                break;
            case 'conv':
                if (node.layerConfig.inputShape && node.layerConfig.outputShape) {
                    dimensionsText = `${node.layerConfig.inputShape.join('×')} → ${node.layerConfig.outputShape.join('×')}`;
                } else if (node.layerConfig.filters) {
                    dimensionsText = `? → ${node.layerConfig.filters} filters`;
                }
                break;
            case 'pool':
                if (node.layerConfig.inputShape && node.layerConfig.outputShape) {
                    dimensionsText = `${node.layerConfig.inputShape.join('×')} → ${node.layerConfig.outputShape.join('×')}`;
                } else {
                    dimensionsText = `? → ?`;
                }
                break;
            case 'linear':
                if (node.layerConfig.inputFeatures && node.layerConfig.outputFeatures) {
                    dimensionsText = `${node.layerConfig.inputFeatures} → ${node.layerConfig.outputFeatures}`;
                }
                break;
        }
        
        if (dimensionsText) {
            dimensionsSection.textContent = dimensionsText;
            node.setAttribute('data-dimensions', dimensionsText);
        }
    }
    
    // Recursively update nodes downstream from the given node ID
    function updateDownstreamNodes(nodeId) {
        // Get all connections that start from this node
        const outgoingConnections = networkLayers.connections.filter(conn => conn.source === nodeId);
        
        outgoingConnections.forEach(conn => {
            const targetId = conn.target;
            const targetNode = document.querySelector(`.canvas-node[data-id="${targetId}"]`);
            const sourceNode = document.querySelector(`.canvas-node[data-id="${nodeId}"]`);
            
            if (targetNode && sourceNode) {
                const targetType = targetNode.getAttribute('data-type');
                const sourceType = sourceNode.getAttribute('data-type');
                
                // Skip if source or target type is invalid
                if (!targetType || !sourceType) return;
                
                // Find the indices in the layers array
                const sourceIndex = networkLayers.layers.findIndex(layer => layer.id === nodeId);
                const targetIndex = networkLayers.layers.findIndex(layer => layer.id === targetId);
                
                if (sourceIndex !== -1 && targetIndex !== -1) {
                    const sourceConfig = networkLayers.layers[sourceIndex].config;
                    
                    // Update the target node with the source's output shape
                    if (sourceConfig && sourceConfig.outputShape) {
                        // Set input shape of target
                        if (!targetNode.layerConfig) {
                            targetNode.layerConfig = {};
                        }
                        
                        targetNode.layerConfig.inputShape = [...sourceConfig.outputShape];
                        networkLayers.layers[targetIndex].config.inputShape = [...sourceConfig.outputShape];
                        
                        // Update parameters
                        updateNodeParameters(targetNode, targetType, sourceConfig);
                        
                        // Continue updating downstream
                        updateDownstreamNodes(targetId);
                    }
                }
            }
        });
    }
    
    // Force update all network connections and parameters
    function forceUpdateNetworkParameters() {
        // First, identify root nodes (nodes with no incoming connections)
        const targetIds = new Set(networkLayers.connections.map(conn => conn.target));
        const rootNodeIds = networkLayers.layers
            .filter(layer => !targetIds.has(layer.id))
            .map(layer => layer.id);
        
        // Update from each root node
        rootNodeIds.forEach(nodeId => {
            updateDownstreamNodes(nodeId);
        });
        
        // After updating all parameters, notify about the network changes
        document.dispatchEvent(new CustomEvent('networkUpdated', {
            detail: networkLayers
        }));
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
    
    // Open layer editor modal
    function openLayerEditor(node) {
        if (!node) return;
        
        const nodeId = node.getAttribute('data-id');
        const nodeType = node.getAttribute('data-type');
        const nodeName = node.getAttribute('data-name');
        const dimensions = node.getAttribute('data-dimensions');
        
        // Trigger custom event with the node object
        const event = new CustomEvent('openLayerEditor', { 
            detail: { 
                id: nodeId, 
                type: nodeType, 
                name: nodeName, 
                dimensions: dimensions,
                node: node  // Pass the node object
            }
        });
        document.dispatchEvent(event);
    }
    
    // Create SVG container for connections
    function createSVGContainer() {
        const svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgContainer.classList.add('svg-container');
        svgContainer.style.position = 'absolute';
        svgContainer.style.top = '0';
        svgContainer.style.left = '0';
        svgContainer.style.width = '100%';
        svgContainer.style.height = '100%';
        svgContainer.style.pointerEvents = 'none';
        svgContainer.style.zIndex = '5';
        canvas.appendChild(svgContainer);
        return svgContainer;
    }
    
    // Export functions
    window.dragDrop = {
        getNetworkArchitecture,
        clearAllNodes,
        updateConnections
    };
    
    // Expose the drag functions to the window for debugging
    window.startDrag = startDrag;
    window.dragNode = dragNode;
    window.stopDrag = stopDrag;
    window.deleteNode = deleteNode;
}