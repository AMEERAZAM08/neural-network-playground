// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Neural Network Playground Initialized');
    
    // Initialize the canvas and tooltip
    const canvas = document.getElementById('network-canvas');
    const tooltip = document.createElement('div');
    tooltip.className = 'canvas-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-header"></div>
        <div class="tooltip-content"></div>
    `;
    document.body.appendChild(tooltip);
    
    // Initialize drag and drop functionality
    initializeDragAndDrop();
    
    // Network configuration (from UI controls)
    let networkConfig = {
        learningRate: 0.01,
        activation: 'relu',
        batchSize: 32,
        epochs: 10
    };
    
    // Initialize UI controls
    setupUIControls();
    
    // Layer editor modal
    setupLayerEditor();
    
    // Listen for network updates
    document.addEventListener('networkUpdated', handleNetworkUpdate);
    
    // Listen for layer editor events
    document.addEventListener('openLayerEditor', handleOpenLayerEditor);
    
    // Setup UI controls and event listeners
    function setupUIControls() {
        // Learning rate slider
        const learningRateSlider = document.getElementById('learning-rate');
        const learningRateValue = document.getElementById('learning-rate-value');
        
        if (learningRateSlider && learningRateValue) {
            learningRateSlider.value = networkConfig.learningRate;
            learningRateValue.textContent = networkConfig.learningRate.toFixed(3);
            
            learningRateSlider.addEventListener('input', (e) => {
                networkConfig.learningRate = parseFloat(e.target.value);
                learningRateValue.textContent = networkConfig.learningRate.toFixed(3);
            });
        }
        
        // Activation function dropdown
        const activationSelect = document.getElementById('activation');
        if (activationSelect) {
            activationSelect.value = networkConfig.activation;
            
            activationSelect.addEventListener('change', (e) => {
                networkConfig.activation = e.target.value;
                updateActivationFunctionGraph(networkConfig.activation);
            });
        }
        
        // Initialize activation function graph
        updateActivationFunctionGraph(networkConfig.activation);
        
        // Sample data event handlers
        const sampleItems = document.querySelectorAll('.sample-item');
        sampleItems.forEach(item => {
            item.addEventListener('click', () => {
                const sampleId = item.getAttribute('data-sample');
                handleSampleSelection(sampleId);
            });
        });
        
        // Button event listeners
        const runButton = document.getElementById('run-network');
        if (runButton) {
            runButton.addEventListener('click', runNetwork);
        }
        
        const clearButton = document.getElementById('clear-canvas');
        if (clearButton) {
            clearButton.addEventListener('click', clearCanvas);
        }
        
        // Modal handlers
        setupModals();
    }
    
    // Setup modal handlers
    function setupModals() {
        const aboutModal = document.getElementById('about-modal');
        const aboutLink = document.getElementById('about-link');
        
        if (aboutLink && aboutModal) {
            aboutLink.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(aboutModal);
            });
            
            const closeButtons = aboutModal.querySelectorAll('.close-modal');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    closeModal(aboutModal);
                });
            });
            
            // Close modal when clicking outside
            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) {
                    closeModal(aboutModal);
                }
            });
        }
    }
    
    // Setup layer editor modal
    function setupLayerEditor() {
        const layerEditorModal = document.getElementById('layer-editor-modal');
        
        if (layerEditorModal) {
            const closeButtons = layerEditorModal.querySelectorAll('.close-modal');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    closeModal(layerEditorModal);
                });
            });
            
            // Close modal when clicking outside
            layerEditorModal.addEventListener('click', (e) => {
                if (e.target === layerEditorModal) {
                    closeModal(layerEditorModal);
                }
            });
            
            // Save button
            const saveButton = layerEditorModal.querySelector('.save-layer-btn');
            if (saveButton) {
                saveButton.addEventListener('click', saveLayerConfig);
            }
        }
    }
    
    // Open modal
    function openModal(modal) {
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    // Close modal
    function closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // Handle network updates
    function handleNetworkUpdate(e) {
        const networkLayers = e.detail;
        console.log('Network updated:', networkLayers);
        
        // Update the properties panel
        updatePropertiesPanel(networkLayers);
    }
    
    // Update properties panel with network information
    function updatePropertiesPanel(networkLayers) {
        const propertiesPanel = document.querySelector('.props-panel');
        if (!propertiesPanel) return;
        
        // Find the properties content section
        const propsContent = propertiesPanel.querySelector('.props-content');
        if (!propsContent) return;
        
        // Basic network stats
        const layerCount = networkLayers.layers.length;
        const connectionCount = networkLayers.connections.length;
        
        let layerTypeCounts = {};
        networkLayers.layers.forEach(layer => {
            layerTypeCounts[layer.type] = (layerTypeCounts[layer.type] || 0) + 1;
        });
        
        // Check network validity
        const validationResult = window.neuralNetwork.validateNetwork(
            networkLayers.layers,
            networkLayers.connections
        );
        
        // Update network architecture section
        let networkArchitectureHTML = `
            <div class="props-section">
                <div class="props-heading">
                    <i class="icon">🔍</i> Network Architecture
                </div>
                <div class="props-row">
                    <div class="props-key">Total Layers</div>
                    <div class="props-value">${layerCount}</div>
                </div>
                <div class="props-row">
                    <div class="props-key">Connections</div>
                    <div class="props-value">${connectionCount}</div>
                </div>
        `;
        
        // Add layer type counts
        Object.entries(layerTypeCounts).forEach(([type, count]) => {
            networkArchitectureHTML += `
                <div class="props-row">
                    <div class="props-key">${type.charAt(0).toUpperCase() + type.slice(1)} Layers</div>
                    <div class="props-value">${count}</div>
                </div>
            `;
        });
        
        // Add validation status
        networkArchitectureHTML += `
            <div class="props-row">
                <div class="props-key">Validity</div>
                <div class="props-value" style="color: ${validationResult.valid ? 'var(--secondary-color)' : 'var(--warning-color)'}">
                    ${validationResult.valid ? 'Valid' : 'Invalid'}
                </div>
            </div>
        `;
        
        // If there are validation errors, show them
        if (!validationResult.valid && validationResult.errors.length > 0) {
            networkArchitectureHTML += `
                <div class="props-row">
                    <div class="props-key">Errors</div>
                    <div class="props-value" style="color: var(--warning-color)">
                        ${validationResult.errors.join('<br>')}
                    </div>
                </div>
            `;
        }
        
        networkArchitectureHTML += `</div>`;
        
        // Calculate total parameters if we have layers
        let totalParameters = 0;
        let totalFlops = 0;
        let totalMemory = 0;
        
        if (layerCount > 0) {
            // Calculate model stats
            const modelStatsHTML = `
                <div class="props-section">
                    <div class="props-heading">
                        <i class="icon">📊</i> Model Statistics
                    </div>
                    <div class="props-row">
                        <div class="props-key">Parameters</div>
                        <div class="props-value">${formatNumber(totalParameters)}</div>
                    </div>
                    <div class="props-row">
                        <div class="props-key">FLOPs</div>
                        <div class="props-value">${formatNumber(totalFlops)}</div>
                    </div>
                    <div class="props-row">
                        <div class="props-key">Memory</div>
                        <div class="props-value">${formatMemorySize(totalMemory)}</div>
                    </div>
                </div>
            `;
            
            // Update the properties content
            propsContent.innerHTML = networkArchitectureHTML + modelStatsHTML;
        } else {
            // Just show basic architecture info
            propsContent.innerHTML = networkArchitectureHTML;
        }
    }
    
    // Format number with K, M, B suffixes
    function formatNumber(num) {
        if (num === 0) return '0';
        if (!num) return 'N/A';
        
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toString();
    }
    
    // Format memory size in bytes to KB, MB, GB
    function formatMemorySize(bytes) {
        if (bytes === 0) return '0 Bytes';
        if (!bytes) return 'N/A';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Handle opening the layer editor
    function handleOpenLayerEditor(e) {
        const layerDetails = e.detail;
        console.log('Opening layer editor for:', layerDetails);
        
        const layerEditorModal = document.getElementById('layer-editor-modal');
        if (!layerEditorModal) return;
        
        // Get the form and populate it
        const layerForm = layerEditorModal.querySelector('.layer-form');
        if (!layerForm) return;
        
        // Set the layer ID in a data attribute for retrieval when saving
        layerForm.setAttribute('data-layer-id', layerDetails.id);
        layerForm.setAttribute('data-layer-type', layerDetails.type);
        
        // Set modal title
        const modalTitle = layerEditorModal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Edit ${layerDetails.name}`;
        }
        
        // Get layer config template
        const layerConfig = window.neuralNetwork.nodeConfigTemplates[layerDetails.type];
        
        // Generate form fields based on layer type
        layerForm.innerHTML = '';
        
        // Add common fields
        layerForm.innerHTML += `
            <div class="form-group">
                <label for="layer-name">Layer Name</label>
                <input type="text" id="layer-name" value="${layerDetails.name}">
            </div>
        `;
        
        // Add type-specific fields
        switch (layerDetails.type) {
            case 'input':
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label for="input-shape">Input Shape</label>
                        <input type="text" id="input-shape" value="${layerConfig.shape.join(' × ')}">
                    </div>
                    <div class="form-group">
                        <label for="batch-size">Batch Size</label>
                        <input type="number" id="batch-size" value="${layerConfig.batchSize}">
                    </div>
                `;
                break;
                
            case 'hidden':
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label for="units">Units</label>
                        <input type="number" id="units" value="${layerConfig.units}">
                    </div>
                    <div class="form-group">
                        <label for="activation">Activation</label>
                        <select id="activation">
                            <option value="relu" ${layerConfig.activation === 'relu' ? 'selected' : ''}>ReLU</option>
                            <option value="sigmoid" ${layerConfig.activation === 'sigmoid' ? 'selected' : ''}>Sigmoid</option>
                            <option value="tanh" ${layerConfig.activation === 'tanh' ? 'selected' : ''}>Tanh</option>
                            <option value="linear" ${layerConfig.activation === 'linear' ? 'selected' : ''}>Linear</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="use-bias">Use Bias</label>
                        <select id="use-bias">
                            <option value="true" ${layerConfig.useBias ? 'selected' : ''}>Yes</option>
                            <option value="false" ${!layerConfig.useBias ? 'selected' : ''}>No</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="dropout-rate">Dropout Rate</label>
                        <input type="number" id="dropout-rate" min="0" max="0.9" step="0.1" value="${layerConfig.dropoutRate}">
                    </div>
                `;
                break;
                
            case 'output':
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label for="units">Units</label>
                        <input type="number" id="units" value="${layerConfig.units}">
                    </div>
                    <div class="form-group">
                        <label for="activation">Activation</label>
                        <select id="activation">
                            <option value="softmax" ${layerConfig.activation === 'softmax' ? 'selected' : ''}>Softmax</option>
                            <option value="sigmoid" ${layerConfig.activation === 'sigmoid' ? 'selected' : ''}>Sigmoid</option>
                            <option value="linear" ${layerConfig.activation === 'linear' ? 'selected' : ''}>Linear</option>
                        </select>
                    </div>
                `;
                break;
                
            case 'conv':
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label for="filters">Filters</label>
                        <input type="number" id="filters" value="${layerConfig.filters}">
                    </div>
                    <div class="form-group">
                        <label for="kernel-size">Kernel Size</label>
                        <input type="text" id="kernel-size" value="${layerConfig.kernelSize.join(' × ')}">
                    </div>
                    <div class="form-group">
                        <label for="strides">Strides</label>
                        <input type="text" id="strides" value="${layerConfig.strides.join(' × ')}">
                    </div>
                    <div class="form-group">
                        <label for="padding">Padding</label>
                        <select id="padding">
                            <option value="valid" ${layerConfig.padding === 'valid' ? 'selected' : ''}>Valid</option>
                            <option value="same" ${layerConfig.padding === 'same' ? 'selected' : ''}>Same</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="activation">Activation</label>
                        <select id="activation">
                            <option value="relu" ${layerConfig.activation === 'relu' ? 'selected' : ''}>ReLU</option>
                            <option value="sigmoid" ${layerConfig.activation === 'sigmoid' ? 'selected' : ''}>Sigmoid</option>
                            <option value="tanh" ${layerConfig.activation === 'tanh' ? 'selected' : ''}>Tanh</option>
                            <option value="linear" ${layerConfig.activation === 'linear' ? 'selected' : ''}>Linear</option>
                        </select>
                    </div>
                `;
                break;
                
            case 'pool':
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label for="pool-size">Pool Size</label>
                        <input type="text" id="pool-size" value="${layerConfig.poolSize.join(' × ')}">
                    </div>
                    <div class="form-group">
                        <label for="strides">Strides</label>
                        <input type="text" id="strides" value="${layerConfig.strides.join(' × ')}">
                    </div>
                    <div class="form-group">
                        <label for="padding">Padding</label>
                        <select id="padding">
                            <option value="valid" ${layerConfig.padding === 'valid' ? 'selected' : ''}>Valid</option>
                            <option value="same" ${layerConfig.padding === 'same' ? 'selected' : ''}>Same</option>
                        </select>
                    </div>
                `;
                break;
        }
        
        // Add save button
        layerForm.innerHTML += `
            <div class="form-group form-grid-full">
                <button type="button" class="btn btn-primary save-layer-btn">Save Changes</button>
            </div>
        `;
        
        // Show the modal
        openModal(layerEditorModal);
    }
    
    // Save layer configuration
    function saveLayerConfig() {
        const layerEditorModal = document.getElementById('layer-editor-modal');
        if (!layerEditorModal) return;
        
        const layerForm = layerEditorModal.querySelector('.layer-form');
        if (!layerForm) return;
        
        const layerId = layerForm.getAttribute('data-layer-id');
        const layerType = layerForm.getAttribute('data-layer-type');
        
        // Get node on canvas
        const node = document.querySelector(`.canvas-node[data-id="${layerId}"]`);
        if (!node) return;
        
        // Get form values
        const name = document.getElementById('layer-name').value;
        
        // Update node title
        const nodeTitle = node.querySelector('.node-title');
        if (nodeTitle) {
            nodeTitle.textContent = name;
        }
        
        // Update node data attribute
        node.setAttribute('data-name', name);
        
        // Update dimensions based on layer type
        let dimensions = '';
        switch (layerType) {
            case 'input':
                const inputShape = document.getElementById('input-shape').value;
                dimensions = inputShape;
                break;
                
            case 'hidden':
            case 'output':
                const units = document.getElementById('units').value;
                dimensions = units;
                break;
                
            case 'conv':
                const filters = document.getElementById('filters').value;
                dimensions = `${filters} × 26 × 26`; // Simplified
                break;
                
            case 'pool':
                dimensions = '32 × 13 × 13'; // Simplified
                break;
        }
        
        // Update node dimensions
        const nodeDimensions = node.querySelector('.node-dimensions');
        if (nodeDimensions) {
            nodeDimensions.textContent = dimensions;
        }
        
        // Update node data attribute
        node.setAttribute('data-dimensions', dimensions);
        
        // Update network layers in drag-drop module
        const networkLayers = window.dragDrop.getNetworkArchitecture();
        const layerIndex = networkLayers.layers.findIndex(layer => layer.id === layerId);
        
        if (layerIndex !== -1) {
            networkLayers.layers[layerIndex].name = name;
            networkLayers.layers[layerIndex].dimensions = dimensions;
        }
        
        // Trigger network updated event
        const event = new CustomEvent('networkUpdated', { detail: networkLayers });
        document.dispatchEvent(event);
        
        // Close the modal
        closeModal(layerEditorModal);
    }
    
    // Handle sample selection
    function handleSampleSelection(sampleId) {
        // Set active sample
        document.querySelectorAll('.sample-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-sample') === sampleId) {
                item.classList.add('active');
            }
        });
        
        // Get sample data
        const sampleData = window.neuralNetwork.sampleData[sampleId];
        if (!sampleData) return;
        
        console.log(`Selected sample: ${sampleData.name}`);
        
        // Update properties panel to show sample info
        const propertiesPanel = document.querySelector('.props-panel');
        if (!propertiesPanel) return;
        
        const propsContent = propertiesPanel.querySelector('.props-content');
        if (!propsContent) return;
        
        propsContent.innerHTML = `
            <div class="props-section">
                <div class="props-heading">
                    <i class="icon">📊</i> ${sampleData.name}
                </div>
                <div class="props-row">
                    <div class="props-key">Input Shape</div>
                    <div class="props-value">${sampleData.inputShape.join(' × ')}</div>
                </div>
                <div class="props-row">
                    <div class="props-key">Classes</div>
                    <div class="props-value">${sampleData.numClasses}</div>
                </div>
                <div class="props-row">
                    <div class="props-key">Training Samples</div>
                    <div class="props-value">${sampleData.trainSamples.toLocaleString()}</div>
                </div>
                <div class="props-row">
                    <div class="props-key">Test Samples</div>
                    <div class="props-value">${sampleData.testSamples.toLocaleString()}</div>
                </div>
                <div class="props-row">
                    <div class="props-key">Description</div>
                    <div class="props-value">${sampleData.description}</div>
                </div>
            </div>
            
            <div class="props-section">
                <p class="hint-text">Click "Run Network" to train on this dataset</p>
            </div>
        `;
    }
    
    // Function to run the neural network simulation
    function runNetwork() {
        console.log('Running neural network simulation with config:', networkConfig);
        
        // Get the current network architecture
        const networkLayers = window.dragDrop.getNetworkArchitecture();
        
        // Check if we have a valid network
        if (networkLayers.layers.length === 0) {
            alert('Please add some nodes to the network first!');
            return;
        }
        
        // Validate the network
        const validationResult = window.neuralNetwork.validateNetwork(
            networkLayers.layers,
            networkLayers.connections
        );
        
        if (!validationResult.valid) {
            alert('Network is not valid: ' + validationResult.errors.join('\n'));
            return;
        }
        
        // Add animation class to all nodes
        document.querySelectorAll('.canvas-node').forEach(node => {
            node.classList.add('highlight-pulse');
        });
        
        // Animate connections to show data flow
        document.querySelectorAll('.connection').forEach((connection, index) => {
            setTimeout(() => {
                connection.style.background = 'linear-gradient(90deg, var(--primary-color), var(--accent-color))';
                
                // Reset after animation
                setTimeout(() => {
                    connection.style.background = '';
                }, 800);
            }, 300 * index);
        });
        
        // Simulate training
        simulateTraining();
        
        // Reset animations after completion
        setTimeout(() => {
            document.querySelectorAll('.canvas-node').forEach(node => {
                node.classList.remove('highlight-pulse');
            });
        }, 3000);
    }
    
    // Simulate training progress
    function simulateTraining() {
        const progressBar = document.querySelector('.progress-bar');
        const lossValue = document.getElementById('loss-value');
        const accuracyValue = document.getElementById('accuracy-value');
        
        if (!progressBar || !lossValue || !accuracyValue) return;
        
        // Reset progress
        progressBar.style.width = '0%';
        lossValue.textContent = '2.3021';
        accuracyValue.textContent = '0.12';
        
        // Simulate progress over time
        let progress = 0;
        let loss = 2.3021;
        let accuracy = 0.12;
        
        const interval = setInterval(() => {
            progress += 10;
            loss *= 0.85; // Decrease loss over time
            accuracy = Math.min(0.99, accuracy * 1.2); // Increase accuracy over time
            
            progressBar.style.width = `${progress}%`;
            lossValue.textContent = loss.toFixed(4);
            accuracyValue.textContent = accuracy.toFixed(2);
            
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 300);
    }
    
    // Function to clear all nodes from the canvas
    function clearCanvas() {
        if (window.dragDrop && typeof window.dragDrop.clearAllNodes === 'function') {
            window.dragDrop.clearAllNodes();
        }
        
        // Reset progress indicators
        const progressBar = document.querySelector('.progress-bar');
        const lossValue = document.getElementById('loss-value');
        const accuracyValue = document.getElementById('accuracy-value');
        
        if (progressBar) progressBar.style.width = '0%';
        if (lossValue) lossValue.textContent = '-';
        if (accuracyValue) accuracyValue.textContent = '-';
    }
    
    // Update activation function graph
    function updateActivationFunctionGraph(activationType) {
        const activationGraph = document.querySelector('.activation-function');
        if (!activationGraph) return;
        
        // Clear previous graph
        let canvas = activationGraph.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 100;
            activationGraph.appendChild(canvas);
        }
        
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw axes
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        
        // Draw function
        ctx.strokeStyle = 'var(--primary-color)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        switch(activationType) {
            case 'relu':
                ctx.moveTo(0, canvas.height / 2);
                ctx.lineTo(canvas.width / 2, canvas.height / 2);
                ctx.lineTo(canvas.width, 0);
                break;
                
            case 'sigmoid':
                for (let x = 0; x < canvas.width; x++) {
                    const normalizedX = (x / canvas.width - 0.5) * 10;
                    const sigmoidY = 1 / (1 + Math.exp(-normalizedX));
                    const y = canvas.height - sigmoidY * canvas.height;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                break;
                
            case 'tanh':
                for (let x = 0; x < canvas.width; x++) {
                    const normalizedX = (x / canvas.width - 0.5) * 6;
                    const tanhY = Math.tanh(normalizedX);
                    const y = canvas.height / 2 - tanhY * canvas.height / 2;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                break;
                
            case 'softmax':
                // Just a representative curve for softmax
                ctx.moveTo(0, canvas.height * 0.8);
                ctx.bezierCurveTo(
                    canvas.width * 0.3, canvas.height * 0.7,
                    canvas.width * 0.6, canvas.height * 0.3,
                    canvas.width, canvas.height * 0.2
                );
                break;
                
            default: // Linear
                ctx.moveTo(0, canvas.height * 0.8);
                ctx.lineTo(canvas.width, canvas.height * 0.2);
        }
        
        ctx.stroke();
        
        // Add label
        ctx.fillStyle = 'var(--text-color)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(activationType, canvas.width / 2, canvas.height - 10);
    }
    
    // Setup node hover effects for tooltips
    canvas.addEventListener('mouseover', (e) => {
        const node = e.target.closest('.canvas-node');
        if (node) {
            const rect = node.getBoundingClientRect();
            const nodeType = node.getAttribute('data-type');
            const nodeName = node.getAttribute('data-name');
            const dimensions = node.getAttribute('data-dimensions');
            
            // Show tooltip
            tooltip.style.display = 'block';
            tooltip.style.left = `${rect.right + 10}px`;
            tooltip.style.top = `${rect.top}px`;
            
            const tooltipHeader = tooltip.querySelector('.tooltip-header');
            const tooltipContent = tooltip.querySelector('.tooltip-content');
            
            if (tooltipHeader && tooltipContent) {
                tooltipHeader.textContent = nodeName;
                
                let content = '';
                content += `<div class="tooltip-row">
                    <div class="tooltip-label">Type:</div>
                    <div class="tooltip-value">${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}</div>
                </div>`;
                
                content += `<div class="tooltip-row">
                    <div class="tooltip-label">Dimensions:</div>
                    <div class="tooltip-value">${dimensions}</div>
                </div>`;
                
                // Get config template
                const configTemplate = window.neuralNetwork.nodeConfigTemplates[nodeType];
                
                if (configTemplate) {
                    if (configTemplate.activation) {
                        content += `<div class="tooltip-row">
                            <div class="tooltip-label">Activation:</div>
                            <div class="tooltip-value">${configTemplate.activation}</div>
                        </div>`;
                    }
                    
                    if (configTemplate.description) {
                        content += `<div class="tooltip-row">
                            <div class="tooltip-label">Description:</div>
                            <div class="tooltip-value">${configTemplate.description}</div>
                        </div>`;
                    }
                }
                
                tooltipContent.innerHTML = content;
            }
        }
    });
    
    canvas.addEventListener('mouseout', (e) => {
        const node = e.target.closest('.canvas-node');
        if (node) {
            tooltip.style.display = 'none';
        }
    });
    
    // Make sure tooltip follows cursor for nodes that are being dragged
    canvas.addEventListener('mousemove', (e) => {
        const node = e.target.closest('.canvas-node');
        if (node && node.classList.contains('dragging')) {
            const rect = node.getBoundingClientRect();
            tooltip.style.left = `${rect.right + 10}px`;
            tooltip.style.top = `${rect.top}px`;
        }
    });
}); 