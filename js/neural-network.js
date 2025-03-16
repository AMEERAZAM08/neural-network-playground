/**
 * Neural Network Tools and Utilities
 * Provides helper functions for managing neural network layers,
 * calculating parameters, and managing network architecture
 */

(function() {
    // Layer counters to track unique IDs for each layer type
    const layerCounters = {
        'input': 0,
        'hidden': 0,
        'output': 0,
        'conv': 0,
        'pool': 0
    };
    
    // Default configuration templates for different layer types
    const nodeConfigTemplates = {
        'input': {
            units: 784,
            shape: [28, 28, 1],
            batchSize: 32,
            description: 'Input layer for raw data',
            parameters: 0
        },
        'hidden': {
            units: 128,
            activation: 'relu',
            useBias: true,
            kernelInitializer: 'glorotUniform',
            biasInitializer: 'zeros',
            dropoutRate: 0.2,
            description: 'Dense hidden layer with ReLU activation'
        },
        'output': {
            units: 10,
            activation: 'softmax',
            useBias: true,
            kernelInitializer: 'glorotUniform',
            biasInitializer: 'zeros',
            description: 'Output layer with Softmax activation for classification'
        },
        'conv': {
            filters: 32,
            kernelSize: [3, 3],
            strides: [1, 1],
            padding: 'valid',
            activation: 'relu',
            useBias: true,
            kernelInitializer: 'glorotUniform',
            biasInitializer: 'zeros',
            description: 'Convolutional layer for feature extraction'
        },
        'pool': {
            poolSize: [2, 2],
            strides: [2, 2],
            padding: 'valid',
            description: 'Max pooling layer for spatial downsampling'
        }
    };
    
    // Mock data structure for sample datasets
    const sampleData = {
        'mnist': {
            name: 'MNIST Handwritten Digits',
            inputShape: [28, 28, 1],
            numClasses: 10,
            trainSamples: 60000,
            testSamples: 10000,
            description: 'Dataset of handwritten digits for classification'
        },
        'cifar10': {
            name: 'CIFAR-10',
            inputShape: [32, 32, 3],
            numClasses: 10,
            trainSamples: 50000,
            testSamples: 10000,
            description: 'Dataset of common objects like airplanes, cars, birds, etc.'
        },
        'fashion': {
            name: 'Fashion MNIST',
            inputShape: [28, 28, 1],
            numClasses: 10,
            trainSamples: 60000,
            testSamples: 10000,
            description: 'Dataset of fashion items like shirts, shoes, bags, etc.'
        }
    };
    
    /**
     * Get the next unique ID for a specific layer type
     * @param {string} layerType - The type of the layer (input, hidden, output, conv, pool)
     * @returns {string} - A unique ID for the layer
     */
    function getNextLayerId(layerType) {
        layerCounters[layerType]++;
        return `${layerType}-${layerCounters[layerType]}`;
    }
    
    /**
     * Reset all layer counters
     * Used when clearing the canvas
     */
    function resetLayerCounter() {
        for (let key in layerCounters) {
            layerCounters[key] = 0;
        }
    }
    
    /**
     * Create a configuration object for a layer
     * @param {string} layerType - The type of the layer
     * @param {Object} customConfig - Custom configuration for the layer
     * @returns {Object} - Complete layer configuration
     */
    function createNodeConfig(layerType, customConfig = {}) {
        const baseConfig = { ...nodeConfigTemplates[layerType] };
        
        // Merge custom config with base config
        const config = { ...baseConfig, ...customConfig };
        
        // Calculate parameters if not provided
        if (config.parameters === undefined) {
            config.parameters = calculateParameters(layerType, config);
        }
        
        return config;
    }
    
    /**
     * Calculate the number of parameters for a layer
     * @param {string} layerType - The type of the layer
     * @param {Object} config - Layer configuration
     * @param {Object} prevLayerConfig - Previous layer configuration (for connections)
     * @returns {number} - Number of trainable parameters
     */
    function calculateParameters(layerType, config, prevLayerConfig = null) {
        let parameters = 0;
        
        switch(layerType) {
            case 'input':
                parameters = 0; // Input layer has no trainable parameters
                break;
                
            case 'hidden':
                if (prevLayerConfig) {
                    const inputUnits = prevLayerConfig.units || 
                                      (prevLayerConfig.shape ? 
                                       prevLayerConfig.shape.reduce((a, b) => a * b, 1) : 
                                       784);
                    
                    // Weight parameters: input_units * output_units
                    parameters = inputUnits * config.units;
                    
                    // Add bias parameters if using bias
                    if (config.useBias) {
                        parameters += config.units;
                    }
                }
                break;
                
            case 'output':
                if (prevLayerConfig) {
                    const inputUnits = prevLayerConfig.units || 128;
                    
                    // Weight parameters: input_units * output_units
                    parameters = inputUnits * config.units;
                    
                    // Add bias parameters if using bias
                    if (config.useBias) {
                        parameters += config.units;
                    }
                }
                break;
                
            case 'conv':
                if (prevLayerConfig) {
                    const inputChannels = prevLayerConfig.shape ? 
                                         prevLayerConfig.shape[2] || 1 : 
                                         (prevLayerConfig.filters || 1);
                    
                    // Weight parameters: kernel_height * kernel_width * input_channels * filters
                    const kernelSize = Array.isArray(config.kernelSize) ? 
                                      config.kernelSize[0] * config.kernelSize[1] : 
                                      config.kernelSize * config.kernelSize;
                    
                    parameters = kernelSize * inputChannels * config.filters;
                    
                    // Add bias parameters if using bias
                    if (config.useBias) {
                        parameters += config.filters;
                    }
                }
                break;
                
            case 'pool':
                parameters = 0; // Pooling layers have no trainable parameters
                break;
                
            default:
                parameters = 0;
        }
        
        return parameters;
    }
    
    /**
     * Calculate FLOPs (floating point operations) for a layer
     * @param {string} layerType - The type of the layer
     * @param {Object} config - Layer configuration
     * @param {Object} inputDims - Input dimensions
     * @returns {number} - Approximate FLOPs for forward pass
     */
    function calculateFLOPs(layerType, config, inputDims) {
        let flops = 0;
        
        switch(layerType) {
            case 'input':
                flops = 0;
                break;
                
            case 'hidden':
                // FLOPs = 2 * input_dim * output_dim (multiply-add operations)
                flops = 2 * inputDims.reduce((a, b) => a * b, 1) * config.units;
                break;
                
            case 'output':
                // Same as hidden layer
                flops = 2 * inputDims.reduce((a, b) => a * b, 1) * config.units;
                break;
                
            case 'conv':
                // Output dimensions after convolution
                const outputHeight = Math.floor((inputDims[0] - config.kernelSize[0] + 2 * 
                                               (config.padding === 'same' ? config.kernelSize[0] / 2 : 0)) / 
                                               config.strides[0] + 1);
                                               
                const outputWidth = Math.floor((inputDims[1] - config.kernelSize[1] + 2 * 
                                              (config.padding === 'same' ? config.kernelSize[1] / 2 : 0)) / 
                                              config.strides[1] + 1);
                
                // FLOPs per output point = 2 * kernel_height * kernel_width * input_channels
                const flopsPerPoint = 2 * config.kernelSize[0] * config.kernelSize[1] * inputDims[2];
                
                // Total FLOPs = output_points * flops_per_point * output_channels
                flops = outputHeight * outputWidth * flopsPerPoint * config.filters;
                break;
                
            case 'pool':
                // Output dimensions after pooling
                const poolOutputHeight = Math.floor((inputDims[0] - config.poolSize[0]) / 
                                                  config.strides[0] + 1);
                                                  
                const poolOutputWidth = Math.floor((inputDims[1] - config.poolSize[1]) / 
                                                 config.strides[1] + 1);
                
                // For max pooling, approximately one comparison per element in the pooling window
                flops = poolOutputHeight * poolOutputWidth * inputDims[2] * 
                       config.poolSize[0] * config.poolSize[1];
                break;
                
            default:
                flops = 0;
        }
        
        return flops;
    }
    
    /**
     * Calculate memory usage for a layer
     * @param {string} layerType - The type of the layer
     * @param {Object} config - Layer configuration
     * @param {Object} batchSize - Batch size for calculation
     * @returns {Object} - Memory usage statistics
     */
    function calculateMemoryUsage(layerType, config, batchSize = 32) {
        // Assume 4 bytes per parameter (float32)
        const bytesPerParam = 4;
        let outputShape = [];
        let parameters = 0;
        let activationMemory = 0;
        
        switch(layerType) {
            case 'input':
                outputShape = config.shape || [28, 28, 1];
                parameters = 0;
                break;
                
            case 'hidden':
                outputShape = [config.units];
                parameters = config.parameters || 0;
                break;
                
            case 'output':
                outputShape = [config.units];
                parameters = config.parameters || 0;
                break;
                
            case 'conv':
                // This is a simplified calculation, actual dimensions depend on padding and strides
                const inputShape = config.inputShape || [28, 28, 1];
                const outputHeight = Math.floor((inputShape[0] - config.kernelSize[0] + 2 * 
                                               (config.padding === 'same' ? config.kernelSize[0] / 2 : 0)) / 
                                               config.strides[0] + 1);
                                               
                const outputWidth = Math.floor((inputShape[1] - config.kernelSize[1] + 2 * 
                                              (config.padding === 'same' ? config.kernelSize[1] / 2 : 0)) / 
                                              config.strides[1] + 1);
                
                outputShape = [outputHeight, outputWidth, config.filters];
                parameters = config.parameters || 0;
                break;
                
            case 'pool':
                const poolInputShape = config.inputShape || [28, 28, 32];
                const poolOutputHeight = Math.floor((poolInputShape[0] - config.poolSize[0]) / 
                                                  config.strides[0] + 1);
                                                  
                const poolOutputWidth = Math.floor((poolInputShape[1] - config.poolSize[1]) / 
                                                 config.strides[1] + 1);
                
                outputShape = [poolOutputHeight, poolOutputWidth, poolInputShape[2]];
                parameters = 0;
                break;
                
            default:
                outputShape = [0];
                parameters = 0;
        }
        
        // Calculate memory for the activations (output of this layer)
        activationMemory = batchSize * outputShape.reduce((a, b) => a * b, 1) * bytesPerParam;
        
        // Calculate memory for the parameters
        const paramMemory = parameters * bytesPerParam;
        
        return {
            parameters: parameters,
            paramMemory: paramMemory, // in bytes
            activationMemory: activationMemory, // in bytes
            totalMemory: paramMemory + activationMemory, // in bytes
            outputShape: outputShape
        };
    }
    
    /**
     * Generate a human-readable description of a layer
     * @param {string} layerType - The type of the layer
     * @param {Object} config - Layer configuration
     * @returns {string} - Description of the layer
     */
    function generateLayerDescription(layerType, config) {
        let description = '';
        
        switch(layerType) {
            case 'input':
                description = `Input Layer: Shape=${config.shape.join('×')}`;
                break;
                
            case 'hidden':
                description = `Dense Layer: ${config.units} units, ${config.activation} activation`;
                if (config.dropoutRate > 0) {
                    description += `, dropout ${config.dropoutRate}`;
                }
                break;
                
            case 'output':
                description = `Output Layer: ${config.units} units, ${config.activation} activation`;
                break;
                
            case 'conv':
                description = `Conv2D: ${config.filters} filters, ${config.kernelSize.join('×')} kernel, ${config.activation} activation`;
                break;
                
            case 'pool':
                description = `MaxPooling2D: ${config.poolSize.join('×')} pool size`;
                break;
                
            default:
                description = 'Unknown layer type';
        }
        
        return description;
    }
    
    /**
     * Validate a network architecture
     * @param {Object} layers - Array of layer configurations
     * @param {Object} connections - Array of connections between layers
     * @returns {Object} - Validation result with errors if any
     */
    function validateNetwork(layers, connections) {
        const errors = [];
        
        // Check if there's exactly one input layer
        const inputLayers = layers.filter(layer => layer.type === 'input');
        if (inputLayers.length === 0) {
            errors.push('Network must have at least one input layer');
        } else if (inputLayers.length > 1) {
            errors.push('Network can have only one input layer');
        }
        
        // Check if there's at least one output layer
        const outputLayers = layers.filter(layer => layer.type === 'output');
        if (outputLayers.length === 0) {
            errors.push('Network must have at least one output layer');
        }
        
        // Check for isolated nodes (nodes with no connections)
        const connectedNodes = new Set();
        connections.forEach(conn => {
            connectedNodes.add(conn.source);
            connectedNodes.add(conn.target);
        });
        
        const isolatedNodes = layers.filter(layer => !connectedNodes.has(layer.id));
        if (isolatedNodes.length > 0) {
            isolatedNodes.forEach(node => {
                if (node.type !== 'input' && node.type !== 'output') {
                    errors.push(`Layer "${node.name}" (${node.id}) is isolated`);
                }
            });
        }
        
        // Check if input layer has incoming connections
        inputLayers.forEach(layer => {
            const incomingConnections = connections.filter(conn => conn.target === layer.id);
            if (incomingConnections.length > 0) {
                errors.push(`Input layer "${layer.name}" cannot have incoming connections`);
            }
        });
        
        // Check if output layer has outgoing connections
        outputLayers.forEach(layer => {
            const outgoingConnections = connections.filter(conn => conn.source === layer.id);
            if (outgoingConnections.length > 0) {
                errors.push(`Output layer "${layer.name}" cannot have outgoing connections`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    // Expose functions to the global scope
    window.neuralNetwork = {
        getNextLayerId,
        resetLayerCounter,
        createNodeConfig,
        calculateParameters,
        calculateFLOPs,
        calculateMemoryUsage,
        generateLayerDescription,
        validateNetwork,
        nodeConfigTemplates,
        sampleData
    };
})(); 