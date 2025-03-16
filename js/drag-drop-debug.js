// Drag and drop debugging script
(function() {
    console.log('Drag and Drop Debug Tool Loaded');
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM Content Loaded - Attaching Debug Handlers');
        setTimeout(setupDebugHandlers, 1000); // Give time for other scripts to initialize
    });
    
    function setupDebugHandlers() {
        console.log('Setting up drag-drop debug handlers');
        
        // Debug canvas events
        const canvas = document.getElementById('network-canvas');
        if (!canvas) {
            console.error('ERROR: Canvas element not found!');
            return;
        }
        
        // Debug existing nodes
        const existingNodes = document.querySelectorAll('.canvas-node');
        console.log(`Found ${existingNodes.length} existing nodes on the canvas`);
        
        existingNodes.forEach((node, index) => {
            const nodeId = node.getAttribute('data-id') || `unknown-${index}`;
            const nodeType = node.getAttribute('data-type') || 'unknown';
            console.log(`Node #${index}: ${nodeType} (${nodeId})`);
            
            // Add debug mousedown listener
            node.addEventListener('mousedown', function(e) {
                console.log(`[DEBUG] Mousedown on node: ${nodeId}`);
                console.log(`Target element: ${e.target.className}`);
                console.log(`Target has controls? ${!!e.target.closest('.node-controls')}`);
                console.log(`Target has port? ${!!e.target.closest('.node-port')}`);
            });
        });
        
        // Monitor mouse events over the canvas
        canvas.addEventListener('mousemove', function(e) {
            // Only log occasionally to avoid flooding console
            if (Math.random() < 0.01) { // Log approximately 1% of moves
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                console.log(`[DEBUG] Mouse at (${Math.round(x)}, ${Math.round(y)})`);
                
                // Check for drag states
                const dragInProgress = document.querySelector('.canvas-node.dragging');
                if (dragInProgress) {
                    console.log(`[DEBUG] Dragging node: ${dragInProgress.getAttribute('data-id')}`);
                }
            }
        });
        
        // Monitor startDrag and dragNode functions if they exist
        if (window.startDrag) {
            const originalStartDrag = window.startDrag;
            window.startDrag = function(e) {
                console.log('[DEBUG] startDrag called', e.target);
                return originalStartDrag.apply(this, arguments);
            };
        }
        
        if (window.dragNode) {
            const originalDragNode = window.dragNode;
            window.dragNode = function(e) {
                // Log only occasionally
                if (Math.random() < 0.05) {
                    console.log('[DEBUG] dragNode called');
                }
                return originalDragNode.apply(this, arguments);
            };
        }
        
        // Check for global variables that might be interfering
        setInterval(function() {
            console.log('Checking global drag variables:');
            console.log('window.draggedNode:', window.draggedNode !== undefined);
            console.log('window.isDragging:', window.isDragging !== undefined);
            
            // Count nodes with dragging class
            const draggingNodes = document.querySelectorAll('.canvas-node.dragging');
            if (draggingNodes.length > 0) {
                console.log(`[WARNING] Found ${draggingNodes.length} nodes with dragging class, but no active drag`);
            }
        }, 5000);
        
        console.log('Debug handlers setup complete');
    }
})(); 