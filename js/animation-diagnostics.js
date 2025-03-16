// Animation Diagnostics Script
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 Animation Diagnostics Started');
    
    // Check if canvas elements exist
    const canvases = {
        'backprop-canvas': document.getElementById('backprop-canvas'),
        'forward-canvas': document.getElementById('forward-canvas'),
        'background-canvas': document.getElementById('background-canvas')
    };
    
    // Log results
    console.log('Canvas Elements Check:');
    Object.entries(canvases).forEach(([id, element]) => {
        console.log(`- Canvas #${id}: ${element ? '✅ Found' : '❌ Not Found'}`);
        
        if (element) {
            // Check if canvas has dimensions
            console.log(`  - Dimensions: ${element.width}x${element.height}`);
            
            // Try to get context
            try {
                const ctx = element.getContext('2d');
                console.log(`  - Context: ${ctx ? '✅ Available' : '❌ Not Available'}`);
                
                // Test drawing something to ensure canvas works
                if (ctx) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fillRect(10, 10, 50, 50);
                    console.log(`  - Drawing test: ✅ Completed`);
                }
            } catch (error) {
                console.error(`  - Context Error: ${error.message}`);
            }
        }
    });
    
    // Check if animation control buttons exist
    const buttons = {
        'Backpropagation': {
            'start-animation': document.getElementById('start-animation'),
            'pause-animation': document.getElementById('pause-animation'),
            'reset-animation': document.getElementById('reset-animation')
        },
        'Forward Propagation': {
            'start-forward-animation': document.getElementById('start-forward-animation'),
            'pause-forward-animation': document.getElementById('pause-forward-animation'),
            'reset-forward-animation': document.getElementById('reset-forward-animation')
        },
        'Background Animation': {
            'start-background-animation': document.getElementById('start-background-animation'),
            'pause-background-animation': document.getElementById('pause-background-animation'),
            'reset-background-animation': document.getElementById('reset-background-animation')
        }
    };
    
    // Log results
    console.log('\nAnimation Controls Check:');
    Object.entries(buttons).forEach(([section, controls]) => {
        console.log(`- ${section} Controls:`);
        Object.entries(controls).forEach(([id, element]) => {
            console.log(`  - Button #${id}: ${element ? '✅ Found' : '❌ Not Found'}`);
        });
    });
    
    // Check if animation scripts were loaded
    const scripts = {
        'backpropagation.js': window.hasOwnProperty('backpropInitialized'),
        'forward-propagation.js': window.hasOwnProperty('forwardPropInitialized'),
        'background-animation.js': window.hasOwnProperty('backgroundAnimationInitialized')
    };
    
    console.log('\nScript Initialization Check:');
    Object.entries(scripts).forEach(([script, initialized]) => {
        console.log(`- ${script}: ${initialized ? '✅ Initialized' : '❌ Not Initialized'}`);
    });
    
    // Add script initialization flags to each animation script
    console.log('\nAdding script initialization checks...');
    
    // Since we can't directly modify the original scripts, we'll add these flags now
    if (!window.hasOwnProperty('backpropInitialized')) {
        window.backpropInitialized = false;
        console.log('- Added backprop initialization check');
    }
    
    if (!window.hasOwnProperty('forwardPropInitialized')) {
        window.forwardPropInitialized = false;
        console.log('- Added forward-prop initialization check');
    }
    
    if (!window.hasOwnProperty('backgroundAnimationInitialized')) {
        window.backgroundAnimationInitialized = false;
        console.log('- Added background animation initialization check');
    }
    
    // Check tab switching
    console.log('\nAdding tab switch handler...');
    document.addEventListener('tabSwitch', (e) => {
        console.log(`Tab switched to: ${e.detail.tab}`);
        
        // Force redraw of canvas when tab is switched
        const canvasId = `${e.detail.tab === 'backpropagation' ? 'backprop' : 
                           e.detail.tab === 'forward-propagation' ? 'forward' : 
                           e.detail.tab === 'background-animation' ? 'background' : ''}-canvas`;
        
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            console.log(`Forcing redraw of ${canvasId}`);
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            // Clear canvas and draw a test pattern
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(0, 128, 255, 0.2)';
            ctx.fillRect(0, 0, width, height);
            
            // Draw text to show it's the diagnostic render
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Diagnostic Render - Animation Should Appear Here', width/2, height/2);
            
            // Draw a boundary to show canvas size
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, width, height);
        }
    });
    
    console.log('🔍 Animation Diagnostics Initialized');
}); 