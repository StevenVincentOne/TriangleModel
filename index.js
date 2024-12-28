// Import necessary modules
import { TriangleSystemController } from './shared/ui/controller.js';
import { TriangleSystem, RulesModule } from './ss1-state/rules-module.js';
import { EnvironmentModule } from './ss3-io/environment-module.js';
import { IntelligenceModule } from './intelligence/intelligence-module.js';
import { PresetManager, ImportManager } from './shared/ui/ui-manager.js';
import { CapacityModule } from './ss3-io/capacity-module.js';
import { CircleMetrics } from './ss3-io/circle-metrics.js';
import { DataProcessing } from './ss2-processing/data-processing.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get the canvas element with the correct ID
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Get the 2D rendering context
    const ctx = canvas.getContext('2d');

    // Initialize main system components in the correct order
    const triangleSystem = new TriangleSystem(canvas, ctx, null); // Initialize triangleSystem with null rulesModule for now
    const intelligenceModule = new IntelligenceModule(triangleSystem);
    const circleMetrics = new CircleMetrics(triangleSystem);
    const capacityModule = new CapacityModule(circleMetrics);
    const environmentModule = new EnvironmentModule(intelligenceModule, triangleSystem);
    const rulesModule = new RulesModule(triangleSystem, canvas, ctx, intelligenceModule, environmentModule);
    triangleSystem.rulesModule = rulesModule; // Now set the rulesModule in triangleSystem

    // Initialize DataProcessing
    const dataProcessing = new DataProcessing(environmentModule);

    // Call updateDashboard after rulesModule is available
    triangleSystem.updateDashboard();

    // Initialize any other necessary components or event listeners

    console.log('System initialized with:', {
        triangleSystem,
        rulesModule,
        intelligenceModule,
        environmentModule,
        dataProcessing
    });

    // Initialize RulesModule with a Promise
    function initializeRulesModule() {
        return new Promise((resolve, reject) => {
            try {
                triangleSystem.rulesModule = new RulesModule(triangleSystem, canvas, ctx, intelligenceModule, environmentModule);
                // Assuming RulesModule has an initialization callback or event
                // For example, dispatch an event when ready
                document.dispatchEvent(new Event('RulesModuleReady'));
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Initialize PresetManager after RulesModule is ready
    initializeRulesModule()
        .then(() => {
            const presetManager = new PresetManager(triangleSystem);
        })
        

    // Alternatively, listen for a custom event
    document.addEventListener('RulesModuleReady', () => {
        const presetManager = new PresetManager(triangleSystem);
    });

    // Add initialize button handler
    document.getElementById('initializeSystem')?.addEventListener('click', async () => {
        try {
            console.log('Initialize button clicked (index.js)');
            
            // Initialize capacity module first
            const initialState = await capacityModule.initializeSystemData();
            console.log('Capacity Module initialized with state:', {
                edPercent: initialState.metrics.edPercent,
                ebPercent: initialState.metrics.ebPercent,
                usedCapacity: initialState.metrics.usedCapacity,
                bitsCount: initialState.metrics.bitsCount,
                noiseCount: initialState.metrics.noiseCount
            });
            
            // Then update environment module with the state
            await environmentModule.handleInitialization(initialState);
            
            // Final dashboard update from capacity module
            capacityModule.updateDashboard(initialState.metrics);
            
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    });
});
