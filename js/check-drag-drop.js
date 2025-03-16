// Check and initialize drag-drop functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if the initializeDragAndDrop function exists
    if (typeof initializeDragAndDrop === 'function') {
        console.log('Drag and Drop initialization found!');
        
        // Delay initialization to ensure everything is loaded
        setTimeout(() => {
            console.log('Initializing Drag and Drop functionality...');
            // Call the initialization function
            initializeDragAndDrop();
        }, 500);
    } else {
        console.error('ERROR: Drag and Drop initialization function not found!');
        console.log('Make sure drag-drop.js is correctly loaded before other scripts.');
    }
}); 