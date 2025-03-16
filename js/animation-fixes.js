// Animation Fixes Script - Patches common animation issues
(function() {
    console.log('Animation Fixes Script Loaded');
    
    // Wait for DOM content to be loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Applying animation fixes');
        
        // 1. Fix for missing canvas elements
        const expectedCanvases = [
            { id: 'backprop-canvas', container: '.animation-container', tab: 'backpropagation-tab' },
            { id: 'forward-canvas', container: '.forward-visualization', tab: 'forward-propagation-tab' },
            { id: 'background-canvas', container: '.background-visualization', tab: 'background-animation-tab' }
        ];
        
        expectedCanvases.forEach(canvasInfo => {
            const canvas = document.getElementById(canvasInfo.id);
            const container = document.querySelector(`#${canvasInfo.tab} ${canvasInfo.container}`);
            
            if (!canvas && container) {
                console.log(`Creating missing canvas: ${canvasInfo.id}`);
                const newCanvas = document.createElement('canvas');
                newCanvas.id = canvasInfo.id;
                newCanvas.className = 'animation-canvas';
                newCanvas.width = container.clientWidth || 800;
                newCanvas.height = container.clientHeight || 400;
                
                container.prepend(newCanvas);
                
                // Try drawing something to show the canvas is working
                const ctx = newCanvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = 'rgba(200, 200, 255, 0.3)';
                    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
                    ctx.fillStyle = '#333';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`Canvas ${canvasInfo.id} initialized`, newCanvas.width/2, newCanvas.height/2);
                }
            }
        });
        
        // 2. Fix for animation scripts not running
        // Capture tab change events and force canvas initialization
        document.addEventListener('tabSwitch', function(e) {
            const tabId = e.detail.tab;
            console.log(`Tab switch detected to: ${tabId}`);
            
            setTimeout(() => {
                // Force canvas initialization after tab switch
                switch(tabId) {
                    case 'backpropagation':
                        initBackpropCanvas();
                        break;
                    case 'forward-propagation':
                        initForwardCanvas();
                        break;
                    case 'background-animation':
                        initBackgroundCanvas();
                        break;
                }
            }, 100);
        });
        
        // Helper functions to initialize canvases if the main scripts fail
        function initBackpropCanvas() {
            const canvas = document.getElementById('backprop-canvas');
            if (!canvas) return;
            
            if (typeof window.initBackpropCanvas === 'function') {
                window.initBackpropCanvas();
            } else {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    drawPlaceholderNetwork(ctx, canvas.width, canvas.height, 'Backpropagation');
                }
            }
        }
        
        function initForwardCanvas() {
            const canvas = document.getElementById('forward-canvas');
            if (!canvas) return;
            
            if (typeof window.initForwardPropCanvas === 'function') {
                window.initForwardPropCanvas();
            } else {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    drawPlaceholderNetwork(ctx, canvas.width, canvas.height, 'Forward Propagation');
                }
            }
        }
        
        function initBackgroundCanvas() {
            const canvas = document.getElementById('background-canvas');
            if (!canvas) return;
            
            if (typeof window.initBackgroundCanvas === 'function') {
                window.initBackgroundCanvas();
            } else {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    drawPlaceholderNeurons(ctx, canvas.width, canvas.height);
                }
            }
        }
        
        // Helper drawing functions
        function drawPlaceholderNetwork(ctx, width, height, title) {
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
            
            // Add title
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(title + ' Animation', width/2, 40);
            
            // Add message
            ctx.font = '16px Arial';
            ctx.fillText('Animation placeholder - Check console for errors', width/2, height - 30);
        }
        
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
            
            // Add title
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Neural Background Animation', width/2, 40);
            
            // Add message
            ctx.font = '16px Arial';
            ctx.fillText('Animation placeholder - Check console for errors', width/2, height - 30);
        }
        
        // Initial setup - activate the currently selected tab
        const activeTabButton = document.querySelector('.tab-button.active');
        if (activeTabButton) {
            const tabId = activeTabButton.getAttribute('data-tab');
            console.log(`Initial active tab: ${tabId}`);
            
            // If the tab manager is loaded, use its function
            if (window.activateTab) {
                window.activateTab(tabId);
            } else {
                // Fallback - directly trigger the tab switch event
                document.dispatchEvent(new CustomEvent('tabSwitch', {
                    detail: { tab: tabId }
                }));
            }
        }
    });
})(); 