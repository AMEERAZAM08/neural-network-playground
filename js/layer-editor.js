/**
 * Layer Editor for Neural Network Playground
 * Handles editing of layer parameters through a modal interface
 */

(function() {
    console.log('Loading layer editor...');
    
    // Run immediately, don't wait for DOMContentLoaded
    initializeLayerEditor();
    
    function initializeLayerEditor() {
        // Get modal elements
        const modal = document.getElementById('layer-editor-modal');
        const form = modal.querySelector('.layer-form');
        const saveButton = modal.querySelector('.save-layer-btn');
        const closeButtons = modal.querySelectorAll('.close-modal');
        const modalTitle = modal.querySelector('.modal-title');
        
        if (!modal || !form) {
            console.error('Layer editor modal elements not found!');
            return;
        }
        
        // Current node being edited
        let currentNode = null;
        let currentConfig = null;
        
        // DEBUG: Log when script is loaded
        console.log('Layer editor initialized, waiting for openLayerEditor events', modal);
        
        // Listen for clicks on edit buttons directly
        document.addEventListener('click', function(e) {
            // Check if click was on an edit button
            if (e.target.classList.contains('node-edit-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Find the node
                const node = e.target.closest('.canvas-node');
                if (!node) {
                    console.error('Could not find node for edit button');
                    return;
                }
                
                // Get node info
                const nodeId = node.getAttribute('data-id');
                const nodeType = node.getAttribute('data-type');
                const nodeName = node.getAttribute('data-name') || node.querySelector('.node-title').textContent;
                
                console.log('Edit button clicked for node', nodeId, nodeType);
                
                // Store reference to current node and its config
                currentNode = node;
                currentConfig = node.layerConfig || {};
                
                // Update modal title
                modalTitle.textContent = `Edit ${nodeName || 'Layer'}`;
                
                // Generate form based on node type
                generateFormFields(form, nodeType, currentConfig);
                
                // Show modal with debuggable visible class
                modal.style.display = 'block';
                modal.setAttribute('data-visible', 'true');
                
                // Force reflow to ensure display takes effect
                void modal.offsetWidth;
                
                // Add active class for transition
                modal.classList.add('active');
            }
        });
        
        // Also listen for the openLayerEditor event (fallback)
        document.addEventListener('openLayerEditor', function(e) {
            const detail = e.detail;
            
            if (!detail || !detail.node) {
                console.error('Invalid layer editor data', detail);
                return;
            }
            
            console.log('openLayerEditor event received:', detail);
            
            // Store reference to current node and its config
            currentNode = detail.node;
            currentConfig = currentNode.layerConfig || {};
            
            // Update modal title
            modalTitle.textContent = `Edit ${detail.name || 'Layer'}`;
            
            // Generate form based on node type
            generateFormFields(form, detail.type, currentConfig);
            
            // Show modal
            modal.style.display = 'block';
            modal.setAttribute('data-visible', 'true');
            
            // Force reflow to ensure display takes effect
            void modal.offsetWidth;
            
            // Add active class for transition
            modal.classList.add('active');
            
            console.log('Opened layer editor for', detail.id, detail.type);
        });
        
        // Close modal when clicking close button or outside the modal
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.removeAttribute('data-visible');
                }, 300); // Match transition duration from CSS
            });
        });
        
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.removeAttribute('data-visible');
                }, 300);
            }
        });
        
        // Handle form submission
        saveButton.addEventListener('click', function() {
            if (!currentNode || !currentConfig) {
                console.error('No node selected for editing');
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                    modal.removeAttribute('data-visible');
                }, 300);
                return;
            }
            
            // Get updated values from form
            const formData = new FormData(form);
            const updatedConfig = { ...currentConfig };
            
            // Update config based on node type
            const nodeType = currentNode.getAttribute('data-type');
            
            // Process form data
            for (let [key, value] of formData.entries()) {
                // Handle arrays (from comma-separated values)
                if (key.endsWith('[]') && typeof value === 'string') {
                    const arrayKey = key.slice(0, -2);
                    // Parse array values more carefully - ensuring we get numbers
                    const values = value.split(',')
                        .map(v => {
                            const parsed = parseFloat(v.trim());
                            return isNaN(parsed) ? 0 : parsed; // Convert NaN to 0
                        });
                    updatedConfig[arrayKey] = values;
                    console.log(`Parsed array for ${arrayKey}:`, values);
                } 
                // Convert numeric values - more aggressively ensure integers for specific fields
                else if (key === 'filters' || key === 'units') {
                    updatedConfig[key] = parseInt(value) || (key === 'filters' ? 32 : key === 'units' ? 64 : 0);
                    console.log(`Parsed ${key} as integer:`, updatedConfig[key]);
                }
                // Other numeric values
                else if (!isNaN(value) && value !== '') {
                    updatedConfig[key] = parseFloat(value);
                } 
                // Everything else as-is
                else {
                    updatedConfig[key] = value;
                }
            }
            
            console.log('Updated config:', updatedConfig);
            
            // Update node with new config
            updateNodeWithConfig(currentNode, nodeType, updatedConfig);
            
            // Close modal
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                modal.removeAttribute('data-visible');
            }, 300);
            
            // Clear references
            currentNode = null;
            currentConfig = null;
        });
        
        console.log('Layer editor initialized and listeners attached');
    }
    
    /**
     * Generate form fields based on node type
     */
    function generateFormFields(form, nodeType, config) {
        // Clear existing form
        form.innerHTML = '';
        
        console.log('Generating form fields for', nodeType, 'with config', config);
        
        // Add output shape field to all node types
        const currentOutputShape = (config.outputShape || []).join(',');
        
        switch (nodeType) {
            case 'input':
                addFormField(form, 'Shape', 'shape[]', (config.shape || [28, 28, 1]).join(','), 'The input dimensions (e.g., 28,28,1 for MNIST images)');
                addFormField(form, 'Output Shape', 'outputShape[]', currentOutputShape, 'Manual override for output shape (normally matches input shape)');
                break;
                
            case 'hidden':
                addFormField(form, 'Units', 'units', config.units || 128, 'Number of neurons in this layer');
                addFormField(form, 'Activation', 'activation', config.activation || 'relu', 'Activation function', 'select', {
                    options: ['relu', 'sigmoid', 'tanh', 'leaky_relu', 'linear']
                });
                addFormField(form, 'Output Shape', 'outputShape[]', currentOutputShape, 'Manual override for output shape (normally [units])');
                break;
                
            case 'output':
                addFormField(form, 'Units', 'units', config.units || 10, 'Number of output neurons (e.g., 10 for MNIST)');
                addFormField(form, 'Activation', 'activation', config.activation || 'softmax', 'Activation function', 'select', {
                    options: ['softmax', 'sigmoid', 'linear']
                });
                addFormField(form, 'Output Shape', 'outputShape[]', currentOutputShape, 'Manual override for output shape (normally [units])');
                break;
                
            case 'conv':
                addFormField(form, 'Filters', 'filters', config.filters || 32, 'Number of filters (output channels)');
                addFormField(form, 'Kernel Size', 'kernelSize[]', (config.kernelSize || [3, 3]).join(','), 'Size of the convolution kernel (e.g., 3,3)');
                addFormField(form, 'Strides', 'strides[]', (config.strides || [1, 1]).join(','), 'Stride of the convolution (e.g., 1,1)');
                addFormField(form, 'Padding', 'padding', config.padding || 'same', 'Padding method', 'select', {
                    options: ['same', 'valid']
                });
                addFormField(form, 'Activation', 'activation', config.activation || 'relu', 'Activation function', 'select', {
                    options: ['relu', 'sigmoid', 'tanh', 'leaky_relu', 'linear']
                });
                addFormField(form, 'Output Shape', 'outputShape[]', currentOutputShape, 'Manual override for calculated output shape');
                break;
                
            case 'pool':
                addFormField(form, 'Pool Size', 'poolSize[]', (config.poolSize || [2, 2]).join(','), 'Size of the pooling window (e.g., 2,2)');
                addFormField(form, 'Strides', 'strides[]', (config.strides || [2, 2]).join(','), 'Stride of the pooling operation (e.g., 2,2)');
                addFormField(form, 'Padding', 'padding', config.padding || 'valid', 'Padding method', 'select', {
                    options: ['same', 'valid']
                });
                addFormField(form, 'Pool Type', 'poolType', config.poolType || 'max', 'Type of pooling', 'select', {
                    options: ['max', 'average']
                });
                addFormField(form, 'Output Shape', 'outputShape[]', currentOutputShape, 'Manual override for calculated output shape');
                break;
            
            case 'lstm':
                addFormField(form, 'Units', 'units', config.units || 64, 'Number of LSTM units');
                addFormField(form, 'Return Sequences', 'returnSequences', config.returnSequences !== false ? 'true' : 'false', 'Return the full sequence or just the final state', 'select', {
                    options: ['true', 'false']
                });
                addFormField(form, 'Activation', 'activation', config.activation || 'tanh', 'Activation function', 'select', {
                    options: ['tanh', 'relu', 'sigmoid']
                });
                addFormField(form, 'Recurrent Activation', 'recurrentActivation', config.recurrentActivation || 'sigmoid', 'Recurrent activation function', 'select', {
                    options: ['sigmoid', 'tanh', 'relu']
                });
                addFormField(form, 'Use Bias', 'useBias', config.useBias !== false ? 'true' : 'false', 'Include bias terms', 'select', {
                    options: ['true', 'false']
                });
                addFormField(form, 'Output Shape', 'outputShape[]', currentOutputShape, 'Manual override for calculated output shape');
                break;
            
            case 'rnn':
                addFormField(form, 'Units', 'units', config.units || 32, 'Number of RNN units');
                addFormField(form, 'Return Sequences', 'returnSequences', config.returnSequences !== false ? 'true' : 'false', 'Return the full sequence or just the final state', 'select', {
                    options: ['true', 'false']
                });
                addFormField(form, 'Activation', 'activation', config.activation || 'tanh', 'Activation function', 'select', {
                    options: ['tanh', 'relu', 'sigmoid']
                });
                addFormField(form, 'Use Bias', 'useBias', config.useBias !== false ? 'true' : 'false', 'Include bias terms', 'select', {
                    options: ['true', 'false']
                });
                addFormField(form, 'Output Shape', 'outputShape[]', currentOutputShape, 'Manual override for calculated output shape');
                break;
            
            case 'gru':
                addFormField(form, 'Units', 'units', config.units || 48, 'Number of GRU units');
                addFormField(form, 'Return Sequences', 'returnSequences', config.returnSequences !== false ? 'true' : 'false', 'Return the full sequence or just the final state', 'select', {
                    options: ['true', 'false']
                });
                addFormField(form, 'Activation', 'activation', config.activation || 'tanh', 'Activation function', 'select', {
                    options: ['tanh', 'relu', 'sigmoid']
                });
                addFormField(form, 'Recurrent Activation', 'recurrentActivation', config.recurrentActivation || 'sigmoid', 'Recurrent activation function', 'select', {
                    options: ['sigmoid', 'tanh', 'relu']
                });
                addFormField(form, 'Use Bias', 'useBias', config.useBias !== false ? 'true' : 'false', 'Include bias terms', 'select', {
                    options: ['true', 'false']
                });
                addFormField(form, 'Output Shape', 'outputShape[]', currentOutputShape, 'Manual override for calculated output shape');
                break;
            
            default:
                form.innerHTML = '<p>No editable parameters for this layer type.</p>';
        }
    }
    
    /**
     * Add a form field to the form
     */
    function addFormField(form, label, name, value, helpText, type = 'text', options = {}) {
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'form-field';
        
        const labelElem = document.createElement('label');
        labelElem.textContent = label;
        labelElem.setAttribute('for', name);
        
        let inputElem;
        
        if (type === 'select') {
            inputElem = document.createElement('select');
            inputElem.name = name;
            inputElem.id = name;
            
            if (options.options) {
                options.options.forEach(option => {
                    const optionElem = document.createElement('option');
                    optionElem.value = option;
                    optionElem.textContent = option;
                    
                    if (option === value) {
                        optionElem.selected = true;
                    }
                    
                    inputElem.appendChild(optionElem);
                });
            }
        } else {
            inputElem = document.createElement('input');
            inputElem.type = type;
            inputElem.name = name;
            inputElem.id = name;
            inputElem.value = value;
            
            if (options.min !== undefined) inputElem.min = options.min;
            if (options.max !== undefined) inputElem.max = options.max;
            if (options.step !== undefined) inputElem.step = options.step;
        }
        
        const helpElem = document.createElement('small');
        helpElem.className = 'help-text';
        helpElem.textContent = helpText;
        
        fieldContainer.appendChild(labelElem);
        fieldContainer.appendChild(inputElem);
        fieldContainer.appendChild(helpElem);
        
        form.appendChild(fieldContainer);
    }
    
    /**
     * Update node with new configuration
     */
    function updateNodeWithConfig(node, nodeType, config) {
        if (!node) {
            console.error('Cannot update node: Node is null');
            return;
        }
        
        console.log(`Starting to update node ${node.getAttribute('data-id')} of type ${nodeType}`, config);
        
        // Store updated config on the node
        node.layerConfig = { ...config }; // Create a copy to avoid reference issues
        
        // Get node elements
        const nodeId = node.getAttribute('data-id');
        const inputShapeDisplay = node.querySelector('.input-shape');
        const outputShapeDisplay = node.querySelector('.output-shape');
        const paramsDisplay = node.querySelector('.node-parameters');
        const dimensionsDisplay = node.querySelector('.node-dimensions');
        const paramsDetailsDisplay = node.querySelector('.params-details');
        
        // Debug check
        if (!inputShapeDisplay || !outputShapeDisplay || !paramsDisplay) {
            console.warn('Some node displays not found:', {
                inputShapeDisplay,
                outputShapeDisplay,
                paramsDisplay
            });
        }
        
        // Handle manual output shape override first
        let manualOutputShape = null;
        if (config.outputShape && Array.isArray(config.outputShape) && config.outputShape.length > 0 
            && config.outputShape.some(dim => dim !== '?' && dim !== '')) {
            // User has provided a manual output shape
            manualOutputShape = [...config.outputShape];
            console.log('Manual output shape provided:', manualOutputShape);
        }
        
        // Update output shape and parameters
        let outputShape = manualOutputShape || config.outputShape;
        let parameters = config.parameters;
        let inputShape = config.inputShape;
        
        console.log('Before calculating: outputShape =', outputShape, 'parameters =', parameters);
        
        // Get connections to find input shape if not present
        if (!inputShape && window.dragDrop && window.dragDrop.getNetworkArchitecture) {
            const networkLayers = window.dragDrop.getNetworkArchitecture();
            const connections = networkLayers.connections || [];
            const targetsThisNode = connections.filter(conn => conn.target === nodeId);
            
            if (targetsThisNode.length > 0) {
                // Find the source node's output shape
                const sourceId = targetsThisNode[0].source;
                const sourceLayer = networkLayers.layers.find(layer => layer.id === sourceId);
                if (sourceLayer && sourceLayer.config && sourceLayer.config.outputShape) {
                    inputShape = [...sourceLayer.config.outputShape];
                    config.inputShape = inputShape;
                    console.log('Found input shape from connections:', inputShape);
                }
            }
        }
        
        // Try to calculate new output shape and parameters only if manual output shape is not provided
        if (!manualOutputShape && window.neuralNetwork) {
            console.log('Using neural network module to calculate shapes and parameters');
            if (window.neuralNetwork.calculateOutputShape) {
                try {
                    const newOutputShape = window.neuralNetwork.calculateOutputShape(config, nodeType);
                    if (newOutputShape) {
                        outputShape = newOutputShape;
                        config.outputShape = newOutputShape;
                        console.log('Calculated output shape:', outputShape);
                    }
                } catch (error) {
                    console.error('Error calculating output shape:', error);
                }
            }
            
            if (window.neuralNetwork.calculateParameters) {
                try {
                    const newParameters = window.neuralNetwork.calculateParameters(config, nodeType);
                    if (newParameters !== undefined) {
                        parameters = newParameters;
                        config.parameters = newParameters;
                        console.log('Calculated parameters:', parameters);
                    }
                } catch (error) {
                    console.error('Error calculating parameters:', error);
                }
            }
        } else if (!manualOutputShape) {
            // Perform basic calculations based on node type only if manual shape isn't provided
            console.log('Falling back to basic parameter calculations');
            
            switch (nodeType) {
                case 'input':
                    if (!manualOutputShape) {
                        outputShape = config.shape;
                    }
                    parameters = 0;
                    break;
                    
                case 'hidden':
                    const units = parseInt(config.units) || 128;
                    if (!manualOutputShape) {
                        outputShape = [units];
                    }
                    if (inputShape) {
                        const inputSize = inputShape.reduce((a, b) => a * b, 1);
                        parameters = inputSize * units + units; // weights + biases
                        console.log(`Hidden layer params: ${inputSize} inputs × ${units} units + ${units} biases = ${parameters}`);
                    } else {
                        console.log('No input shape available for hidden layer parameter calculation');
                        parameters = units; // Just biases if we don't know input size
                    }
                    break;
                    
                case 'output':
                    const outUnits = parseInt(config.units) || 10;
                    if (!manualOutputShape) {
                        outputShape = [outUnits];
                    }
                    if (inputShape) {
                        const inputSize = inputShape.reduce((a, b) => a * b, 1);
                        parameters = inputSize * outUnits + outUnits; // weights + biases
                        console.log(`Output layer params: ${inputSize} inputs × ${outUnits} units + ${outUnits} biases = ${parameters}`);
                    } else {
                        console.log('No input shape available for output layer parameter calculation');
                        parameters = outUnits; // Just biases if we don't know input size
                    }
                    break;
                    
                case 'conv':
                    if (inputShape && inputShape.length >= 3 && !manualOutputShape) {
                        // Very explicit type conversion - ensure all values are numbers
                        const height = Math.max(1, parseInt(inputShape[0]) || 1);  // Ensure at least 1
                        const width = Math.max(1, parseInt(inputShape[1]) || 1);   // Ensure at least 1
                        const channels = Math.max(1, parseInt(inputShape[2]) || 1); // Ensure at least 1
                        
                        console.log(`Conv2D INPUT SHAPE debug: [${height}, ${width}, ${channels}]`, 
                            {original: inputShape, parsed: [height, width, channels]});
                        
                        // Ensure filters is a positive number
                        const filters = Math.max(1, parseInt(config.filters) || 32);
                        
                        // Explicit processing of kernelSize with safety checks
                        let kernelSize = [3, 3]; // Default fallback
                        if (config.kernelSize) {
                            if (typeof config.kernelSize === 'string') {
                                kernelSize = config.kernelSize.split(',')
                                    .map(v => Math.max(1, parseInt(v.trim()) || 1)); // Ensure at least 1
                            } else if (Array.isArray(config.kernelSize)) {
                                kernelSize = config.kernelSize
                                    .map(v => Math.max(1, parseInt(v) || 1)); // Ensure at least 1
                            }
                        }
                        
                        // Explicit processing of strides with safety checks
                        let strides = [1, 1]; // Default fallback
                        if (config.strides) {
                            if (typeof config.strides === 'string') {
                                strides = config.strides.split(',')
                                    .map(v => Math.max(1, parseInt(v.trim()) || 1)); // Ensure at least 1
                            } else if (Array.isArray(config.strides)) {
                                strides = config.strides
                                    .map(v => Math.max(1, parseInt(v) || 1)); // Ensure at least 1
                            }
                        }
                        
                        // Ensure we have at least 2 elements for kernelSize and strides and all values are at least 1
                        kernelSize = kernelSize.length >= 2 ? 
                            [Math.max(1, kernelSize[0]), Math.max(1, kernelSize[1])] : 
                            [Math.max(1, kernelSize[0] || 3), Math.max(1, kernelSize[0] || 3)];
                            
                        strides = strides.length >= 2 ? 
                            [Math.max(1, strides[0]), Math.max(1, strides[1])] : 
                            [Math.max(1, strides[0] || 1), Math.max(1, strides[0] || 1)];
                        
                        console.log(`Conv2D CONFIG debug:`, {
                            filters: filters,
                            kernelSize: kernelSize,
                            strides: strides
                        });
                        
                        // Store cleaned values back in config
                        config.filters = filters;
                        config.kernelSize = kernelSize;
                        config.strides = strides;
                        
                        const padding = config.padding || 'same';
                        
                        // Calculate output dimensions based on padding
                        let outHeight, outWidth;
                        if (padding === 'same') {
                            outHeight = Math.ceil(height / strides[0]);
                            outWidth = Math.ceil(width / strides[1]);
                        } else { // 'valid' padding
                            outHeight = Math.ceil((height - kernelSize[0] + 1) / strides[0]);
                            outWidth = Math.ceil((width - kernelSize[1] + 1) / strides[1]);
                        }
                        
                        // Ensure output dimensions are at least 1
                        outHeight = Math.max(1, outHeight);
                        outWidth = Math.max(1, outWidth);
                        
                        // Final output shape
                        outputShape = [outHeight, outWidth, filters];
                        
                        // Calculate parameters step by step to avoid any overflow or multiplication errors
                        const kh = Number(kernelSize[0]);
                        const kw = Number(kernelSize[1]);
                        const c = Number(channels);
                        const f = Number(filters);
                        
                        // Check for any zeros or negative values that would make the calculation invalid
                        if (kh <= 0 || kw <= 0 || c <= 0 || f <= 0) {
                            console.error(`Invalid Conv2D parameter values: kh=${kh}, kw=${kw}, c=${c}, f=${f}`);
                            parameters = 0;
                        } else {
                            // Calculate with explicit steps to avoid any overflow
                            const kernelParams = kh * kw * c * f;
                            const biasParams = f;
                            parameters = kernelParams + biasParams;
                            
                            console.log(`Conv2D CALCULATION STEPS:
                              Kernel height (kh) = ${kh}
                              Kernel width (kw) = ${kw}
                              Input channels (c) = ${c}
                              Filters (f) = ${f}
                              Kernel params = ${kh} × ${kw} × ${c} × ${f} = ${kernelParams}
                              Bias params = ${biasParams}
                              Total params = ${kernelParams} + ${biasParams} = ${parameters}
                            `);
                        }
                        
                        console.log(`Conv2D output shape: ${outHeight}×${outWidth}×${filters}`);
                    } else {
                        console.log('Cannot calculate Conv2D parameters - invalid input shape or manual shape provided:', inputShape);
                        if (!manualOutputShape) {
                            const filters = parseInt(config.filters) || 32;
                            outputShape = ['?', '?', filters];
                        }
                        parameters = 0;  // Set to 0 instead of '?' to avoid display issues
                    }
                    break;
                    
                case 'pool':
                    if (inputShape && inputShape.length >= 3 && !manualOutputShape) {
                        const [height, width, channels] = inputShape;
                        const poolSize = config.poolSize || [2, 2];
                        const stride = config.strides || poolSize;
                        const padding = config.padding || 'valid';
                        
                        // Calculate output dimensions
                        let outHeight, outWidth;
                        if (padding === 'same') {
                            outHeight = Math.ceil(height / stride[0]);
                            outWidth = Math.ceil(width / stride[1]);
                        } else { // 'valid' padding
                            outHeight = Math.ceil((height - poolSize[0] + 1) / stride[0]);
                            outWidth = Math.ceil((width - poolSize[1] + 1) / stride[1]);
                        }
                        
                        outputShape = [outHeight, outWidth, channels];
                        parameters = 0; // Pooling layers have no parameters
                        console.log('Pooling layer has 0 parameters');
                    } else {
                        console.log('Cannot calculate pooling output shape without proper input shape or manual shape provided');
                        if (!manualOutputShape) {
                            outputShape = ['?', '?', '?'];
                        }
                        parameters = 0;
                    }
                    break;
                    
                case 'rnn':
                    const rnnUnits = parseInt(config.units) || 32;
                    if (!manualOutputShape) {
                        // Output shape depends on return_sequences
                        // If return_sequences is true, output is [input_sequence_length, units]
                        // If return_sequences is false, output is [units]
                        const returnSequences = config.returnSequences === 'true' || config.returnSequences === true;
                        if (returnSequences && inputShape && inputShape.length > 0) {
                            // If we have an input shape, use the first dimension as sequence length
                            outputShape = [inputShape[0], rnnUnits];
                        } else {
                            outputShape = [rnnUnits];
                        }
                    }
                    if (inputShape && inputShape.length > 0) {
                        // For RNN, parameters = (input_features * units + units * units + units)
                        // Where:
                        // - input_features * units: weights from input to hidden
                        // - units * units: recurrent weights
                        // - units: bias terms (if using bias)
                        
                        // Get input features (last dimension of input shape)
                        const inputFeatures = inputShape[inputShape.length - 1];
                        const useBias = config.useBias !== 'false' && config.useBias !== false;
                        
                        const inputToHiddenParams = inputFeatures * rnnUnits;
                        const recurrentParams = rnnUnits * rnnUnits;
                        const biasParams = useBias ? rnnUnits : 0;
                        
                        parameters = inputToHiddenParams + recurrentParams + biasParams;
                        
                        console.log(`RNN parameters calculation:
                            Input features: ${inputFeatures}
                            RNN units: ${rnnUnits}
                            Input-to-hidden params: ${inputFeatures} * ${rnnUnits} = ${inputToHiddenParams}
                            Recurrent params: ${rnnUnits} * ${rnnUnits} = ${recurrentParams}
                            Bias params: ${biasParams}
                            Total: ${parameters}`);
                    } else {
                        console.log('No input shape available for RNN parameter calculation');
                        parameters = rnnUnits * 2; // Just a rough estimate if input shape is unknown
                    }
                    break;
                    
                case 'lstm':
                    const lstmUnits = parseInt(config.units) || 64;
                    if (!manualOutputShape) {
                        // Output shape depends on return_sequences
                        const returnSequences = config.returnSequences === 'true' || config.returnSequences === true;
                        if (returnSequences && inputShape && inputShape.length > 0) {
                            outputShape = [inputShape[0], lstmUnits];
                        } else {
                            outputShape = [lstmUnits];
                        }
                    }
                    if (inputShape && inputShape.length > 0) {
                        // For LSTM, we have 4 gates (input, forget, cell, output)
                        // parameters = 4 * (input_features * units + units * units + units)
                        
                        const inputFeatures = inputShape[inputShape.length - 1];
                        const useBias = config.useBias !== 'false' && config.useBias !== false;
                        
                        const inputToHiddenParams = 4 * (inputFeatures * lstmUnits);
                        const recurrentParams = 4 * (lstmUnits * lstmUnits);
                        const biasParams = useBias ? 4 * lstmUnits : 0;
                        
                        parameters = inputToHiddenParams + recurrentParams + biasParams;
                        
                        console.log(`LSTM parameters calculation:
                            Input features: ${inputFeatures}
                            LSTM units: ${lstmUnits}
                            Gates: 4 (input, forget, cell, output)
                            Input-to-hidden params: 4 * (${inputFeatures} * ${lstmUnits}) = ${inputToHiddenParams}
                            Recurrent params: 4 * (${lstmUnits} * ${lstmUnits}) = ${recurrentParams}
                            Bias params: ${biasParams}
                            Total: ${parameters}`);
                    } else {
                        console.log('No input shape available for LSTM parameter calculation');
                        parameters = lstmUnits * 8; // Rough estimate
                    }
                    break;
                    
                case 'gru':
                    const gruUnits = parseInt(config.units) || 48;
                    if (!manualOutputShape) {
                        // Output shape depends on return_sequences
                        const returnSequences = config.returnSequences === 'true' || config.returnSequences === true;
                        if (returnSequences && inputShape && inputShape.length > 0) {
                            outputShape = [inputShape[0], gruUnits];
                        } else {
                            outputShape = [gruUnits];
                        }
                    }
                    if (inputShape && inputShape.length > 0) {
                        // For GRU, we have 3 gates (update, reset, new)
                        // parameters = 3 * (input_features * units + units * units + units)
                        
                        const inputFeatures = inputShape[inputShape.length - 1];
                        const useBias = config.useBias !== 'false' && config.useBias !== false;
                        
                        const inputToHiddenParams = 3 * (inputFeatures * gruUnits);
                        const recurrentParams = 3 * (gruUnits * gruUnits);
                        const biasParams = useBias ? 3 * gruUnits : 0;
                        
                        parameters = inputToHiddenParams + recurrentParams + biasParams;
                        
                        console.log(`GRU parameters calculation:
                            Input features: ${inputFeatures}
                            GRU units: ${gruUnits}
                            Gates: 3 (update, reset, new)
                            Input-to-hidden params: 3 * (${inputFeatures} * ${gruUnits}) = ${inputToHiddenParams}
                            Recurrent params: 3 * (${gruUnits} * ${gruUnits}) = ${recurrentParams}
                            Bias params: ${biasParams}
                            Total: ${parameters}`);
                    } else {
                        console.log('No input shape available for GRU parameter calculation');
                        parameters = gruUnits * 6; // Rough estimate
                    }
                    break;
            }
        }
        
        // Make sure we have the output shape in the config
        if (outputShape) {
            config.outputShape = outputShape;
        }
        
        // Updated detailed parameter description
        let paramsDetails = '';
        switch (nodeType) {
            case 'hidden':
                paramsDetails = `Units: ${config.units}<br>Activation: ${config.activation || 'relu'}`;
                break;
            case 'output':
                paramsDetails = `Units: ${config.units}<br>Activation: ${config.activation || 'softmax'}`;
                break;
            case 'conv':
                paramsDetails = `Filters: ${config.filters}<br>Kernel: ${(config.kernelSize || [3, 3]).join('×')}<br>Strides: ${(config.strides || [1, 1]).join('×')}<br>Padding: ${config.padding || 'same'}`;
                break;
            case 'pool':
                paramsDetails = `Pool size: ${(config.poolSize || [2, 2]).join('×')}<br>Strides: ${(config.strides || [2, 2]).join('×')}<br>Padding: ${config.padding || 'valid'}<br>Type: ${config.poolType || 'max'}`;
                break;
            case 'input':
                paramsDetails = `Shape: ${(config.shape || [28, 28, 1]).join('×')}`;
                break;
            case 'rnn':
                paramsDetails = `Units: ${config.units}<br>Return Sequences: ${config.returnSequences === 'true' ? 'Yes' : 'No'}`;
                break;
            case 'lstm':
                paramsDetails = `Units: ${config.units}<br>Return Sequences: ${config.returnSequences === 'true' ? 'Yes' : 'No'}`;
                break;
            case 'gru':
                paramsDetails = `Units: ${config.units}<br>Return Sequences: ${config.returnSequences === 'true' ? 'Yes' : 'No'}`;
                break;
        }
        
        // Update displays
        if (outputShape && outputShapeDisplay) {
            outputShapeDisplay.textContent = `[${Array.isArray(outputShape) ? outputShape.join(' × ') : outputShape}]`;
            // Highlight the output shape to show it's been updated
            const originalBackground = outputShapeDisplay.style.backgroundColor;
            outputShapeDisplay.style.backgroundColor = '#f0f9ff';
            setTimeout(() => {
                outputShapeDisplay.style.backgroundColor = originalBackground;
            }, 500);
            console.log('Updated output shape display with', outputShape);
        }
        
        if (inputShape && inputShapeDisplay) {
            inputShapeDisplay.textContent = `[${Array.isArray(inputShape) ? inputShape.join(' × ') : inputShape}]`;
            console.log('Updated input shape display');
        } else if (inputShapeDisplay && nodeType !== 'input') {
            inputShapeDisplay.textContent = 'Connect input';
        }
        
        // Ensure parameters is always a number for display
        if (parameters !== undefined) {
            if (typeof parameters === 'string') {
                if (parameters === '?') {
                    parameters = 0;
                } else {
                    // Try to parse it as a number
                    parameters = parseInt(parameters) || 0;
                }
            }
            
            // Debug log with type information
            console.log(`Parameter display value: ${parameters} (${typeof parameters})`);
            
            if (paramsDisplay) {
                // Special display for Conv2D
                if (nodeType === 'conv') {
                    // Store the numeric value in the model
                    config.parameters = parameters;
                    
                    // Format for display
                    const displayValue = formatNumber(parameters);
                    paramsDisplay.textContent = `Params: ${displayValue}`;
                    console.log(`Updated Conv2D parameters display: ${displayValue}`);
                    
                    // Change background color briefly to indicate update
                    const originalColor = paramsDisplay.style.backgroundColor;
                    paramsDisplay.style.backgroundColor = '#f0f9ff';
                    setTimeout(() => {
                        paramsDisplay.style.backgroundColor = originalColor;
                    }, 500);
                } else {
                    // Regular update for other node types
                    paramsDisplay.textContent = `Params: ${formatNumber(parameters)}`;
                }
                console.log('Updated parameters display');
            }
        }
        
        if (paramsDetailsDisplay) {
            paramsDetailsDisplay.innerHTML = paramsDetails;
            console.log('Updated parameter details display');
        }
        
        if (dimensionsDisplay && outputShape) {
            let dimensionsText = '';
            if (nodeType === 'hidden' || nodeType === 'output' || nodeType === 'rnn' || nodeType === 'lstm' || nodeType === 'gru') {
                dimensionsText = config.units || '';
            } else if (nodeType === 'conv' || nodeType === 'pool') {
                if (Array.isArray(outputShape)) {
                    dimensionsText = outputShape.join('×');
                } else {
                    dimensionsText = outputShape;
                }
            } else if (nodeType === 'input') {
                if (Array.isArray(config.shape)) {
                    dimensionsText = config.shape.join('×');
                } else {
                    dimensionsText = config.shape || '';
                }
            }
            dimensionsDisplay.textContent = dimensionsText;
            console.log('Updated dimensions display');
        }
        
        // Update the model to ensure propagation of changes
        if (window.dragDrop) {
            if (window.dragDrop.getNetworkArchitecture) {
                const networkLayers = window.dragDrop.getNetworkArchitecture();
                const layerIndex = networkLayers.layers.findIndex(layer => layer.id === nodeId);
                
                if (layerIndex !== -1) {
                    networkLayers.layers[layerIndex].config = { ...config };
                    if (parameters !== undefined) {
                        networkLayers.layers[layerIndex].parameters = parameters;
                    }
                    
                    // Update connections to propagate parameter changes to connected nodes
                    if (window.dragDrop.updateConnections) {
                        window.dragDrop.updateConnections();
                    }
                    
                    // Update downstream nodes to propagate parameter changes through the network
                    if (window.dragDrop.forceUpdateNetworkParameters) {
                        console.log('Forcing network parameter update');
                        
                        // Add a small delay to ensure the current node update is complete
                        setTimeout(() => {
                            window.dragDrop.forceUpdateNetworkParameters();
                            
                            // Another update after a short delay for deeper propagation
                            setTimeout(() => {
                                window.dragDrop.updateConnections();
                                console.log('Final connection update completed');
                            }, 100);
                        }, 50);
                    }
                    
                    // Notify about the network update
                    document.dispatchEvent(new CustomEvent('networkUpdated', {
                        detail: networkLayers
                    }));
                    console.log('Dispatched networkUpdated event with updated model');
                } else {
                    console.warn(`Node ${nodeId} not found in network model layers`);
                }
            }
            
            // Force re-rendering of all connections
            if (window.dragDrop.updateConnections) {
                setTimeout(() => {
                    window.dragDrop.updateConnections();
                    console.log('Updated all connections after parameter change');
                }, 50);
            }
        }
        
        console.log(`Completed update of node ${nodeId} with config:`, config);
    }
    
    /**
     * Format large numbers for display
     */
    function formatNumber(num) {
        // Safety check for invalid values
        if (num === null || num === undefined) return 'N/A';
        if (num === 0) return '0';
        
        // Try to convert strings to numbers
        if (typeof num === 'string') {
            if (num === '?' || num.toLowerCase() === 'n/a') return 'N/A';
            num = parseFloat(num);
        }
        
        // Handle NaN
        if (isNaN(num)) return 'N/A';
        
        // Format based on size
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        
        // Handle smaller numbers with decimal places
        if (num < 1e3 && num % 1 !== 0) {
            return num.toFixed(2);
        }
        
        return num.toString();
    }
    
    /**
     * Helper function to manually recalculate Conv2D parameters
     * This can be called from the console for debugging
     */
    function forceRecalculateConv2DParameters(nodeId) {
        // If no ID provided, try to find all Conv2D nodes
        if (!nodeId) {
            const conv2dNodes = document.querySelectorAll('.canvas-node[data-type="conv"]');
            if (conv2dNodes.length === 0) {
                console.log('No Conv2D nodes found to update');
                return;
            }
            
            console.log(`Found ${conv2dNodes.length} Conv2D nodes to update`);
            
            // Update each Conv2D node
            conv2dNodes.forEach(node => {
                const id = node.getAttribute('data-id');
                console.log(`Updating Conv2D node ${id}`);
                forceRecalculateConv2DParameters(id);
            });
            return;
        }
        
        // Find the specific node
        const node = document.querySelector(`.canvas-node[data-id="${nodeId}"]`);
        if (!node) {
            console.error(`Node with ID ${nodeId} not found`);
            return;
        }
        
        // Check if it's a Conv2D node
        const nodeType = node.getAttribute('data-type');
        if (nodeType !== 'conv') {
            console.error(`Node ${nodeId} is not a Conv2D node (type: ${nodeType})`);
            return;
        }
        
        // Get the current config
        const config = node.layerConfig || {};
        
        // Force the update
        console.log(`Forcing parameter recalculation for Conv2D node ${nodeId}`);
        updateNodeWithConfig(node, 'conv', config);
        
        // If dragDrop is available, force a network update
        if (window.dragDrop && window.dragDrop.forceUpdateNetworkParameters) {
            setTimeout(() => {
                window.dragDrop.forceUpdateNetworkParameters();
            }, 100);
        }
    }
    
    // Expose helper function to window for debugging
    window.forceRecalculateConv2DParameters = forceRecalculateConv2DParameters;
})(); 