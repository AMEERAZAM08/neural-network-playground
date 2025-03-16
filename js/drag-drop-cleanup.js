// Drag and drop cleanup script
(function() {
    // Silent cleanup script - no console logs
    
    // Monitor and clean up any accidental global drag variables
    setInterval(function() {
        // Check for accidental global draggedNode variable
        if (window.draggedNode !== undefined) {
            delete window.draggedNode;
        }
        
        // Check if a drag operation was left hanging (older browsers/edge cases)
        if (document.querySelectorAll('.temp-connection').length > 0 && 
            !document.querySelector('.node-port.active-port')) {
            document.querySelectorAll('.temp-connection').forEach(el => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
        }
        
        // Remove any port highlighting if no active connection is in progress
        const activePorts = document.querySelectorAll('.active-port, .valid-target, .invalid-target, .port-hover');
        if (activePorts.length > 0 && document.querySelectorAll('.temp-connection').length === 0) {
            activePorts.forEach(port => {
                port.classList.remove('active-port', 'valid-target', 'invalid-target', 'port-hover');
            });
        }
        
        // Clean up any stray dragging classes that might be stuck
        if (!document.querySelector('.dragging')) {
            document.body.classList.remove('node-dragging');
        }
    }, 5000); // Check every 5 seconds
    
    // Add listener to clean up on page events
    ['mouseup', 'dragend'].forEach(eventName => {
        document.addEventListener(eventName, function() {
            // Delay cleanup to allow normal handlers to run first
            setTimeout(function() {
                if (window.draggedNode !== undefined) {
                    delete window.draggedNode;
                }
            }, 100);
        });
    });
    
    // Perform initial cleanup when the script loads
    document.addEventListener('DOMContentLoaded', function() {
        // Remove any dragging classes that might be present from a previous session
        document.querySelectorAll('.dragging').forEach(node => {
            node.classList.remove('dragging');
        });
        document.body.classList.remove('node-dragging');
        
        // Reset any z-index values that might be stuck
        document.querySelectorAll('.canvas-node').forEach(node => {
            node.style.zIndex = '10';
        });
    });
})(); 