// Direct drag fix for neural network playground
// This uses a direct implementation to bypass any issues with the existing drag code

(function() {
    console.log('Loading direct drag fix...');
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit longer to make sure other scripts have initialized
        setTimeout(initializeDragFix, 1000);
    });
    
    function initializeDragFix() {
        console.log('Initializing direct drag fix');
        
        // Track drag state
        let activeNode = null;
        let offsetX = 0;
        let offsetY = 0;
        let isDragging = false;
        
        // Get the canvas
        const canvas = document.getElementById('network-canvas');
        if (!canvas) {
            console.error('Cannot find canvas element');
            return;
        }
        
        // Function to add drag handlers to a node
        function addDragHandlers(node) {
            console.log(`Adding direct drag handlers to node: ${node.getAttribute('data-id') || 'unknown'}`);
            
            // Use mousedown event to initiate drag
            node.addEventListener('mousedown', function(e) {
                // Only handle direct clicks on the node or its title/content, not on controls or ports
                if (e.target.closest('.node-controls') || e.target.closest('.node-port')) {
                    return;
                }
                
                console.log('Direct mousedown on node', e.target);
                
                // Initialize drag
                activeNode = node;
                const rect = node.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                isDragging = true;
                
                // Add visual indication
                node.classList.add('dragging');
                document.body.classList.add('node-dragging');
                node.style.zIndex = '1000';
                
                // Prevent text selection and other default behaviors
                e.preventDefault();
            });
        }
        
        // Global mouse handlers for drag
        document.addEventListener('mousemove', function(e) {
            if (!isDragging || !activeNode) return;
            
            // Log occasionally to avoid flooding console
            if (Math.random() < 0.05) {
                console.log('%c✓ DRAGGING IS WORKING!', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
            }
            
            const canvasRect = canvas.getBoundingClientRect();
            let x = e.clientX - canvasRect.left - offsetX;
            let y = e.clientY - canvasRect.top - offsetY;
            
            // Ensure node stays within canvas
            const nodeWidth = activeNode.offsetWidth || 180;
            const nodeHeight = activeNode.offsetHeight || 120;
            
            x = Math.max(0, Math.min(canvasRect.width - nodeWidth, x));
            y = Math.max(0, Math.min(canvasRect.height - nodeHeight, y));
            
            // Move the node
            activeNode.style.left = `${x}px`;
            activeNode.style.top = `${y}px`;
            
            // Update connections if function exists
            if (window.dragDrop && typeof window.dragDrop.updateConnections === 'function') {
                const nodeId = activeNode.getAttribute('data-id');
                window.dragDrop.updateConnections(nodeId);
            }
            
            // Update data model if function exists
            if (window.updateNodePositionInModel) {
                window.updateNodePositionInModel(activeNode, x, y);
            }
        });
        
        document.addEventListener('mouseup', function() {
            if (!isDragging || !activeNode) return;
            
            console.log('Direct mouseup - ending drag');
            
            // Remove visual indication
            activeNode.classList.remove('dragging');
            document.body.classList.remove('node-dragging');
            activeNode.style.zIndex = '10';
            
            // Clean up
            isDragging = false;
            activeNode = null;
            
            // Update all connections
            if (window.dragDrop && typeof window.dragDrop.updateConnections === 'function') {
                window.dragDrop.updateConnections();
            }
            
            // Dispatch event to notify other components
            const event = new CustomEvent('nodeDragEnd');
            document.dispatchEvent(event);
        });
        
        // MutationObserver to add drag handlers to new nodes
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.classList.contains('canvas-node')) {
                            addDragHandlers(node);
                        }
                    });
                }
            });
        });
        
        // Start observing the canvas for added nodes
        observer.observe(canvas, { childList: true });
        
        // Add handlers to existing nodes
        document.querySelectorAll('.canvas-node').forEach(addDragHandlers);
        
        // Expose a helper function to update node positions in the model
        window.updateNodePositionInModel = function(node, x, y) {
            if (!window.dragDrop || !window.dragDrop.getNetworkArchitecture) return;
            
            const nodeId = node.getAttribute('data-id');
            const networkLayers = window.dragDrop.getNetworkArchitecture();
            
            const layerIndex = networkLayers.layers.findIndex(layer => layer.id === nodeId);
            if (layerIndex !== -1) {
                networkLayers.layers[layerIndex].position = { x, y };
            }
        };
        
        console.log('Direct drag fix initialized');
    }
})(); 