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
    if (typeof initializeDragAndDrop === 'function') {
        initializeDragAndDrop();
    } else {
        console.warn('initializeDragAndDrop function not found');
    }
    
    // Network configuration (from UI controls)
    window.networkConfig = {
        learningRate: 0.1,
        activation: 'relu',
        batchSize: 32,
        epochs: 10,
        optimizer: 'sgd'
    };
    
    // Make sure window.networkConfig is available globally for other scripts
    if (!window.networkConfig) {
        window.networkConfig = networkConfig;
    }
    
    // Initialize UI controls
    setupUIControls();
    
    // Force activation function graph update
    setTimeout(() => {
        const activationType = document.getElementById('activation')?.value || 'relu';
        console.log('Ensuring activation function graph is rendered:', activationType);
        updateActivationFunctionGraph(activationType);
    }, 200);
    
    // Layer editor modal
    setupLayerEditor();
    
    // Listen for network updates
    document.addEventListener('networkUpdated', handleNetworkUpdate);
    
    // Listen for layer editor events
    document.addEventListener('openLayerEditor', handleOpenLayerEditor);
    
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the tab data attribute
            const tabId = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to the clicked button
            button.classList.add('active');
            
            // Add active class to the corresponding content
            const tabContent = document.getElementById(`${tabId}-tab`);
            if (tabContent) {
                tabContent.classList.add('active');
                
                // Dispatch a custom event to notify tab-specific scripts
                document.dispatchEvent(new CustomEvent('tabSwitch', {
                    detail: { tab: tabId }
                }));
            }
        });
    });
    
    // Modal functionality
    const aboutLink = document.getElementById('about-link');
    const guideLink = document.getElementById('guide-link');
    const aboutModal = document.getElementById('about-modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    
    if (aboutLink && aboutModal) {
        aboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            aboutModal.style.display = 'flex';
        });
    }
    
    if (closeModalButtons) {
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }
    
    // Close modals when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Setup UI controls and event listeners
    function setupUIControls() {
        console.log('Setting up UI controls...');
        
        // Learning rate slider
        const learningRateSlider = document.getElementById('learning-rate');
        const learningRateValue = document.getElementById('learning-rate-value');
        
        if (learningRateSlider && learningRateValue) {
            // Set initial value - default to 0.1 if not set in networkConfig
            window.networkConfig.learningRate = window.networkConfig.learningRate || 0.1;
            learningRateSlider.value = window.networkConfig.learningRate;
            learningRateValue.textContent = window.networkConfig.learningRate.toFixed(3);
            
            learningRateSlider.addEventListener('input', (e) => {
                window.networkConfig.learningRate = parseFloat(e.target.value);
                learningRateValue.textContent = window.networkConfig.learningRate.toFixed(3);
                console.log(`Learning rate updated: ${window.networkConfig.learningRate}`);
                
                // Trigger network configuration update event
                document.dispatchEvent(new CustomEvent('networkConfigUpdated', {
                    detail: { 
                        type: 'learningRate', 
                        value: window.networkConfig.learningRate 
                    }
                }));
            });
            
            console.log('Learning rate slider initialized with value:', window.networkConfig.learningRate);
        } else {
            console.warn('Learning rate controls not found in the DOM');
        }
        
        // Activation function dropdown
        const activationSelect = document.getElementById('activation');
        if (activationSelect) {
            // Set initial value - default to 'relu' if not set in networkConfig
            window.networkConfig.activation = window.networkConfig.activation || 'relu';
            activationSelect.value = window.networkConfig.activation;
            
            activationSelect.addEventListener('change', (e) => {
                window.networkConfig.activation = e.target.value;
                console.log(`Activation function updated: ${window.networkConfig.activation}`);
                
                // Update activation function graph
                updateActivationFunctionGraph(window.networkConfig.activation);
                
                // Trigger network configuration update event
                document.dispatchEvent(new CustomEvent('networkConfigUpdated', {
                    detail: { 
                        type: 'activation', 
                        value: window.networkConfig.activation 
                    }
                }));
            });
            
            console.log('Activation select initialized with value:', window.networkConfig.activation);
            
            // Initialize activation function graph with current value
            updateActivationFunctionGraph(window.networkConfig.activation);
        } else {
            console.warn('Activation select not found in the DOM');
        }
        
        // Optimizer dropdown
        const optimizerSelect = document.getElementById('optimizer');
        if (optimizerSelect) {
            // Set initial value - default to 'sgd' if not set in networkConfig
            window.networkConfig.optimizer = window.networkConfig.optimizer || 'sgd';
            optimizerSelect.value = window.networkConfig.optimizer;
            
            optimizerSelect.addEventListener('change', (e) => {
                window.networkConfig.optimizer = e.target.value;
                console.log(`Optimizer updated: ${window.networkConfig.optimizer}`);
                
                // Trigger network configuration update event
                document.dispatchEvent(new CustomEvent('networkConfigUpdated', {
                    detail: { 
                        type: 'optimizer', 
                        value: window.networkConfig.optimizer 
                    }
                }));
            });
            
            console.log('Optimizer select initialized with value:', window.networkConfig.optimizer);
        } else {
            console.warn('Optimizer select not found in the DOM');
        }
        
        // Button event listeners
        const runButton = document.getElementById('run-network');
        if (runButton) {
            runButton.addEventListener('click', () => {
                console.log('Run network button clicked');
                runNetwork();
            });
            console.log('Run network button initialized');
        } else {
            console.warn('Run network button not found in the DOM');
        }
        
        const clearButton = document.getElementById('clear-canvas');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                console.log('Clear canvas button clicked');
                clearCanvas();
            });
            console.log('Clear canvas button initialized');
        } else {
            console.warn('Clear canvas button not found in the DOM');
        }
        
        // Modal handlers
        setupModals();
        
        console.log('UI controls setup complete');
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
                saveButton.addEventListener('click', () => {
                    // Get node reference from modal data attributes
                    const nodeRef = layerEditorModal.getAttribute('data-node-reference');
                    const nodeType = layerEditorModal.getAttribute('data-node-type');
                    const nodeId = layerEditorModal.getAttribute('data-node-id');
                    
                    // Get actual DOM node using the ID
                    const node = document.querySelector(`.canvas-node[data-id="${nodeId}"]`);
                    
                    if (node) {
                        saveLayerConfig(node, nodeType, nodeId);
                    }
                    
                    // Close the modal after saving
                    closeModal(layerEditorModal);
                });
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
        const node = e.detail.node;
        const nodeType = e.detail.type;
        const layerId = e.detail.id;
        
        // Store information in the modal for later use
        const layerEditorModal = document.getElementById('layer-editor-modal');
        layerEditorModal.setAttribute('data-node-reference', layerId);
        layerEditorModal.setAttribute('data-node-type', nodeType);
        layerEditorModal.setAttribute('data-node-id', layerId);
        
        // Get current configuration
        const layerConfig = node.layerConfig || window.neuralNetwork.createNodeConfig(nodeType);
        
        // Update modal title
        const modalTitle = document.querySelector('.layer-editor-modal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Edit ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} Layer`;
        }
        
        // Get layer form
        const layerForm = document.querySelector('.layer-form');
        if (!layerForm) return;
        
        // Clear previous form fields
        layerForm.innerHTML = '';
        
        // Show modal
        openModal(layerEditorModal);
        
        // Create form fields based on layer type
        switch (nodeType) {
            case 'input':
                // Input shape fields
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label>Input Dimensions:</label>
                        <div class="form-row">
                            <input type="number" id="input-height" min="1" value="${layerConfig.shape[0]}" placeholder="Height">
                            <input type="number" id="input-width" min="1" value="${layerConfig.shape[1]}" placeholder="Width">
                            <input type="number" id="input-channels" min="1" value="${layerConfig.shape[2]}" placeholder="Channels">
                        </div>
                        <small>Input shape: [${layerConfig.shape.join(' × ')}]</small>
                    </div>
                    <div class="form-group">
                        <label>Batch Size:</label>
                        <input type="number" id="batch-size" min="1" value="${layerConfig.batchSize}" placeholder="Batch Size">
                    </div>
                `;
                break;
                
            case 'hidden':
                // Units and activation function
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label>Units:</label>
                        <input type="number" id="hidden-units" min="1" value="${layerConfig.units}" placeholder="Number of units">
                        <small>Output shape: [${layerConfig.units}]</small>
                    </div>
                    <div class="form-group">
                        <label>Activation Function:</label>
                        <select id="hidden-activation">
                            <option value="relu" ${layerConfig.activation === 'relu' ? 'selected' : ''}>ReLU</option>
                            <option value="sigmoid" ${layerConfig.activation === 'sigmoid' ? 'selected' : ''}>Sigmoid</option>
                            <option value="tanh" ${layerConfig.activation === 'tanh' ? 'selected' : ''}>Tanh</option>
                            <option value="leaky_relu" ${layerConfig.activation === 'leaky_relu' ? 'selected' : ''}>Leaky ReLU</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Dropout Rate:</label>
                        <input type="range" id="dropout-rate" min="0" max="0.9" step="0.1" value="${layerConfig.dropoutRate}">
                        <span id="dropout-value">${layerConfig.dropoutRate}</span>
                    </div>
                    <div class="form-group">
                        <label>Use Bias:</label>
                        <input type="checkbox" id="use-bias" ${layerConfig.useBias ? 'checked' : ''}>
                    </div>
                `;
                
                // Add listener for dropout rate slider
                setTimeout(() => {
                    const dropoutSlider = document.getElementById('dropout-rate');
                    const dropoutValue = document.getElementById('dropout-value');
                    if (dropoutSlider && dropoutValue) {
                        dropoutSlider.addEventListener('input', (e) => {
                            dropoutValue.textContent = e.target.value;
                        });
                    }
                }, 100);
                break;
                
            case 'output':
                // Output units and activation
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label>Units:</label>
                        <input type="number" id="output-units" min="1" value="${layerConfig.units}" placeholder="Number of output units">
                        <small>Output shape: [${layerConfig.units}]</small>
                    </div>
                    <div class="form-group">
                        <label>Activation Function:</label>
                        <select id="output-activation">
                            <option value="softmax" ${layerConfig.activation === 'softmax' ? 'selected' : ''}>Softmax (Classification)</option>
                            <option value="sigmoid" ${layerConfig.activation === 'sigmoid' ? 'selected' : ''}>Sigmoid (Binary Classification)</option>
                            <option value="linear" ${layerConfig.activation === 'linear' ? 'selected' : ''}>Linear (Regression)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Use Bias:</label>
                        <input type="checkbox" id="output-use-bias" ${layerConfig.useBias ? 'checked' : ''}>
                    </div>
                `;
                break;
                
            case 'conv':
                // Convolutional layer parameters
                // Get input and output shapes - may be calculated or null at first
                const inputShape = layerConfig.inputShape || ['?', '?', '?'];
                const outputShape = layerConfig.outputShape || ['?', '?', layerConfig.filters];
                
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label>Input Shape:</label>
                        <div class="form-row">
                            <input type="number" id="conv-input-h" min="1" value="${inputShape[0] === '?' ? 28 : inputShape[0]}" placeholder="Height">
                            <input type="number" id="conv-input-w" min="1" value="${inputShape[1] === '?' ? 28 : inputShape[1]}" placeholder="Width">
                            <input type="number" id="conv-input-c" min="1" value="${inputShape[2] === '?' ? 1 : inputShape[2]}" placeholder="Channels">
                        </div>
                        <small>Input dimensions: H × W × C</small>
                    </div>
                    <div class="form-group">
                        <label>Filters:</label>
                        <input type="number" id="conv-filters" min="1" value="${layerConfig.filters}" placeholder="Number of filters">
                        <small>Output channels</small>
                    </div>
                    <div class="form-group">
                        <label>Kernel Size:</label>
                        <div class="form-row">
                            <input type="number" id="kernel-size-h" min="1" max="7" value="${layerConfig.kernelSize[0]}" placeholder="Height">
                            <input type="number" id="kernel-size-w" min="1" max="7" value="${layerConfig.kernelSize[1]}" placeholder="Width">
                        </div>
                        <small>Filter dimensions: ${layerConfig.kernelSize.join(' × ')}</small>
                    </div>
                    <div class="form-group">
                        <label>Strides:</label>
                        <div class="form-row">
                            <input type="number" id="stride-h" min="1" max="4" value="${layerConfig.strides[0]}" placeholder="Height">
                            <input type="number" id="stride-w" min="1" max="4" value="${layerConfig.strides[1]}" placeholder="Width">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Padding:</label>
                        <select id="padding-type">
                            <option value="valid" ${layerConfig.padding === 'valid' ? 'selected' : ''}>Valid (No Padding)</option>
                            <option value="same" ${layerConfig.padding === 'same' ? 'selected' : ''}>Same (Preserve Dimensions)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Activation Function:</label>
                        <select id="conv-activation">
                            <option value="relu" ${layerConfig.activation === 'relu' ? 'selected' : ''}>ReLU</option>
                            <option value="sigmoid" ${layerConfig.activation === 'sigmoid' ? 'selected' : ''}>Sigmoid</option>
                            <option value="tanh" ${layerConfig.activation === 'tanh' ? 'selected' : ''}>Tanh</option>
                            <option value="leaky_relu" ${layerConfig.activation === 'leaky_relu' ? 'selected' : ''}>Leaky ReLU</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Output Shape (calculated):</label>
                        <div class="output-shape-display" id="conv-output-shape">
                            [${outputShape.join(' × ')}]
                        </div>
                        <small>Output dimensions: H × W × Filters</small>
                    </div>
                    <div class="form-group">
                        <label>Parameters (calculated):</label>
                        <div class="parameters-display" id="conv-parameters">
                            Calculating...
                        </div>
                    </div>
                `;
                
                // Add event listeners to calculate output shape and parameters in real-time
                setTimeout(() => {
                    const inputH = document.getElementById('conv-input-h');
                    const inputW = document.getElementById('conv-input-w');
                    const inputC = document.getElementById('conv-input-c');
                    const filters = document.getElementById('conv-filters');
                    const kernelH = document.getElementById('kernel-size-h');
                    const kernelW = document.getElementById('kernel-size-w');
                    const strideH = document.getElementById('stride-h');
                    const strideW = document.getElementById('stride-w');
                    const paddingType = document.getElementById('padding-type');
                    const outputShapeDisplay = document.getElementById('conv-output-shape');
                    const parametersDisplay = document.getElementById('conv-parameters');
                    
                    const updateOutputShape = () => {
                        const h = parseInt(inputH.value);
                        const w = parseInt(inputW.value);
                        const c = parseInt(inputC.value);
                        const f = parseInt(filters.value);
                        const kh = parseInt(kernelH.value);
                        const kw = parseInt(kernelW.value);
                        const sh = parseInt(strideH.value);
                        const sw = parseInt(strideW.value);
                        const padding = paddingType.value;
                        
                        // Calculate output dimensions
                        const pH = padding === 'same' ? Math.floor(kh / 2) : 0;
                        const pW = padding === 'same' ? Math.floor(kw / 2) : 0;
                        
                        const outH = Math.floor((h - kh + 2 * pH) / sh) + 1;
                        const outW = Math.floor((w - kw + 2 * pW) / sw) + 1;
                        
                        // Update output shape display
                        outputShapeDisplay.textContent = `[${outH} × ${outW} × ${f}]`;
                        
                        // Calculate parameters
                        const params = kh * kw * c * f + f; // weights + bias
                        parametersDisplay.textContent = formatNumber(params);
                        
                        // Store for saving
                        layerConfig.inputShape = [h, w, c];
                        layerConfig.outputShape = [outH, outW, f];
                        layerConfig.parameters = params;
                    };
                    
                    // Attach event listeners to all inputs
                    [inputH, inputW, inputC, filters, kernelH, kernelW, strideH, strideW, paddingType].forEach(
                        input => input.addEventListener('input', updateOutputShape)
                    );
                    
                    // Initialize values
                    updateOutputShape();
                }, 100);
                break;
                
            case 'pool':
                // Pooling layer parameters
                // Get input and output shapes
                const poolInputShape = layerConfig.inputShape || ['?', '?', '?'];
                const poolOutputShape = layerConfig.outputShape || ['?', '?', '?'];
                
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label>Input Shape:</label>
                        <div class="form-row">
                            <input type="number" id="pool-input-h" min="1" value="${poolInputShape[0] === '?' ? 28 : poolInputShape[0]}" placeholder="Height">
                            <input type="number" id="pool-input-w" min="1" value="${poolInputShape[1] === '?' ? 28 : poolInputShape[1]}" placeholder="Width">
                            <input type="number" id="pool-input-c" min="1" value="${poolInputShape[2] === '?' ? 1 : poolInputShape[2]}" placeholder="Channels">
                        </div>
                        <small>Input dimensions: H × W × C</small>
                    </div>
                    <div class="form-group">
                        <label>Pool Size:</label>
                        <div class="form-row">
                            <input type="number" id="pool-size-h" min="1" max="4" value="${layerConfig.poolSize[0]}" placeholder="Height">
                            <input type="number" id="pool-size-w" min="1" max="4" value="${layerConfig.poolSize[1]}" placeholder="Width">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Strides:</label>
                        <div class="form-row">
                            <input type="number" id="pool-stride-h" min="1" max="4" value="${layerConfig.strides[0]}" placeholder="Height">
                            <input type="number" id="pool-stride-w" min="1" max="4" value="${layerConfig.strides[1]}" placeholder="Width">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Padding:</label>
                        <select id="pool-padding">
                            <option value="valid" ${layerConfig.padding === 'valid' ? 'selected' : ''}>Valid (No Padding)</option>
                            <option value="same" ${layerConfig.padding === 'same' ? 'selected' : ''}>Same (Preserve Dimensions)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Pool Type:</label>
                        <select id="pool-type">
                            <option value="max" selected>Max Pooling</option>
                            <option value="avg">Average Pooling</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Output Shape (calculated):</label>
                        <div class="output-shape-display" id="pool-output-shape">
                            [${poolOutputShape.join(' × ')}]
                        </div>
                        <small>Output dimensions: H × W × C</small>
                    </div>
                `;
                
                // Add event listeners to calculate output shape in real-time
                setTimeout(() => {
                    const inputH = document.getElementById('pool-input-h');
                    const inputW = document.getElementById('pool-input-w');
                    const inputC = document.getElementById('pool-input-c');
                    const poolH = document.getElementById('pool-size-h');
                    const poolW = document.getElementById('pool-size-w');
                    const strideH = document.getElementById('pool-stride-h');
                    const strideW = document.getElementById('pool-stride-w');
                    const paddingType = document.getElementById('pool-padding');
                    const outputShapeDisplay = document.getElementById('pool-output-shape');
                    
                    const updateOutputShape = () => {
                        const h = parseInt(inputH.value);
                        const w = parseInt(inputW.value);
                        const c = parseInt(inputC.value);
                        const ph = parseInt(poolH.value);
                        const pw = parseInt(poolW.value);
                        const sh = parseInt(strideH.value);
                        const sw = parseInt(strideW.value);
                        const padding = paddingType.value;
                        
                        // Calculate output dimensions
                        const padH = padding === 'same' ? Math.floor(ph / 2) : 0;
                        const padW = padding === 'same' ? Math.floor(pw / 2) : 0;
                        
                        const outH = Math.floor((h - ph + 2 * padH) / sh) + 1;
                        const outW = Math.floor((w - pw + 2 * padW) / sw) + 1;
                        
                        // Update output shape display
                        outputShapeDisplay.textContent = `[${outH} × ${outW} × ${c}]`;
                        
                        // Store for saving
                        layerConfig.inputShape = [h, w, c];
                        layerConfig.outputShape = [outH, outW, c];
                        layerConfig.parameters = 0; // Pooling has no parameters
                    };
                    
                    // Attach event listeners to all inputs
                    [inputH, inputW, inputC, poolH, poolW, strideH, strideW, paddingType].forEach(
                        input => input.addEventListener('input', updateOutputShape)
                    );
                    
                    // Initialize values
                    updateOutputShape();
                }, 100);
                break;
                
            case 'linear':
                // Linear regression layer parameters
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label>Input Features:</label>
                        <input type="number" id="input-features" min="1" value="${layerConfig.inputFeatures}" placeholder="Number of input features">
                        <small>Input shape: [${layerConfig.inputFeatures}]</small>
                    </div>
                    <div class="form-group">
                        <label>Output Features:</label>
                        <input type="number" id="output-features" min="1" value="${layerConfig.outputFeatures}" placeholder="Number of output features">
                        <small>Output shape: [${layerConfig.outputFeatures}]</small>
                    </div>
                    <div class="form-group">
                        <label>Use Bias:</label>
                        <input type="checkbox" id="linear-use-bias" ${layerConfig.useBias ? 'checked' : ''}>
                    </div>
                    <div class="form-group">
                        <label>Learning Rate:</label>
                        <input type="range" id="learning-rate-slider" min="0.001" max="0.1" step="0.001" value="${layerConfig.learningRate}">
                        <span id="learning-rate-value">${layerConfig.learningRate}</span>
                    </div>
                    <div class="form-group">
                        <label>Loss Function:</label>
                        <select id="loss-function">
                            <option value="mse" ${layerConfig.lossFunction === 'mse' ? 'selected' : ''}>Mean Squared Error</option>
                            <option value="mae" ${layerConfig.lossFunction === 'mae' ? 'selected' : ''}>Mean Absolute Error</option>
                            <option value="huber" ${layerConfig.lossFunction === 'huber' ? 'selected' : ''}>Huber Loss</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Optimizer:</label>
                        <select id="optimizer">
                            <option value="sgd" ${layerConfig.optimizer === 'sgd' ? 'selected' : ''}>Stochastic Gradient Descent</option>
                            <option value="adam" ${layerConfig.optimizer === 'adam' ? 'selected' : ''}>Adam</option>
                            <option value="rmsprop" ${layerConfig.optimizer === 'rmsprop' ? 'selected' : ''}>RMSprop</option>
                        </select>
                    </div>
                `;
                
                // Add listener for learning rate slider
                setTimeout(() => {
                    const learningRateSlider = document.getElementById('learning-rate-slider');
                    const learningRateValue = document.getElementById('learning-rate-value');
                    if (learningRateSlider && learningRateValue) {
                        learningRateSlider.addEventListener('input', (e) => {
                            learningRateValue.textContent = parseFloat(e.target.value).toFixed(3);
                        });
                    }
                }, 100);
                break;
                
            default:
                layerForm.innerHTML = '<p>No editable properties for this layer type.</p>';
        }
        
        // Add a preview of calculated parameters if available
        if (nodeType !== 'input') {
            const parameterCount = window.neuralNetwork.calculateParameters(nodeType, layerConfig);
            if (parameterCount) {
                layerForm.innerHTML += `
                    <div class="form-group">
                        <label>Parameter Summary:</label>
                        <div class="parameters-summary">
                            <p>Total parameters: <strong>${formatNumber(parameterCount)}</strong></p>
                            <p>Memory usage (32-bit): ~${formatMemorySize(parameterCount * 4)}</p>
                        </div>
                    </div>
                `;
            }
        }
        
        // Open the modal
        const modal = document.getElementById('layer-editor-modal');
        if (modal) {
            openModal(modal);
            
            // Add event listeners for the buttons in the modal footer
            const saveButton = modal.querySelector('.modal-footer .save-layer-btn');
            if (saveButton) {
                // Remove any existing event listeners
                const newSaveButton = saveButton.cloneNode(true);
                saveButton.parentNode.replaceChild(newSaveButton, saveButton);
                
                // Add new event listener
                newSaveButton.addEventListener('click', () => {
                    saveLayerConfig(node, nodeType, layerId);
                    closeModal(modal);
                });
            }
            
            const cancelButtons = modal.querySelectorAll('.modal-footer .close-modal');
            cancelButtons.forEach(cancelButton => {
                // Remove any existing event listeners
                const newCancelButton = cancelButton.cloneNode(true);
                cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
                
                // Add new event listener
                newCancelButton.addEventListener('click', () => {
                    closeModal(modal);
                });
            });
        }
    }
    
    // Save layer configuration
    function saveLayerConfig(node, nodeType, layerId) {
        // Get form values
        const form = document.querySelector('.layer-form');
        if (!form) return;
        
        const values = {};
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                values[input.id] = input.checked;
            } else {
                values[input.id] = input.value;
            }
        });
        
        // Update node configuration
        node.layerConfig = node.layerConfig || {};
        const layerConfig = node.layerConfig;
        
        switch (nodeType) {
            case 'input':
                layerConfig.shape = [
                    parseInt(values['input-height']) || 28,
                    parseInt(values['input-width']) || 28,
                    parseInt(values['input-channels']) || 1
                ];
                layerConfig.batchSize = parseInt(values['batch-size']) || 32;
                layerConfig.outputShape = layerConfig.shape;
                layerConfig.parameters = 0;
                break;
                
            case 'hidden':
                layerConfig.units = parseInt(values['hidden-units']) || 128;
                layerConfig.activation = values['hidden-activation'] || 'relu';
                layerConfig.dropoutRate = parseFloat(values['dropout-rate']) || 0.2;
                layerConfig.useBias = values['use-bias'] === true;
                layerConfig.outputShape = [layerConfig.units];
                
                // Calculate parameters if input shape is available
                if (layerConfig.inputShape) {
                    const inputUnits = Array.isArray(layerConfig.inputShape) ? 
                        layerConfig.inputShape.reduce((a, b) => a * b, 1) : layerConfig.inputShape;
                    layerConfig.parameters = (inputUnits * layerConfig.units) + (layerConfig.useBias ? layerConfig.units : 0);
                }
                break;
                
            case 'output':
                layerConfig.units = parseInt(values['output-units']) || 10;
                layerConfig.activation = values['output-activation'] || 'softmax';
                layerConfig.useBias = values['output-use-bias'] === true;
                layerConfig.outputShape = [layerConfig.units];
                
                // Calculate parameters if input shape is available
                if (layerConfig.inputShape) {
                    const inputUnits = Array.isArray(layerConfig.inputShape) ? 
                        layerConfig.inputShape.reduce((a, b) => a * b, 1) : layerConfig.inputShape;
                    layerConfig.parameters = (inputUnits * layerConfig.units) + (layerConfig.useBias ? layerConfig.units : 0);
                }
                break;
                
            case 'conv':
                // Process input shape if available in form
                if (values['conv-input-h'] && values['conv-input-w'] && values['conv-input-c']) {
                    layerConfig.inputShape = [
                        parseInt(values['conv-input-h']) || 28,
                        parseInt(values['conv-input-w']) || 28,
                        parseInt(values['conv-input-c']) || 1
                    ];
                }
                
                // Process configuration
                layerConfig.filters = parseInt(values['conv-filters']) || 32;
                layerConfig.kernelSize = [
                    parseInt(values['kernel-size-h']) || 3,
                    parseInt(values['kernel-size-w']) || 3
                ];
                layerConfig.strides = [
                    parseInt(values['stride-h']) || 1,
                    parseInt(values['stride-w']) || 1
                ];
                layerConfig.padding = values['padding-type'] || 'valid';
                layerConfig.activation = values['conv-activation'] || 'relu';
                layerConfig.useBias = true; // Default to true for CNN
                
                // Calculate output shape if input shape is available
                if (layerConfig.inputShape) {
                    const padding = layerConfig.padding === 'same' ? 
                        Math.floor(layerConfig.kernelSize[0] / 2) : 0;
                        
                    const outH = Math.floor(
                        (layerConfig.inputShape[0] - layerConfig.kernelSize[0] + 2 * padding) / 
                        layerConfig.strides[0]
                    ) + 1;
                    
                    const outW = Math.floor(
                        (layerConfig.inputShape[1] - layerConfig.kernelSize[1] + 2 * padding) / 
                        layerConfig.strides[1]
                    ) + 1;
                    
                    layerConfig.outputShape = [outH, outW, layerConfig.filters];
                    
                    // Calculate parameters
                    const kernelParams = layerConfig.kernelSize[0] * layerConfig.kernelSize[1] * 
                                        layerConfig.inputShape[2] * layerConfig.filters;
                    const biasParams = layerConfig.filters;
                    layerConfig.parameters = kernelParams + biasParams;
                }
                break;
                
            case 'pool':
                // Process input shape if available in form
                if (values['pool-input-h'] && values['pool-input-w'] && values['pool-input-c']) {
                    layerConfig.inputShape = [
                        parseInt(values['pool-input-h']) || 28,
                        parseInt(values['pool-input-w']) || 28,
                        parseInt(values['pool-input-c']) || 1
                    ];
                }
                
                // Process configuration
                layerConfig.poolSize = [
                    parseInt(values['pool-size-h']) || 2,
                    parseInt(values['pool-size-w']) || 2
                ];
                layerConfig.strides = [
                    parseInt(values['pool-stride-h']) || 2,
                    parseInt(values['pool-stride-w']) || 2
                ];
                layerConfig.padding = values['pool-padding'] || 'valid';
                layerConfig.poolType = values['pool-type'] || 'max';
                
                // Calculate output shape if input shape is available
                if (layerConfig.inputShape) {
                    const poolPadding = layerConfig.padding === 'same' ? 
                        Math.floor(layerConfig.poolSize[0] / 2) : 0;
                        
                    const poolOutH = Math.floor(
                        (layerConfig.inputShape[0] - layerConfig.poolSize[0] + 2 * poolPadding) / 
                        layerConfig.strides[0]
                    ) + 1;
                    
                    const poolOutW = Math.floor(
                        (layerConfig.inputShape[1] - layerConfig.poolSize[1] + 2 * poolPadding) / 
                        layerConfig.strides[1]
                    ) + 1;
                    
                    layerConfig.outputShape = [poolOutH, poolOutW, layerConfig.inputShape[2]];
                }
                
                // Pooling has no parameters
                layerConfig.parameters = 0;
                break;
                
            case 'linear':
                layerConfig.inputFeatures = parseInt(values['input-features']) || 1;
                layerConfig.outputFeatures = parseInt(values['output-features']) || 1;
                layerConfig.useBias = values['linear-use-bias'] === true;
                layerConfig.learningRate = parseFloat(values['learning-rate-slider']) || 0.01;
                layerConfig.activation = values['linear-activation'] || 'linear';
                layerConfig.optimizer = values['optimizer'] || 'sgd';
                layerConfig.lossFunction = values['loss-function'] || 'mse';
                layerConfig.inputShape = [layerConfig.inputFeatures];
                layerConfig.outputShape = [layerConfig.outputFeatures];
                
                // Calculate parameters
                layerConfig.parameters = layerConfig.inputFeatures * layerConfig.outputFeatures;
                if (layerConfig.useBias) {
                    layerConfig.parameters += layerConfig.outputFeatures;
                }
                break;
        }
        
        // Update node title
        const nodeTitle = node.querySelector('.node-title');
        if (nodeTitle) {
            nodeTitle.textContent = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
        }
        
        // Update node data attribute
        node.setAttribute('data-name', nodeType.charAt(0).toUpperCase() + nodeType.slice(1));
        
        // Update dimensions and parameter display based on layer type
        let dimensions = '';
        switch (nodeType) {
            case 'input':
                dimensions = layerConfig.shape.join(' × ');
                break;
                
            case 'hidden':
            case 'output':
                dimensions = layerConfig.units.toString();
                break;
                
            case 'conv':
                if (layerConfig.inputShape && layerConfig.outputShape) {
                    // Show input -> output shape transformation
                    dimensions = `${layerConfig.inputShape[0]}×${layerConfig.inputShape[1]}×${layerConfig.inputShape[2]} → ${layerConfig.outputShape[0]}×${layerConfig.outputShape[1]}×${layerConfig.outputShape[2]}`;
                } else {
                    dimensions = `? → ${layerConfig.filters} filters`;
                }
                break;
                
            case 'pool':
                if (layerConfig.inputShape && layerConfig.outputShape) {
                    // Show input -> output shape transformation
                    dimensions = `${layerConfig.inputShape[0]}×${layerConfig.inputShape[1]}×${layerConfig.inputShape[2]} → ${layerConfig.outputShape[0]}×${layerConfig.outputShape[1]}×${layerConfig.outputShape[2]}`;
                } else {
                    dimensions = `? → ?`;
                }
                break;
                
            case 'linear':
                dimensions = `${layerConfig.inputFeatures} → ${layerConfig.outputFeatures}`;
                break;
        }
        
        // Update node dimensions display
        const nodeDimensions = node.querySelector('.node-dimensions');
        if (nodeDimensions) {
            nodeDimensions.textContent = dimensions;
        }
        
        // Update parameters display if available
        const nodeParameters = node.querySelector('.node-parameters');
        if (nodeParameters && layerConfig.parameters !== undefined) {
            nodeParameters.textContent = `Params: ${formatNumber(layerConfig.parameters)}`;
        } else if (nodeParameters) {
            nodeParameters.textContent = 'Params: ?';
        }
        
        // Update node data attribute
        node.setAttribute('data-dimensions', dimensions);
        
        // Update network layers in drag-drop module
        const networkLayers = window.dragDrop.getNetworkArchitecture();
        const layerIndex = networkLayers.layers.findIndex(layer => layer.id === layerId);
        
        if (layerIndex !== -1) {
            networkLayers.layers[layerIndex].name = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
            networkLayers.layers[layerIndex].dimensions = dimensions;
            networkLayers.layers[layerIndex].config = layerConfig;
            
            // Add parameter count to the layer
            networkLayers.layers[layerIndex].parameters = layerConfig.parameters;
        }
        
        // Find all connections from this node and update target nodes
        const connections = document.querySelectorAll(`.connection[data-source="${layerId}"]`);
        connections.forEach(connection => {
            const targetId = connection.getAttribute('data-target');
            const targetNode = document.querySelector(`.canvas-node[data-id="${targetId}"]`);
            
            if (targetNode && targetNode.layerConfig) {
                // Update target node's input shape based on this node's output shape
                if (layerConfig.outputShape) {
                    targetNode.layerConfig.inputShape = layerConfig.outputShape;
                    
                    // Recalculate parameters
                    const targetType = targetNode.getAttribute('data-type');
                    const newParams = window.neuralNetwork.calculateParameters(
                        targetType,
                        targetNode.layerConfig,
                        layerConfig
                    );
                    
                    if (newParams) {
                        targetNode.layerConfig.parameters = newParams;
                        
                        // Update parameter display
                        const paramsDisplay = targetNode.querySelector('.node-parameters');
                        if (paramsDisplay) {
                            paramsDisplay.textContent = `Params: ${formatNumber(newParams)}`;
                        }
                        
                        // Update input shape display
                        const inputShapeDisplay = targetNode.querySelector('.input-shape');
                        if (inputShapeDisplay) {
                            inputShapeDisplay.textContent = `[${targetNode.layerConfig.inputShape.join(' × ')}]`;
                        }
                    }
                }
            }
        });
        
        // Trigger network updated event
        const event = new CustomEvent('networkUpdated', { detail: networkLayers });
        document.dispatchEvent(event);
        
        // Update all connections to reflect the new shapes and positions
        window.dragDrop.updateConnections();
    }
    
    // Helper function to update connections between nodes when shapes change
    function updateNodeConnections(sourceNode, sourceId) {
        // Find all connections from this source node
        const connections = document.querySelectorAll(`.connection[data-source="${sourceId}"]`);
        
        connections.forEach(connection => {
            const targetId = connection.getAttribute('data-target');
            const targetNode = document.querySelector(`.canvas-node[data-id="${targetId}"]`);
            
            if (targetNode && sourceNode.layerConfig && sourceNode.layerConfig.outputShape) {
                // Update target node with source node's output shape as its input shape
                if (!targetNode.layerConfig) {
                    targetNode.layerConfig = {};
                }
                
                targetNode.layerConfig.inputShape = sourceNode.layerConfig.outputShape;
                
                // Update parameter calculation
                window.neuralNetwork.calculateParameters(
                    targetNode.getAttribute('data-type'),
                    targetNode.layerConfig,
                    sourceNode.layerConfig
                );
                
                // Update display
                updateNodeDisplay(targetNode);
                
                // Recursively update downstream nodes
                updateNodeConnections(targetNode, targetId);
            }
        });
    }
    
    // Helper function to update a node's display
    function updateNodeDisplay(node) {
        if (!node || !node.layerConfig) return;
        
        const nodeType = node.getAttribute('data-type');
        const layerConfig = node.layerConfig;
        
        // Create dimensions string
        let dimensions = '';
        switch (nodeType) {
            case 'conv':
            case 'pool':
                if (layerConfig.inputShape && layerConfig.outputShape) {
                    dimensions = `${layerConfig.inputShape[0]}×${layerConfig.inputShape[1]}×${layerConfig.inputShape[2]} → ${layerConfig.outputShape[0]}×${layerConfig.outputShape[1]}×${layerConfig.outputShape[2]}`;
                }
                break;
                
            case 'hidden':
            case 'output':
                dimensions = layerConfig.units.toString();
                break;
                
            case 'linear':
                dimensions = `${layerConfig.inputFeatures} → ${layerConfig.outputFeatures}`;
                break;
        }
        
        // Update dimensions display
        if (dimensions) {
            const nodeDimensions = node.querySelector('.node-dimensions');
            if (nodeDimensions) {
                nodeDimensions.textContent = dimensions;
                node.setAttribute('data-dimensions', dimensions);
            }
        }
        
        // Update parameters display
        if (layerConfig.parameters !== undefined) {
            const nodeParameters = node.querySelector('.node-parameters');
            if (nodeParameters) {
                nodeParameters.textContent = `Params: ${formatNumber(layerConfig.parameters)}`;
            }
        }
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
        console.log('Running neural network simulation with config:', window.networkConfig);
        
        // Get the current network architecture if possible
        let networkLayers = { layers: [], connections: [] };
        
        if (window.dragDrop && typeof window.dragDrop.getNetworkArchitecture === 'function') {
            try {
                networkLayers = window.dragDrop.getNetworkArchitecture();
                console.log('Network architecture retrieved:', networkLayers);
            } catch (error) {
                console.error('Error getting network architecture:', error);
            }
        } else {
            console.warn('dragDrop.getNetworkArchitecture is not available, using fallback');
            
            // Fallback: Get nodes and connections manually
            const canvas = document.getElementById('network-canvas');
            if (canvas) {
                const nodes = canvas.querySelectorAll('.canvas-node');
                const connections = canvas.querySelectorAll('.connection');
                
                if (nodes.length === 0) {
                    alert('Please add some nodes to the network first!');
                    return;
                }
                
                // Just animate what's visible on the canvas
                console.log(`Found ${nodes.length} nodes and ${connections.length} connections on canvas`);
            }
        }
        
        // Check if we have a valid network
        if (networkLayers.layers.length === 0) {
            // Check for nodes on the canvas directly
            const canvas = document.getElementById('network-canvas');
            const nodes = canvas ? canvas.querySelectorAll('.canvas-node') : [];
            
            if (nodes.length === 0) {
                alert('Please add some nodes to the network first!');
                return;
            }
        }
        
        // Validate the network if possible
        let validationResult = { valid: true, errors: [] };
        
        if (window.neuralNetwork && typeof window.neuralNetwork.validateNetwork === 'function') {
            try {
                validationResult = window.neuralNetwork.validateNetwork(
                    networkLayers.layers,
                    networkLayers.connections
                );
                
                if (!validationResult.valid) {
                    alert('Network is not valid: ' + validationResult.errors.join('\n'));
                    return;
                }
            } catch (error) {
                console.error('Error validating network:', error);
                // Continue anyway since we'll just animate
            }
        } else {
            console.warn('neuralNetwork.validateNetwork is not available, skipping validation');
        }
        
        // Add animation class to all nodes
        const nodes = document.querySelectorAll('.canvas-node');
        nodes.forEach(node => {
            node.classList.add('highlight-pulse');
            
            // Add a delay to remove the animation class
            setTimeout(() => {
                node.classList.remove('highlight-pulse');
            }, 1500);
        });
        
        // Animate connections to show data flow
        document.querySelectorAll('.connection').forEach((conn, index) => {
            // Apply sequential animation to show data flow direction
            setTimeout(() => {
                conn.style.transition = 'box-shadow 0.3s ease-in-out';
                conn.style.boxShadow = '0 0 15px rgba(52, 152, 219, 0.8)';
                
                // Add a delay to remove the highlight
                setTimeout(() => {
                    conn.style.boxShadow = '0 0 8px rgba(52, 152, 219, 0.5)';
                }, 600);
            }, index * 150); // Stagger the animations
        });
        
        // Update training progress visualization
        simulateTrainingProgress();
        
        console.log('Network animation complete');
    }
    
    // Simulate training progress for visualization
    function simulateTrainingProgress() {
        const progressBar = document.querySelector('.progress-bar');
        const lossValue = document.getElementById('loss-value');
        const accuracyValue = document.getElementById('accuracy-value');
        
        if (progressBar && lossValue && accuracyValue) {
            // Reset progress bar
            progressBar.style.width = '0%';
            lossValue.textContent = '1.0000';
            accuracyValue.textContent = '0%';
            
            // Simulate training progress with animation
            let progress = 0;
            let loss = 1.0;
            let accuracy = 0.0;
            
            const interval = setInterval(() => {
                progress += 2;
                loss = Math.max(0.05, loss * 0.95);
                accuracy = Math.min(99, accuracy + 2);
                
                progressBar.style.width = `${progress}%`;
                lossValue.textContent = loss.toFixed(4);
                accuracyValue.textContent = `${accuracy.toFixed(1)}%`;
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Final values
                    lossValue.textContent = '0.0342';
                    accuracyValue.textContent = '98.7%';
                    
                    console.log('Training simulation complete');
                }
            }, 50);
        }
    }
    
    // Function to clear all nodes from the canvas
    function clearCanvas() {
        // Show confirmation dialog
        if (confirm('Are you sure you want to clear the canvas? This will remove all nodes and connections.')) {
            // Use the drag-drop module's clear function if available
            if (window.dragDrop && typeof window.dragDrop.clearAllNodes === 'function') {
                window.dragDrop.clearAllNodes();
            } else {
                // Fallback: manually remove all canvas nodes
                const canvas = document.getElementById('network-canvas');
                const nodes = canvas.querySelectorAll('.canvas-node');
                const connections = canvas.querySelectorAll('.connection');
                
                // Remove all connections
                connections.forEach(conn => conn.remove());
                
                // Remove all nodes
                nodes.forEach(node => node.remove());
                
                // Add canvas hint
                if (canvas.querySelector('.canvas-hint') === null) {
                    const hint = document.createElement('div');
                    hint.className = 'canvas-hint';
                    hint.innerHTML = `
                        <strong>Build Your Neural Network</strong>
                        Drag components from the left panel and drop them here.
                        <br>Connect them by dragging from output (right) to input (left) ports.
                    `;
                    canvas.appendChild(hint);
                }
                
                console.log('Canvas cleared manually');
            }
            
            // Reset progress indicators
            const progressBar = document.querySelector('.progress-bar');
            const lossValue = document.getElementById('loss-value');
            const accuracyValue = document.getElementById('accuracy-value');
            
            if (progressBar) progressBar.style.width = '0%';
            if (lossValue) lossValue.textContent = '-';
            if (accuracyValue) accuracyValue.textContent = '-';
            
            console.log('Canvas cleared and progress indicators reset');
        }
    }
    
    // Update activation function graph
    function updateActivationFunctionGraph(activationType) {
        const activationGraph = document.querySelector('.activation-graph');
        if (!activationGraph) return;
        
        // Get SVG element
        const svg = activationGraph.querySelector('.activation-curve');
        if (!svg) return;
        
        // Clear previous paths
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        
        // Create path for the activation function
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke', '#3498db');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        
        // Draw axes
        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xAxis.setAttribute('x1', '0');
        xAxis.setAttribute('y1', '50');
        xAxis.setAttribute('x2', '100');
        xAxis.setAttribute('y2', '50');
        xAxis.setAttribute('stroke', '#ccc');
        xAxis.setAttribute('stroke-width', '1');
        
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', '50');
        yAxis.setAttribute('y1', '0');
        yAxis.setAttribute('x2', '50');
        yAxis.setAttribute('y2', '100');
        yAxis.setAttribute('stroke', '#ccc');
        yAxis.setAttribute('stroke-width', '1');
        
        // Add axes to SVG
        svg.appendChild(xAxis);
        svg.appendChild(yAxis);
        
        // Calculate path based on activation type
        let pathData = '';
        
        switch(activationType) {
            case 'relu':
                pathData = 'M0,50 L50,50 L100,0';
                break;
                
            case 'sigmoid':
                pathData = generateSigmoidPath();
                break;
                
            case 'tanh':
                pathData = generateTanhPath();
                break;
                
            default: // Linear
                pathData = 'M0,80 L100,20';
        }
        
        path.setAttribute('d', pathData);
        svg.appendChild(path);
        
        // Add label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', '50');
        label.setAttribute('y', '95');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '10');
        label.setAttribute('fill', '#333');
        label.textContent = activationType.charAt(0).toUpperCase() + activationType.slice(1);
        
        svg.appendChild(label);
        
        console.log(`Activation function graph updated: ${activationType}`);
    }
    
    // Generate path data for sigmoid function
    function generateSigmoidPath() {
        let pathData = '';
        
        for (let x = 0; x <= 100; x += 2) {
            const normalizedX = (x / 100 - 0.5) * 10;
            const sigmoidY = 1 / (1 + Math.exp(-normalizedX));
            const y = 100 - sigmoidY * 100;
            
            if (x === 0) pathData += `M${x},${y}`;
            else pathData += ` L${x},${y}`;
        }
        
        return pathData;
    }
    
    // Generate path data for tanh function
    function generateTanhPath() {
        let pathData = '';
        
        for (let x = 0; x <= 100; x += 2) {
            const normalizedX = (x / 100 - 0.5) * 6;
            const tanhY = Math.tanh(normalizedX);
            const y = 50 - tanhY * 50;
            
            if (x === 0) pathData += `M${x},${y}`;
            else pathData += ` L${x},${y}`;
        }
        
        return pathData;
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