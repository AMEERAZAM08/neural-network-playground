// Backpropagation Animation and Tab Functionality
document.addEventListener('DOMContentLoaded', () => {
    // Set initialization flag
    window.backpropInitialized = true;
    console.log('Backpropagation script initialized');
    
    // Canvas initialization function
    function initializeCanvas() {
        console.log('Initializing backpropagation canvas');
        const canvas = document.getElementById('backprop-canvas');
        if (!canvas) {
            console.error('Backpropagation canvas not found!');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context for backpropagation canvas');
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
        window.initBackpropCanvas = initializeCanvas;
    }
    
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // If switching to backpropagation tab, reset the animation
            if (tabId === 'backpropagation') {
                resetAnimation();
            }
        });
    });
    
    // Backpropagation Animation Setup
    const canvas = document.getElementById('backprop-canvas');
    const ctx = canvas.getContext('2d');
    
    // Animation control buttons
    const startButton = document.getElementById('start-animation');
    const pauseButton = document.getElementById('pause-animation');
    const resetButton = document.getElementById('reset-animation');
    const speedControl = document.getElementById('animation-speed');
    
    // Animation state
    let animationState = {
        running: false,
        currentStep: 0,
        speed: 5,
        animationFrameId: null,
        network: null,
        lastTimestamp: 0
    };
    
    // Sample neural network for demonstration
    class NeuralNetwork {
        constructor() {
            // Simple network with input, hidden and output layers
            this.layers = [
                { type: 'input', neurons: 3, activation: 'none' },
                { type: 'hidden', neurons: 4, activation: 'relu' },
                { type: 'output', neurons: 2, activation: 'sigmoid' }
            ];
            
            // Initialize weights with random values
            this.weights = [
                this.generateRandomWeights(3, 4),  // Input to Hidden
                this.generateRandomWeights(4, 2)   // Hidden to Output
            ];
            
            // Initialize biases
            this.biases = [
                Array(4).fill(0).map(() => Math.random() * 0.2 - 0.1),  // Hidden layer biases
                Array(2).fill(0).map(() => Math.random() * 0.2 - 0.1)   // Output layer biases
            ];
            
            // For animation purposes
            this.activations = [
                Array(3).fill(0),  // Input activations
                Array(4).fill(0),  // Hidden layer activations
                Array(2).fill(0)   // Output activations
            ];
            
            this.gradients = [
                Array(3 * 4).fill(0),  // Input to Hidden gradients
                Array(4 * 2).fill(0)   // Hidden to Output gradients
            ];
            
            // Expected output for the sample
            this.expectedOutput = [1, 0];
            
            // Sample input
            this.sampleInput = [0.8, 0.2, 0.5];
            
            // Error
            this.error = 0;
        }
        
        generateRandomWeights(inputSize, outputSize) {
            const weights = [];
            for (let i = 0; i < inputSize * outputSize; i++) {
                weights.push(Math.random() * 0.4 - 0.2);  // Random weights between -0.2 and 0.2
            }
            return weights;
        }
        
        // Activation functions
        relu(x) {
            return Math.max(0, x);
        }
        
        sigmoid(x) {
            return 1 / (1 + Math.exp(-x));
        }
        
        // Forward pass
        forwardPass() {
            // Set input layer activations to sample input
            this.activations[0] = [...this.sampleInput];
            
            // Calculate hidden layer activations
            for (let i = 0; i < this.layers[1].neurons; i++) {
                let sum = this.biases[0][i];
                for (let j = 0; j < this.layers[0].neurons; j++) {
                    const weightIdx = j * this.layers[1].neurons + i;
                    sum += this.activations[0][j] * this.weights[0][weightIdx];
                }
                this.activations[1][i] = this.relu(sum);
            }
            
            // Calculate output layer activations
            for (let i = 0; i < this.layers[2].neurons; i++) {
                let sum = this.biases[1][i];
                for (let j = 0; j < this.layers[1].neurons; j++) {
                    const weightIdx = j * this.layers[2].neurons + i;
                    sum += this.activations[1][j] * this.weights[1][weightIdx];
                }
                this.activations[2][i] = this.sigmoid(sum);
            }
            
            // Calculate error (mean squared error)
            this.error = 0;
            for (let i = 0; i < this.layers[2].neurons; i++) {
                const diff = this.activations[2][i] - this.expectedOutput[i];
                this.error += diff * diff;
            }
            this.error /= this.layers[2].neurons;
            
            return this.activations[2]; // Return output
        }
        
        // Calculate gradients (backward pass)
        calculateGradients() {
            // Output layer gradients
            const outputDeltas = [];
            for (let i = 0; i < this.layers[2].neurons; i++) {
                const output = this.activations[2][i];
                const target = this.expectedOutput[i];
                // Derivative of loss with respect to output * derivative of sigmoid
                outputDeltas.push((output - target) * output * (1 - output));
            }
            
            // Hidden to Output gradients
            for (let i = 0; i < this.layers[1].neurons; i++) {
                for (let j = 0; j < this.layers[2].neurons; j++) {
                    const weightIdx = i * this.layers[2].neurons + j;
                    this.gradients[1][weightIdx] = this.activations[1][i] * outputDeltas[j];
                }
            }
            
            // Hidden layer deltas
            const hiddenDeltas = Array(this.layers[1].neurons).fill(0);
            for (let i = 0; i < this.layers[1].neurons; i++) {
                let sum = 0;
                for (let j = 0; j < this.layers[2].neurons; j++) {
                    const weightIdx = i * this.layers[2].neurons + j;
                    sum += this.weights[1][weightIdx] * outputDeltas[j];
                }
                // ReLU derivative is 1 if x > 0, otherwise 0
                hiddenDeltas[i] = sum * (this.activations[1][i] > 0 ? 1 : 0);
            }
            
            // Input to Hidden gradients
            for (let i = 0; i < this.layers[0].neurons; i++) {
                for (let j = 0; j < this.layers[1].neurons; j++) {
                    const weightIdx = i * this.layers[1].neurons + j;
                    this.gradients[0][weightIdx] = this.activations[0][i] * hiddenDeltas[j];
                }
            }
            
            return this.gradients;
        }
        
        // Update weights based on gradients
        updateWeights(learningRate = 0.1) {
            // Update weights using calculated gradients
            for (let layerIdx = 0; layerIdx < this.weights.length; layerIdx++) {
                for (let i = 0; i < this.weights[layerIdx].length; i++) {
                    this.weights[layerIdx][i] -= learningRate * this.gradients[layerIdx][i];
                }
            }
            
            // Update biases (not shown in animation for simplicity)
            // In a real implementation, we would update biases too
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
    
    // Initialize animation
    function initAnimation() {
        if (!canvas) return;
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Create neural network
        animationState.network = new NeuralNetwork();
        
        // Draw initial state
        drawNetwork(animationState.network);
        
        // Update variables display
        updateVariablesDisplay(animationState.network);
        
        // Set button states
        startButton.disabled = false;
        pauseButton.disabled = true;
        resetButton.disabled = true;
    }
    
    // Draw the neural network
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
                    
                    // Map weight to opacity for visualization
                    const normalizedWeight = Math.min(Math.abs(weight) * 5, 1);
                    
                    // Set connection style based on the animation step
                    let connectionColor = '#ccc';
                    
                    if (animationState.currentStep === 1) {
                        // Forward pass: blue
                        connectionColor = `rgba(52, 152, 219, ${normalizedWeight})`;
                    } else if (animationState.currentStep === 2) {
                        // Error calculation: red
                        if (layerIdx === network.weights.length - 1) {
                            connectionColor = `rgba(231, 76, 60, ${normalizedWeight})`;
                        } else {
                            connectionColor = `rgba(52, 152, 219, ${normalizedWeight})`;
                        }
                    } else if (animationState.currentStep === 3) {
                        // Backward pass: purple
                        connectionColor = `rgba(155, 89, 182, ${normalizedWeight})`;
                    } else if (animationState.currentStep === 4) {
                        // Weight update: green
                        const gradientNormalized = Math.min(Math.abs(network.gradients[layerIdx][weightIdx]) * 20, 1);
                        connectionColor = `rgba(46, 204, 113, ${gradientNormalized})`;
                    } else {
                        // Default state: gray with weight intensity
                        connectionColor = `rgba(150, 150, 150, ${normalizedWeight})`;
                    }
                    
                    // Draw the connection
                    ctx.beginPath();
                    ctx.moveTo(layerPositions[layerIdx][i].x, layerPositions[layerIdx][i].y);
                    ctx.lineTo(layerPositions[layerIdx + 1][j].x, layerPositions[layerIdx + 1][j].y);
                    ctx.strokeStyle = connectionColor;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        }
        
        // Draw neurons
        for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
            for (let i = 0; i < layers[layerIdx].neurons; i++) {
                const { x, y } = layerPositions[layerIdx][i];
                
                // Set neuron style based on activation value
                const activation = network.activations[layerIdx][i];
                const activationColor = `rgba(52, 152, 219, ${Math.min(Math.max(activation, 0.2), 0.9)})`;
                
                // Draw neuron
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI * 2);
                ctx.fillStyle = activationColor;
                ctx.fill();
                ctx.strokeStyle = '#2980b9';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw neuron value
                ctx.fillStyle = '#fff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(activation.toFixed(2), x, y);
                
                // Draw layer labels
                if (i === 0) {
                    ctx.fillStyle = '#333';
                    ctx.font = '14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(layers[layerIdx].type.toUpperCase(), x, y - 40);
                }
            }
        }
    }
    
    // Update the variables display
    function updateVariablesDisplay(network) {
        const variablesContainer = document.getElementById('variables-container');
        if (!variablesContainer) return;
        
        let html = '';
        
        // Different display based on animation step
        switch (animationState.currentStep) {
            case 1: // Forward Pass
                html += `<div class="variable">Input: [${network.activations[0].map(v => v.toFixed(2)).join(', ')}]</div>`;
                html += `<div class="variable">Hidden: [${network.activations[1].map(v => v.toFixed(2)).join(', ')}]</div>`;
                html += `<div class="variable">Output: [${network.activations[2].map(v => v.toFixed(2)).join(', ')}]</div>`;
                break;
            case 2: // Error Calculation
                html += `<div class="variable">Prediction: [${network.activations[2].map(v => v.toFixed(2)).join(', ')}]</div>`;
                html += `<div class="variable">Target: [${network.expectedOutput.join(', ')}]</div>`;
                html += `<div class="variable">Error: ${network.error.toFixed(4)}</div>`;
                break;
            case 3: // Backward Pass
                html += `<div class="variable">Output Deltas:</div>`;
                for (let i = 0; i < network.layers[2].neurons; i++) {
                    const output = network.activations[2][i];
                    const target = network.expectedOutput[i];
                    const delta = (output - target) * output * (1 - output);
                    html += `<div class="variable">  δ${i}: ${delta.toFixed(4)}</div>`;
                }
                break;
            case 4: // Weight Updates
                html += `<div class="variable">Selected Gradients:</div>`;
                // Show just a few example gradients to avoid clutter
                for (let layerIdx = 0; layerIdx < network.gradients.length; layerIdx++) {
                    const layerName = layerIdx === 0 ? 'Input→Hidden' : 'Hidden→Output';
                    html += `<div class="variable">${layerName}:</div>`;
                    
                    // Show first few gradients as examples
                    for (let i = 0; i < Math.min(3, network.gradients[layerIdx].length); i++) {
                        html += `<div class="variable">  ∇w${i}: ${network.gradients[layerIdx][i].toFixed(4)}</div>`;
                    }
                }
                break;
            default:
                html += `<div class="variable">Click "Start Animation" to begin</div>`;
        }
        
        variablesContainer.innerHTML = html;
    }
    
    // Animation steps
    const animationSteps = [
        {
            name: 'Starting',
            description: 'Neural network in initial state. Click "Start Animation" to begin.'
        },
        {
            name: 'Forward Pass',
            description: 'Input data flows through the network to produce a prediction. Each neuron computes a weighted sum of its inputs, then applies an activation function.'
        },
        {
            name: 'Error Calculation',
            description: 'The network compares its prediction with the expected output to compute the error. This error measures how far off the prediction is.'
        },
        {
            name: 'Backward Pass',
            description: 'The error is propagated backward through the network, assigning responsibility to each weight for the prediction error.'
        },
        {
            name: 'Weight Updates',
            description: 'Weights are adjusted in proportion to their contribution to the error. Weights that contributed more to the error are adjusted more significantly.'
        }
    ];
    
    // Update step information display
    function updateStepInfo(stepIndex) {
        const stepName = document.getElementById('step-name');
        const stepDescription = document.getElementById('step-description');
        
        if (stepName && stepDescription && animationSteps[stepIndex]) {
            stepName.textContent = animationSteps[stepIndex].name;
            stepDescription.textContent = animationSteps[stepIndex].description;
        }
    }
    
    // Animation loop
    function animate(timestamp) {
        if (!animationState.running) return;
        
        // Calculate delta time for animation speed
        const deltaTime = timestamp - animationState.lastTimestamp;
        const interval = 3000 / animationState.speed; // Base interval divided by speed
        
        if (deltaTime > interval || animationState.lastTimestamp === 0) {
            animationState.lastTimestamp = timestamp;
            
            // Progress through animation steps
            if (animationState.currentStep === 0) {
                // Initial state to forward pass
                animationState.currentStep = 1;
                animationState.network.forwardPass();
            } else if (animationState.currentStep === 1) {
                // Forward pass to error calculation
                animationState.currentStep = 2;
            } else if (animationState.currentStep === 2) {
                // Error calculation to backward pass
                animationState.currentStep = 3;
                animationState.network.calculateGradients();
            } else if (animationState.currentStep === 3) {
                // Backward pass to weight updates
                animationState.currentStep = 4;
            } else if (animationState.currentStep === 4) {
                // Weight updates to new forward pass
                animationState.network.updateWeights(0.1);
                animationState.currentStep = 1;
                animationState.network.forwardPass();
            }
            
            // Update visuals
            drawNetwork(animationState.network);
            updateVariablesDisplay(animationState.network);
            updateStepInfo(animationState.currentStep);
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
        
        animationState.currentStep = 0;
        animationState.network = new NeuralNetwork();
        
        drawNetwork(animationState.network);
        updateVariablesDisplay(animationState.network);
        updateStepInfo(animationState.currentStep);
        
        startButton.disabled = false;
        pauseButton.disabled = true;
        resetButton.disabled = true;
    }
    
    // Control event listeners
    startButton.addEventListener('click', startAnimation);
    pauseButton.addEventListener('click', pauseAnimation);
    resetButton.addEventListener('click', resetAnimation);
    
    speedControl.addEventListener('input', () => {
        animationState.speed = parseInt(speedControl.value, 10);
    });
    
    // Initialize the animation
    initAnimation();
}); 