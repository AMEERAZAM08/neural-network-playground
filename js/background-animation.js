// Neural Network Background Animation
document.addEventListener('DOMContentLoaded', () => {
    // Set initialization flag
    window.backgroundAnimationInitialized = true;
    console.log('Background animation script initialized');

    // Canvas initialization function
    function initializeCanvas() {
        console.log('Initializing background animation canvas');
        const canvas = document.getElementById('background-canvas');
        if (!canvas) {
            console.error('Background animation canvas not found!');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2D context for background animation canvas');
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
        updateCanvas(); // Initial draw
    }
    
    // Register the canvas initialization function with tab manager
    if (typeof window !== 'undefined') {
        window.initBackgroundCanvas = initializeCanvas;
    }
    
    // Canvas and context
    const canvas = document.getElementById('background-canvas');
    const ctx = canvas.getContext('2d');
    
    // Control elements
    const startButton = document.getElementById('start-background-animation');
    const pauseButton = document.getElementById('pause-background-animation');
    const resetButton = document.getElementById('reset-background-animation');
    
    // Slider controls
    const neuronCountSlider = document.getElementById('neuron-count');
    const neuronCountValue = document.getElementById('neuron-count-value');
    const connectionDistanceSlider = document.getElementById('connection-distance');
    const connectionDistanceValue = document.getElementById('connection-distance-value');
    const firingSpeedSlider = document.getElementById('firing-speed');
    const firingSpeedValue = document.getElementById('firing-speed-value');
    const firingColorSelect = document.getElementById('firing-color');
    
    // Stats display elements
    const activeNeuronsCount = document.getElementById('active-neurons-count');
    const connectionsCount = document.getElementById('connections-count');
    const firingRateElement = document.getElementById('firing-rate');
    
    // Animation state
    let animationState = {
        running: false,
        neurons: [],
        connections: [],
        config: {
            neuronCount: 150,
            connectionDistance: 100,
            firingSpeed: 5,
            firingColor: 'blue'
        },
        stats: {
            activeNeurons: 0,
            connectionCount: 0,
            firingRate: 0,
            firingHistory: []
        },
        animationFrameId: null,
        lastTimestamp: 0
    };
    
    // Neuron class
    class Neuron {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.radius = 3 + Math.random() * 2; // 3-5 pixels
            this.connections = [];
            this.firing = false;
            this.fireProgress = 0; // 0-1 for animation progress
            this.lastFireTime = 0;
            this.refractionPeriod = 500 + Math.random() * 1500; // 0.5-2 seconds
            this.activated = false;
            this.activationLevel = 0; // 0-1
            this.threshold = 0.4 + Math.random() * 0.3; // 0.4-0.7
            this.speedMultiplier = 0.8 + Math.random() * 0.4; // 0.8-1.2x speed
            this.activationDecay = 0.02; // How fast activation decreases
        }
        
        // Add a connection to another neuron
        addConnection(neuron, strength) {
            this.connections.push({
                target: neuron,
                strength: strength,
                active: false,
                progress: 0
            });
        }
        
        // Update neuron state
        update(deltaTime, speed) {
            // Scale the time increment based on speed (0-10)
            const timeIncrement = deltaTime * (speed / 5);
            
            // Update activation level (decay over time)
            if (this.activationLevel > 0 && !this.firing) {
                this.activationLevel = Math.max(0, this.activationLevel - this.activationDecay * (timeIncrement / 16));
            }
            
            // Check if neuron should fire
            const currentTime = Date.now();
            if (!this.firing && this.activationLevel >= this.threshold && 
                (currentTime - this.lastFireTime > this.refractionPeriod)) {
                this.firing = true;
                this.fireProgress = 0;
                this.lastFireTime = currentTime;
                animationState.stats.firingHistory.push(currentTime);
            }
            
            // Update firing animation
            if (this.firing) {
                this.fireProgress += 0.05 * this.speedMultiplier * (timeIncrement / 16);
                
                // Activate connections when fireProgress reaches 1
                if (this.fireProgress >= 1) {
                    this.firing = false;
                    this.activationLevel = 0; // Reset activation after firing
                    
                    // Activate outgoing connections
                    this.connections.forEach(conn => {
                        if (Math.random() < conn.strength) {
                            conn.active = true;
                            conn.progress = 0;
                        }
                    });
                }
            }
            
            // Update connection animations
            this.connections.forEach(conn => {
                if (conn.active) {
                    conn.progress += 0.04 * this.speedMultiplier * (timeIncrement / 16);
                    
                    // Activate target neuron when signal reaches the end
                    if (conn.progress >= 1) {
                        conn.active = false;
                        conn.target.activationLevel += conn.strength;
                    }
                }
            });
        }
        
        // Draw the neuron
        draw(ctx, colorScheme) {
            // Draw connections
            this.connections.forEach(conn => {
                const { target, active, progress, strength } = conn;
                
                // Set line style based on connection state
                if (active) {
                    // Active connection (signal traveling)
                    const lineWidth = 1 + strength * 1.5;
                    
                    // Calculate position along the line based on progress
                    const signalX = this.x + (target.x - this.x) * progress;
                    const signalY = this.y + (target.y - this.y) * progress;
                    
                    // Draw the inactive part of the connection
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.strokeStyle = `rgba(200, 200, 200, ${strength * 0.3})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                    
                    // Draw the active signal
                    ctx.beginPath();
                    ctx.arc(signalX, signalY, lineWidth + 1, 0, Math.PI * 2);
                    
                    // Use the appropriate color based on the selected scheme
                    if (colorScheme === 'rainbow') {
                        const hue = (Date.now() / 20) % 360;
                        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                    } else {
                        switch (colorScheme) {
                            case 'blue':
                                ctx.fillStyle = `rgba(52, 152, 219, ${0.7 + progress * 0.3})`;
                                break;
                            case 'purple':
                                ctx.fillStyle = `rgba(155, 89, 182, ${0.7 + progress * 0.3})`;
                                break;
                            case 'green':
                                ctx.fillStyle = `rgba(46, 204, 113, ${0.7 + progress * 0.3})`;
                                break;
                            default:
                                ctx.fillStyle = `rgba(52, 152, 219, ${0.7 + progress * 0.3})`;
                        }
                    }
                    ctx.fill();
                    
                } else if (this.firing || this.activationLevel > 0.2) {
                    // Connection from an active neuron
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.strokeStyle = `rgba(200, 200, 200, ${strength * 0.5})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                } else {
                    // Inactive connection
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.strokeStyle = `rgba(200, 200, 200, ${strength * 0.2})`;
                    ctx.lineWidth = 0.2;
                    ctx.stroke();
                }
            });
            
            // Draw the neuron body
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            
            // Color based on firing/activation state
            if (this.firing) {
                // Use the selected color scheme for firing neurons
                if (colorScheme === 'rainbow') {
                    const hue = (Date.now() / 20) % 360;
                    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                } else {
                    switch (colorScheme) {
                        case 'blue':
                            ctx.fillStyle = `rgba(52, 152, 219, ${0.7 + this.fireProgress * 0.3})`;
                            break;
                        case 'purple':
                            ctx.fillStyle = `rgba(155, 89, 182, ${0.7 + this.fireProgress * 0.3})`;
                            break;
                        case 'green':
                            ctx.fillStyle = `rgba(46, 204, 113, ${0.7 + this.fireProgress * 0.3})`;
                            break;
                        default:
                            ctx.fillStyle = `rgba(52, 152, 219, ${0.7 + this.fireProgress * 0.3})`;
                    }
                }
                
                // Add glow effect for firing neurons
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 10;
            } else if (this.activationLevel > 0) {
                // Partially activated
                ctx.fillStyle = `rgba(127, 140, 141, ${0.3 + this.activationLevel * 0.7})`;
                ctx.shadowBlur = 0;
            } else {
                // Inactive
                ctx.fillStyle = 'rgba(127, 140, 141, 0.2)';
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow blur
        }
    }
    
    // Initialize the network
    function initNetwork() {
        // Clear existing state
        animationState.neurons = [];
        animationState.connections = [];
        animationState.stats.activeNeurons = 0;
        animationState.stats.connectionCount = 0;
        animationState.stats.firingHistory = [];
        
        const { neuronCount, connectionDistance } = animationState.config;
        
        // Create neurons with random positions
        for (let i = 0; i < neuronCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            animationState.neurons.push(new Neuron(x, y));
        }
        
        // Create connections between nearby neurons
        let connectionCount = 0;
        
        animationState.neurons.forEach(neuron => {
            animationState.neurons.forEach(target => {
                if (neuron !== target) {
                    // Calculate distance between neurons
                    const dx = neuron.x - target.x;
                    const dy = neuron.y - target.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Connect if within range (with random chance based on distance)
                    if (distance < connectionDistance) {
                        const probability = 1 - (distance / connectionDistance);
                        if (Math.random() < probability * 0.3) {
                            // Connection strength decreases with distance
                            const strength = 0.2 + (1 - distance / connectionDistance) * 0.6;
                            neuron.addConnection(target, strength);
                            connectionCount++;
                        }
                    }
                }
            });
        });
        
        animationState.stats.connectionCount = connectionCount;
        
        // Randomly activate a few neurons to start
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * animationState.neurons.length);
            animationState.neurons[randomIndex].firing = true;
            animationState.neurons[randomIndex].lastFireTime = Date.now();
        }
        
        // Update stats display
        updateStatsDisplay();
    }
    
    // Canvas resize functionality
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Reinitialize the network when the canvas is resized
        if (animationState.neurons.length > 0) {
            initNetwork();
        }
    }
    
    // Update stats display
    function updateStatsDisplay() {
        if (!activeNeuronsCount || !connectionsCount || !firingRateElement) return;
        
        // Count active neurons
        const activeCount = animationState.neurons.filter(n => n.firing || n.activationLevel > 0.2).length;
        animationState.stats.activeNeurons = activeCount;
        
        // Calculate firing rate (fires per second)
        const now = Date.now();
        const recentFirings = animationState.stats.firingHistory.filter(time => now - time < 1000).length;
        animationState.stats.firingRate = recentFirings;
        
        // Clean up old firing history
        animationState.stats.firingHistory = animationState.stats.firingHistory.filter(time => now - time < 1000);
        
        // Update display
        activeNeuronsCount.textContent = activeCount;
        connectionsCount.textContent = animationState.stats.connectionCount;
        firingRateElement.textContent = `${recentFirings} Hz`;
    }
    
    // Animation loop
    function animate(timestamp) {
        if (!animationState.running) return;
        
        // Calculate delta time
        const deltaTime = timestamp - (animationState.lastTimestamp || timestamp);
        animationState.lastTimestamp = timestamp;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw neurons
        animationState.neurons.forEach(neuron => {
            neuron.update(deltaTime, animationState.config.firingSpeed);
            neuron.draw(ctx, animationState.config.firingColor);
        });
        
        // Randomly activate neurons occasionally
        if (Math.random() < 0.01 * (animationState.config.firingSpeed / 5)) {
            const randomIndex = Math.floor(Math.random() * animationState.neurons.length);
            const randomNeuron = animationState.neurons[randomIndex];
            
            if (!randomNeuron.firing && Date.now() - randomNeuron.lastFireTime > randomNeuron.refractionPeriod) {
                randomNeuron.activationLevel = randomNeuron.threshold;
            }
        }
        
        // Update stats periodically (every ~500ms)
        if (timestamp % 500 < 20) {
            updateStatsDisplay();
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
        initNetwork();
        
        startButton.disabled = false;
        pauseButton.disabled = true;
        resetButton.disabled = false;
    }
    
    // Initialize the visualization
    function initVisualization() {
        if (!canvas) return;
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Set up initial configuration from sliders if they exist
        if (neuronCountSlider) {
            animationState.config.neuronCount = parseInt(neuronCountSlider.value, 10);
            neuronCountValue.textContent = animationState.config.neuronCount;
        }
        
        if (connectionDistanceSlider) {
            animationState.config.connectionDistance = parseInt(connectionDistanceSlider.value, 10);
            connectionDistanceValue.textContent = animationState.config.connectionDistance;
        }
        
        if (firingSpeedSlider) {
            animationState.config.firingSpeed = parseInt(firingSpeedSlider.value, 10);
            firingSpeedValue.textContent = animationState.config.firingSpeed;
        }
        
        if (firingColorSelect) {
            animationState.config.firingColor = firingColorSelect.value;
        }
        
        // Initialize the network
        initNetwork();
        
        // Set button states
        startButton.disabled = false;
        pauseButton.disabled = true;
        resetButton.disabled = true;
    }
    
    // Handle configuration changes
    function setupControlListeners() {
        if (neuronCountSlider) {
            neuronCountSlider.addEventListener('input', () => {
                animationState.config.neuronCount = parseInt(neuronCountSlider.value, 10);
                neuronCountValue.textContent = animationState.config.neuronCount;
            });
            
            neuronCountSlider.addEventListener('change', () => {
                // Only reinitialize network when slider interaction ends
                resetAnimation();
            });
        }
        
        if (connectionDistanceSlider) {
            connectionDistanceSlider.addEventListener('input', () => {
                animationState.config.connectionDistance = parseInt(connectionDistanceSlider.value, 10);
                connectionDistanceValue.textContent = animationState.config.connectionDistance;
            });
            
            connectionDistanceSlider.addEventListener('change', () => {
                resetAnimation();
            });
        }
        
        if (firingSpeedSlider) {
            firingSpeedSlider.addEventListener('input', () => {
                animationState.config.firingSpeed = parseInt(firingSpeedSlider.value, 10);
                firingSpeedValue.textContent = animationState.config.firingSpeed;
            });
        }
        
        if (firingColorSelect) {
            firingColorSelect.addEventListener('change', () => {
                animationState.config.firingColor = firingColorSelect.value;
            });
        }
        
        // Button event listeners
        if (startButton) {
            startButton.addEventListener('click', startAnimation);
        }
        
        if (pauseButton) {
            pauseButton.addEventListener('click', pauseAnimation);
        }
        
        if (resetButton) {
            resetButton.addEventListener('click', resetAnimation);
        }
        
        // Tab switching event from the main tab controller
        document.addEventListener('tabSwitch', (e) => {
            if (e.detail.tab === 'background-animation') {
                // Restart animation when switching to this tab
                if (animationState.neurons.length === 0) {
                    initNetwork();
                }
                
                if (!animationState.running) {
                    startAnimation();
                }
            } else if (animationState.running) {
                // Pause animation when switching away from this tab
                pauseAnimation();
            }
        });
    }
    
    // Initialize everything
    initVisualization();
    setupControlListeners();
}); 