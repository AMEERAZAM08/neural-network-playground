// Forward Propagation Animation
document.addEventListener('DOMContentLoaded', () => {
    // Set initialization flag
    window.forwardPropInitialized = true;
    console.log('Forward propagation script initialized');
    
    // Canvas initialization function
    function initializeCanvas() {
        console.log('Initializing forward propagation canvas');
        const canvas = document.getElementById('forward-canvas');
        if (!canvas) {
            console.error('Forward propagation canvas not found!');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context for forward propagation canvas');
            return;
        }
        
        // Set canvas dimensions
        const container = canvas.parentElement;
        if (container) {
            canvas.width = container.clientWidth || 800;
            canvas.height = container.clientHeight || 400;
        } else {
            canvas.width = 800;
            canvas.height = 400;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Reset animation state and redraw
        resetAnimation();
        drawNetwork();
    }
    
    // Register the canvas initialization function with tab manager
    if (typeof window !== 'undefined') {
        window.initForwardPropCanvas = initializeCanvas;
    }
    
    // Canvas and context
    const canvas = document.getElementById('forward-canvas');
    const ctx = canvas.getContext('2d');
    
    // Control elements
    const startButton = document.getElementById('start-forward-animation');
    const pauseButton = document.getElementById('pause-forward-animation');
    const resetButton = document.getElementById('reset-forward-animation');
    const inputSelector = document.getElementById('input-selector');
    
    // Display elements
    const currentLayerText = document.getElementById('current-layer');
    const forwardDescription = document.getElementById('forward-description');
    const computationValues = document.getElementById('computation-values');
    
    // Animation state
    let animationState = {
        running: false,
        currentLayer: 0, // 0: input, 1: hidden, 2: output
        currentNeuron: -1, // -1 means all neurons in the layer are being processed
        network: null,
        animationFrameId: null,
        lastTimestamp: 0,
        speed: 3, // Speed of animation
        highlightedConnections: []
    };
    
    // Neuron states
    const INACTIVE = 0;
    const COMPUTING = 1;
    const ACTIVATED = 2;
    
    // Neural network class for visualization
    class ForwardNetwork {
        constructor() {
            // Architecture: 3 input neurons, 4 hidden neurons with ReLU, 2 output neurons with sigmoid
            this.layers = [
                { neurons: 3, activation: 'none', name: 'Input' },
                { neurons: 4, activation: 'relu', name: 'Hidden' },
                { neurons: 2, activation: 'sigmoid', name: 'Output' }
            ];
            
            // Generate random weights and biases
            this.weights = [
                this.generateRandomWeights(3, 4), // Input to Hidden
                this.generateRandomWeights(4, 2)  // Hidden to Output
            ];
            
            this.biases = [
                Array(4).fill(0).map(() => Math.random() * 0.4 - 0.2), // Hidden layer biases
                Array(2).fill(0).map(() => Math.random() * 0.4 - 0.2)  // Output layer biases
            ];
            
            // Neuron values - inputs, weighted sums (z), and activations (a)
            this.inputs = [
                [0.8, 0.2, 0.5], // Default input values
                Array(4).fill(0), // Hidden layer
                Array(2).fill(0)  // Output layer
            ];
            
            this.weightedSums = [
                Array(3).fill(0), // Input layer doesn't have weighted sums
                Array(4).fill(0), // Hidden layer weighted sums
                Array(2).fill(0)  // Output layer weighted sums
            ];
            
            this.activations = [
                Array(3).fill(0), // Input layer activations are just the inputs
                Array(4).fill(0), // Hidden layer activations
                Array(2).fill(0)  // Output layer activations
            ];
            
            // Neuron states for animation
            this.neuronStates = [
                Array(3).fill(INACTIVE), // Input layer neuron states
                Array(4).fill(INACTIVE), // Hidden layer neuron states
                Array(2).fill(INACTIVE)  // Output layer neuron states
            ];
            
            // Computation details for display
            this.currentComputation = {
                layer: 0,
                neuron: 0,
                inputs: [],
                weights: [],
                weightedSum: 0,
                bias: 0,
                activation: 0
            };
        }
        
        // Generate random weights
        generateRandomWeights(inputSize, outputSize) {
            const weights = [];
            for (let i = 0; i < inputSize * outputSize; i++) {
                weights.push(Math.random() * 0.4 - 0.2); // Random between -0.2 and 0.2
            }
            return weights;
        }
        
        // ReLU activation function
        relu(x) {
            return Math.max(0, x);
        }
        
        // Sigmoid activation function
        sigmoid(x) {
            return 1 / (1 + Math.exp(-x));
        }
        
        // Set input values
        setInputs(inputs) {
            this.inputs[0] = [...inputs];
            this.activations[0] = [...inputs]; // For input layer, activations = inputs
            
            // Reset all neuron states and other layers' values
            for (let layer = 0; layer < this.layers.length; layer++) {
                this.neuronStates[layer] = Array(this.layers[layer].neurons).fill(INACTIVE);
                
                if (layer > 0) {
                    this.inputs[layer] = Array(this.layers[layer].neurons).fill(0);
                    this.weightedSums[layer] = Array(this.layers[layer].neurons).fill(0);
                    this.activations[layer] = Array(this.layers[layer].neurons).fill(0);
                }
            }
        }
        
        // Compute a single neuron
        computeNeuron(layer, neuron) {
            if (layer === 0) {
                // Input layer neurons are already set directly
                this.neuronStates[layer][neuron] = ACTIVATED;
                return;
            }
            
            // Get inputs from previous layer
            const prevLayerActivations = this.activations[layer - 1];
            
            // Compute weighted sum
            let weightedSum = this.biases[layer - 1][neuron];
            const weights = [];
            const inputs = [];
            
            for (let i = 0; i < this.layers[layer - 1].neurons; i++) {
                const weightIdx = i * this.layers[layer].neurons + neuron;
                const weight = this.weights[layer - 1][weightIdx];
                const input = prevLayerActivations[i];
                
                weights.push(weight);
                inputs.push(input);
                weightedSum += weight * input;
            }
            
            // Store weighted sum
            this.weightedSums[layer][neuron] = weightedSum;
            
            // Apply activation function
            let activation;
            if (this.layers[layer].activation === 'relu') {
                activation = this.relu(weightedSum);
            } else if (this.layers[layer].activation === 'sigmoid') {
                activation = this.sigmoid(weightedSum);
            } else {
                activation = weightedSum; // Linear/no activation
            }
            
            // Store activation
            this.activations[layer][neuron] = activation;
            
            // Store computation details for display
            this.currentComputation = {
                layer,
                neuron,
                inputs,
                weights,
                weightedSum,
                bias: this.biases[layer - 1][neuron],
                activation
            };
            
            // Update neuron state
            this.neuronStates[layer][neuron] = ACTIVATED;
        }
        
        // Reset the network
        reset() {
            // Reset all neuron states
            for (let layer = 0; layer < this.layers.length; layer++) {
                this.neuronStates[layer] = Array(this.layers[layer].neurons).fill(INACTIVE);
                
                if (layer > 0) {
                    this.weightedSums[layer] = Array(this.layers[layer].neurons).fill(0);
                    this.activations[layer] = Array(this.layers[layer].neurons).fill(0);
                }
            }
            
            // Set input layer activations to inputs
            this.activations[0] = [...this.inputs[0]];
        }
    }
    
    // Canvas resize functionality
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Redraw if already animating
        if (animationState.network) {
            drawNetwork(animationState.network);
        }
    }
    
    // Initialize the visualization
    function initVisualization() {
        if (!canvas) return;
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Create neural network
        animationState.network = new ForwardNetwork();
        
        // Set initial inputs
        if (inputSelector) {
            const selectedInput = inputSelector.value;
            switch(selectedInput) {
                case 'sample1':
                    animationState.network.setInputs([0.8, 0.2, 0.5]);
                    break;
                case 'sample2':
                    animationState.network.setInputs([0.1, 0.9, 0.3]);
                    break;
                case 'sample3':
                    animationState.network.setInputs([0.5, 0.5, 0.5]);
                    break;
                default:
                    animationState.network.setInputs([0.8, 0.2, 0.5]);
            }
        }
        
        // Initialize neuron states for input layer
        animationState.network.neuronStates[0] = Array(animationState.network.layers[0].neurons).fill(ACTIVATED);
        
        // Draw initial state
        drawNetwork(animationState.network);
        
        // Update computation display
        updateComputationDisplay(animationState.network);
        
        // Set button states
        startButton.disabled = false;
        pauseButton.disabled = true;
        resetButton.disabled = true;
    }
    
    // Draw the network
    function drawNetwork(network) {
        if (!ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const padding = 50;
        const width = canvas.width - padding * 2;
        const height = canvas.height - padding * 2;
        
        // Calculate neuron positions
        const layers = network.layers;
        const layerPositions = [];
        
        for (let i = 0; i < layers.length; i++) {
            const layerNeurons = [];
            const x = padding + (width / (layers.length - 1)) * i;
            
            for (let j = 0; j < layers[i].neurons; j++) {
                const y = padding + (height / (layers[i].neurons + 1)) * (j + 1);
                layerNeurons.push({ x, y });
            }
            
            layerPositions.push(layerNeurons);
        }
        
        // Draw connections
        for (let layerIdx = 0; layerIdx < layers.length - 1; layerIdx++) {
            for (let i = 0; i < layers[layerIdx].neurons; i++) {
                for (let j = 0; j < layers[layerIdx + 1].neurons; j++) {
                    const weightIdx = i * layers[layerIdx + 1].neurons + j;
                    const weight = network.weights[layerIdx][weightIdx];
                    
                    // Normalize weight for visualization
                    const normalizedWeight = Math.min(Math.abs(weight) * 5, 1);
                    
                    // Check if this connection is highlighted
                    const isHighlighted = animationState.highlightedConnections.some(
                        conn => conn.layer === layerIdx && conn.from === i && conn.to === j
                    );
                    
                    // Set connection color based on state
                    let connectionColor;
                    if (isHighlighted) {
                        connectionColor = `rgba(46, 204, 113, ${normalizedWeight + 0.2})`;
                        ctx.lineWidth = 3;
                    } else if (network.neuronStates[layerIdx][i] === ACTIVATED && 
                              network.neuronStates[layerIdx + 1][j] === ACTIVATED) {
                        connectionColor = `rgba(52, 152, 219, ${normalizedWeight})`;
                        ctx.lineWidth = 2;
                    } else if (network.neuronStates[layerIdx][i] === ACTIVATED) {
                        connectionColor = `rgba(52, 152, 219, ${normalizedWeight * 0.5})`;
                        ctx.lineWidth = 1.5;
                    } else {
                        connectionColor = `rgba(200, 200, 200, ${normalizedWeight * 0.3})`;
                        ctx.lineWidth = 1;
                    }
                    
                    // Draw the connection
                    ctx.beginPath();
                    ctx.moveTo(layerPositions[layerIdx][i].x, layerPositions[layerIdx][i].y);
                    ctx.lineTo(layerPositions[layerIdx + 1][j].x, layerPositions[layerIdx + 1][j].y);
                    ctx.strokeStyle = connectionColor;
                    ctx.stroke();
                }
            }
        }
        
        // Draw neurons
        for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
            for (let i = 0; i < layers[layerIdx].neurons; i++) {
                const { x, y } = layerPositions[layerIdx][i];
                
                // Get neuron activation and state
                const activation = network.activations[layerIdx][i];
                const neuronState = network.neuronStates[layerIdx][i];
                
                // Set neuron color based on state and activation
                let neuronColor;
                if (neuronState === COMPUTING) {
                    neuronColor = 'rgba(241, 196, 15, 0.9)'; // Yellow for computing
                } else if (neuronState === ACTIVATED) {
                    neuronColor = `rgba(52, 152, 219, ${Math.min(Math.max(activation, 0.3), 0.9)})`;
                } else {
                    neuronColor = 'rgba(200, 200, 200, 0.5)'; // Grey for inactive
                }
                
                // Draw neuron
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI * 2);
                ctx.fillStyle = neuronColor;
                ctx.fill();
                ctx.strokeStyle = '#2980b9';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw neuron value
                ctx.fillStyle = '#fff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                if (layerIdx === 0 || neuronState === ACTIVATED) {
                    // Show activation for activated neurons
                    ctx.fillText(activation.toFixed(2), x, y);
                } else {
                    // Show ? for inactive neurons
                    ctx.fillText('?', x, y);
                }
                
                // Draw layer labels
                if (i === 0) {
                    ctx.fillStyle = '#333';
                    ctx.font = '14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(layers[layerIdx].name, x, y - 40);
                    
                    // Highlight current layer being processed
                    if (layerIdx === animationState.currentLayer) {
                        ctx.beginPath();
                        ctx.arc(x, y - 40, 5, 0, Math.PI * 2);
                        ctx.fillStyle = '#e74c3c';
                        ctx.fill();
                    }
                }
            }
        }
    }
    
    // Update computation display
    function updateComputationDisplay(network) {
        if (!computationValues) return;
        
        const currentLayer = animationState.currentLayer;
        const currentNeuron = animationState.currentNeuron;
        
        // Update current layer text
        if (currentLayerText) {
            currentLayerText.textContent = network.layers[currentLayer].name;
        }
        
        // Update description
        if (forwardDescription) {
            if (currentLayer === 0) {
                forwardDescription.textContent = "Input values are passed directly to the first layer.";
            } else if (currentNeuron === -1) {
                forwardDescription.textContent = `All neurons in the ${network.layers[currentLayer].name} layer compute their activations.`;
            } else {
                const activationType = network.layers[currentLayer].activation;
                forwardDescription.textContent = `Computing neuron ${currentNeuron + 1} in the ${network.layers[currentLayer].name} layer using ${activationType.toUpperCase()} activation.`;
            }
        }
        
        // Update computation values
        if (currentLayer === 0 || currentNeuron === -1) {
            // Show layer summary
            let html = '';
            
            if (currentLayer === 0) {
                html += '<div class="computation-group">Input Layer Values:</div>';
                for (let i = 0; i < network.layers[0].neurons; i++) {
                    html += `<div>Input ${i + 1}: ${network.activations[0][i].toFixed(4)}</div>`;
                }
            } else {
                html += `<div class="computation-group">${network.layers[currentLayer].name} Layer Summary:</div>`;
                for (let i = 0; i < network.layers[currentLayer].neurons; i++) {
                    const z = network.weightedSums[currentLayer][i];
                    const a = network.activations[currentLayer][i];
                    html += `<div>Neuron ${i + 1}: z = ${z.toFixed(4)}, a = ${a.toFixed(4)}</div>`;
                }
            }
            
            computationValues.innerHTML = html;
        } else {
            // Show specific neuron computation
            const comp = network.currentComputation;
            let html = `<div class="computation-group">Computation for ${network.layers[comp.layer].name} Layer, Neuron ${comp.neuron + 1}:</div>`;
            
            // Weighted sum calculation
            html += '<div class="computation-row">Weighted Sum (z) = bias';
            for (let i = 0; i < comp.inputs.length; i++) {
                html += ` + (${comp.weights[i].toFixed(3)} × ${comp.inputs[i].toFixed(3)})`;
            }
            html += `</div>`;
            html += `<div>z = ${comp.bias.toFixed(3)}`;
            for (let i = 0; i < comp.inputs.length; i++) {
                const product = comp.weights[i] * comp.inputs[i];
                html += ` + ${product.toFixed(3)}`;
            }
            html += ` = ${comp.weightedSum.toFixed(4)}</div>`;
            
            // Activation calculation
            const activationType = network.layers[comp.layer].activation;
            html += `<div class="computation-row">Activation (a) = ${activationType}(z)</div>`;
            
            if (activationType === 'relu') {
                html += `<div>a = max(0, ${comp.weightedSum.toFixed(4)}) = ${comp.activation.toFixed(4)}</div>`;
            } else if (activationType === 'sigmoid') {
                html += `<div>a = 1 / (1 + e<sup>-${comp.weightedSum.toFixed(4)}</sup>) = ${comp.activation.toFixed(4)}</div>`;
            }
            
            computationValues.innerHTML = html;
        }
    }
    
    // Animation loop
    function animate(timestamp) {
        if (!animationState.running) return;
        
        // Calculate delta time based on speed
        const deltaTime = timestamp - animationState.lastTimestamp;
        const interval = 2000 / animationState.speed; // Base interval divided by speed
        
        if (deltaTime > interval || animationState.lastTimestamp === 0) {
            animationState.lastTimestamp = timestamp;
            
            const network = animationState.network;
            const currentLayer = animationState.currentLayer;
            const currentNeuron = animationState.currentNeuron;
            
            // Clear highlighted connections
            animationState.highlightedConnections = [];
            
            if (currentLayer === 0) {
                // Move to first neuron of hidden layer
                animationState.currentLayer = 1;
                animationState.currentNeuron = 0;
                
                // Set hidden layer neuron state to computing
                network.neuronStates[1][0] = COMPUTING;
                
                // Highlight connections from input to this neuron
                for (let i = 0; i < network.layers[0].neurons; i++) {
                    animationState.highlightedConnections.push({
                        layer: 0,
                        from: i,
                        to: 0
                    });
                }
            } else {
                if (currentNeuron < network.layers[currentLayer].neurons - 1) {
                    // Compute current neuron
                    network.computeNeuron(currentLayer, currentNeuron);
                    
                    // Move to next neuron in this layer
                    animationState.currentNeuron = currentNeuron + 1;
                    
                    // Set next neuron state to computing
                    network.neuronStates[currentLayer][currentNeuron + 1] = COMPUTING;
                    
                    // Highlight connections from previous layer to next neuron
                    for (let i = 0; i < network.layers[currentLayer - 1].neurons; i++) {
                        animationState.highlightedConnections.push({
                            layer: currentLayer - 1,
                            from: i,
                            to: currentNeuron + 1
                        });
                    }
                } else {
                    // Compute last neuron in current layer
                    network.computeNeuron(currentLayer, currentNeuron);
                    
                    // Check if we've reached the output layer
                    if (currentLayer < network.layers.length - 1) {
                        // Move to first neuron of next layer
                        animationState.currentLayer = currentLayer + 1;
                        animationState.currentNeuron = 0;
                        
                        // Set next layer's first neuron state to computing
                        network.neuronStates[currentLayer + 1][0] = COMPUTING;
                        
                        // Highlight connections from current layer to next layer's first neuron
                        for (let i = 0; i < network.layers[currentLayer].neurons; i++) {
                            animationState.highlightedConnections.push({
                                layer: currentLayer,
                                from: i,
                                to: 0
                            });
                        }
                    } else {
                        // We've finished the entire forward pass
                        // Pause animation and show the complete result
                        pauseAnimation();
                        
                        // Set current layer to output layer with no specific neuron
                        animationState.currentLayer = currentLayer;
                        animationState.currentNeuron = -1;
                    }
                }
            }
            
            // Update visualization
            drawNetwork(network);
            updateComputationDisplay(network);
        }
        
        // Continue animation
        animationState.animationFrameId = requestAnimationFrame(animate);
    }
    
    // Start animation
    function startAnimation() {
        if (!animationState.running) {
            animationState.running = true;
            animationState.lastTimestamp = 0;
            animationState.animationFrameId = requestAnimationFrame(animate);
            
            startButton.disabled = true;
            pauseButton.disabled = false;
            resetButton.disabled = false;
        }
    }
    
    // Pause animation
    function pauseAnimation() {
        if (animationState.running) {
            animationState.running = false;
            if (animationState.animationFrameId) {
                cancelAnimationFrame(animationState.animationFrameId);
            }
            
            startButton.disabled = false;
            pauseButton.disabled = true;
            resetButton.disabled = false;
        }
    }
    
    // Reset animation
    function resetAnimation() {
        pauseAnimation();
        
        // Reset network state
        animationState.network.reset();
        
        // Reset animation state
        animationState.currentLayer = 0;
        animationState.currentNeuron = -1;
        animationState.highlightedConnections = [];
        
        // Mark input layer neurons as activated
        for (let i = 0; i < animationState.network.layers[0].neurons; i++) {
            animationState.network.neuronStates[0][i] = ACTIVATED;
        }
        
        // Update visualization
        drawNetwork(animationState.network);
        updateComputationDisplay(animationState.network);
        
        startButton.disabled = false;
        pauseButton.disabled = true;
        resetButton.disabled = false;
    }
    
    // Handle input selection change
    function handleInputChange() {
        if (!inputSelector || !animationState.network) return;
        
        const selectedInput = inputSelector.value;
        let newInputs;
        
        switch(selectedInput) {
            case 'sample1':
                newInputs = [0.8, 0.2, 0.5];
                break;
            case 'sample2':
                newInputs = [0.1, 0.9, 0.3];
                break;
            case 'sample3':
                newInputs = [0.5, 0.5, 0.5];
                break;
            default:
                newInputs = [0.8, 0.2, 0.5];
        }
        
        // Set new inputs and reset
        animationState.network.setInputs(newInputs);
        resetAnimation();
    }
    
    // Set up event listeners
    function setupEventListeners() {
        if (startButton) {
            startButton.addEventListener('click', startAnimation);
        }
        
        if (pauseButton) {
            pauseButton.addEventListener('click', pauseAnimation);
        }
        
        if (resetButton) {
            resetButton.addEventListener('click', resetAnimation);
        }
        
        if (inputSelector) {
            inputSelector.addEventListener('change', handleInputChange);
        }
        
        // Tab switching event from the main tab controller
        document.addEventListener('tabSwitch', (e) => {
            if (e.detail.tab === 'forward-propagation') {
                // Initialize or reset when switching to this tab
                resetAnimation();
            }
        });
    }
    
    // Initialize the visualization
    initVisualization();
    
    // Set up event listeners
    setupEventListeners();
}); 