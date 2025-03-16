// Tab Manager - Handles tab switching and ensures animations are properly initialized
document.addEventListener('DOMContentLoaded', () => {
    console.log('Tab Manager Initialized');
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Current active tab
    let currentTab = 'network-design'; // Default tab
    
    // Function to activate a tab
    function activateTab(tabId) {
        console.log(`Activating tab: ${tabId}`);
        currentTab = tabId;
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to the requested tab button
        const button = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (button) {
            button.classList.add('active');
        }
        
        // Add active class to the corresponding content
        const tabContent = document.getElementById(`${tabId}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // Dispatch a custom event to notify tab-specific scripts
        document.dispatchEvent(new CustomEvent('tabSwitch', {
            detail: { tab: tabId }
        }));
        
        // Initialize canvas for the appropriate tab
        initializeTabContent(tabId);
    }
    
    // Function to initialize tab content, especially canvases
    function initializeTabContent(tabId) {
        let canvas, ctx;
        
        switch(tabId) {
            case 'backpropagation':
                canvas = document.getElementById('backprop-canvas');
                if (canvas && typeof window.initBackpropCanvas === 'function') {
                    console.log('Initializing backpropagation canvas');
                    window.initBackpropCanvas();
                } else {
                    console.warn('Could not initialize backpropagation canvas');
                }
                break;
                
            case 'forward-propagation':
                canvas = document.getElementById('forward-canvas');
                if (canvas && typeof window.initForwardPropCanvas === 'function') {
                    console.log('Initializing forward propagation canvas');
                    window.initForwardPropCanvas();
                } else {
                    console.warn('Could not initialize forward propagation canvas');
                    
                    // Fallback - directly draw on canvas if found
                    if (canvas) {
                        ctx = canvas.getContext('2d');
                        if (ctx) {
                            // Set canvas size to match container
                            const container = canvas.parentElement;
                            if (container) {
                                canvas.width = container.clientWidth;
                                canvas.height = container.clientHeight;
                            } else {
                                canvas.width = 800;
                                canvas.height = 400;
                            }
                            
                            // Draw a placeholder network
                            drawPlaceholderNetwork(ctx, canvas.width, canvas.height);
                        }
                    }
                }
                break;
                
            case 'background-animation':
                canvas = document.getElementById('background-canvas');
                if (canvas && typeof window.initBackgroundCanvas === 'function') {
                    console.log('Initializing background animation canvas');
                    window.initBackgroundCanvas();
                } else {
                    console.warn('Could not initialize background animation canvas');
                    
                    // Fallback - directly draw on canvas if found
                    if (canvas) {
                        ctx = canvas.getContext('2d');
                        if (ctx) {
                            // Set canvas size to match container
                            const container = canvas.parentElement;
                            if (container) {
                                canvas.width = container.clientWidth;
                                canvas.height = container.clientHeight;
                            } else {
                                canvas.width = 800;
                                canvas.height = 400;
                            }
                            
                            // Draw a placeholder animation
                            drawPlaceholderNeurons(ctx, canvas.width, canvas.height);
                        }
                    }
                }
                break;
        }
    }
    
    // Helper function to draw a placeholder neural network
    function drawPlaceholderNetwork(ctx, width, height) {
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);
        
        // Define network layout
        const layers = [3, 4, 2]; // Input, hidden, output layers
        const neuronRadius = 20;
        const layerSpacing = width / (layers.length + 1);
        
        // Function to calculate neuron positions
        function getNeuronPosition(layerIndex, neuronIndex, totalNeurons) {
            const x = layerSpacing * (layerIndex + 1);
            const layerHeight = totalNeurons * (neuronRadius * 2 + 10);
            const startY = (height - layerHeight) / 2 + neuronRadius;
            const y = startY + neuronIndex * (neuronRadius * 2 + 10);
            return { x, y };
        }
        
        // Draw connections first (so they appear behind neurons)
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        
        // For each layer except the last
        for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex++) {
            const sourceLayer = layers[layerIndex];
            const targetLayer = layers[layerIndex + 1];
            
            // Connect each neuron in source layer to each neuron in target layer
            for (let sourceNeuron = 0; sourceNeuron < sourceLayer; sourceNeuron++) {
                const source = getNeuronPosition(layerIndex, sourceNeuron, sourceLayer);
                
                for (let targetNeuron = 0; targetNeuron < targetLayer; targetNeuron++) {
                    const target = getNeuronPosition(layerIndex + 1, targetNeuron, targetLayer);
                    
                    // Draw connection
                    ctx.beginPath();
                    ctx.moveTo(source.x, source.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.stroke();
                }
            }
        }
        
        // Draw neurons
        const layerColors = ['#6495ED', '#7B68EE', '#9370DB']; // Different color for each layer
        
        for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            const neuronsInLayer = layers[layerIndex];
            
            for (let neuronIndex = 0; neuronIndex < neuronsInLayer; neuronIndex++) {
                const { x, y } = getNeuronPosition(layerIndex, neuronIndex, neuronsInLayer);
                
                // Draw neuron circle
                ctx.beginPath();
                ctx.arc(x, y, neuronRadius, 0, Math.PI * 2);
                ctx.fillStyle = layerColors[layerIndex];
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        
        // Add text to explain placeholder
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Animation Placeholder - Check Console for Errors', width/2, height - 30);
    }
    
    // Helper function to draw placeholder neurons for background animation
    function drawPlaceholderNeurons(ctx, width, height) {
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height);
        
        // Create random neurons
        const neurons = [];
        const neuronCount = 50;
        
        for (let i = 0; i < neuronCount; i++) {
            neurons.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: 3 + Math.random() * 5,
                color: Math.random() > 0.8 ? '#6495ED' : '#aaaaaa'
            });
        }
        
        // Draw connections
        ctx.strokeStyle = 'rgba(170, 170, 170, 0.3)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < neurons.length; i++) {
            const source = neurons[i];
            
            // Connect to nearby neurons
            for (let j = i + 1; j < neurons.length; j++) {
                const target = neurons[j];
                const distance = Math.sqrt(
                    Math.pow(target.x - source.x, 2) + 
                    Math.pow(target.y - source.y, 2)
                );
                
                // Only connect neurons that are close enough
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(source.x, source.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.stroke();
                }
            }
        }
        
        // Draw neurons
        neurons.forEach(neuron => {
            ctx.beginPath();
            ctx.arc(neuron.x, neuron.y, neuron.radius, 0, Math.PI * 2);
            ctx.fillStyle = neuron.color;
            ctx.fill();
        });
        
        // Add text to explain placeholder
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Animation Placeholder - Check Console for Errors', width/2, height - 30);
    }
    
    // Add event listeners to tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            activateTab(tabId);
        });
    });
    
    // Export the activateTab function to window for access from other scripts
    window.activateTab = activateTab;
    
    // Register initialization functions that each animation script should call
    window.initBackpropCanvas = null;
    window.initForwardPropCanvas = null;
    window.initBackgroundCanvas = null;
    
    // Monitor tab visibility for better animation performance
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('Page is now visible, refreshing current tab:', currentTab);
            // Re-initialize the current tab when the page becomes visible again
            initializeTabContent(currentTab);
        }
    });
    
    // Check window resizing for canvas sizing
    window.addEventListener('resize', () => {
        console.log('Window resized, refreshing current tab:', currentTab);
        initializeTabContent(currentTab);
    });
}); 