// Import necessary modules
import { TriangleSystemController } from './shared/ui/controller.js';
import { TriangleSystem, RulesModule } from './ss1-state/rules-module.js';
import { EnvironmentModule } from './ss3-io/environment-module.js';
import { IntelligenceModule } from './intelligence/intelligence-module.js';
import { PresetManager, ImportManager } from './shared/ui/ui-manager.js';
import { CapacityModule } from './ss3-io/capacity-module.js';
import { CircleMetrics } from './ss3-io/circle-metrics.js';
import { DataProcessing } from './ss2-processing/data-processing.js';
import { DataConversion } from './ss2-processing/data-conversion.js';
import { EnvironmentDatabase } from './shared/ui/database.js';
import { environmentDB } from './shared/ui/database.js';

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
    const environmentModule = new EnvironmentModule(intelligenceModule, triangleSystem, environmentDB);
    const rulesModule = new RulesModule(triangleSystem, canvas, ctx, intelligenceModule, environmentModule);
    triangleSystem.rulesModule = rulesModule; // Now set the rulesModule in triangleSystem

    // Initialize DataProcessing with the shared database instance
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

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            // Initialize databases
            const environmentDB = new EnvironmentDatabase('UnifiedTriangleDB', ['environmental']);
            const processingPoolDB = new EnvironmentDatabase('UnifiedTriangleDB', ['processing']);

            // Wait for databases to be ready
            await Promise.all([
                environmentDB.ready,
                processingPoolDB.ready
            ]);

            // Initialize modules
            const environmentModule = new EnvironmentModule(environmentDB);
            
            const intelligenceModule = new IntelligenceModule();
            const dataConversion = new DataConversion(intelligenceModule);

            // Add click handler for initialize button
            const initButton = document.getElementById('initializeButton');
            if (initButton) {
                initButton.addEventListener('click', async () => {
                    console.log('Initialize button clicked - starting clear and init sequence');
                    
                    try {
                        // First ensure environment module is ready and clear existing data
                        await environmentModule.environmentDB.ready;
                        const cleared = await environmentModule.clearExistingData();
                        if (!cleared) {
                            throw new Error('Failed to clear existing data');
                        }
                        
                        // Calculate metrics
                        const metrics = await calculateMetrics();
                        
                        // Then proceed with capacity module initialization
                        await initializeCapacityModule(environmentModule, metrics);
                        
                        // Then complete environment initialization
                        await environmentModule.handlingInitialization({
                            // your initialization state
                        });
                        
                        // Finally reset data processing
                        await dataProcessing.handleInitialization();
                        
                        console.log('System initialization complete');
                    } catch (error) {
                        console.error('Error during system initialization:', error);
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up system:', error);
        }
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

    // Add data conversion
    const dataConversion = new DataConversion(environmentModule.environmentDB, intelligenceModule);
});

async function calculateMetrics() {
    // Instantiate TriangleSystem and calculate metrics
    console.log('Calculating metrics...');
    const triangleSystem = new TriangleSystem();
    const metrics = triangleSystem.calculateExternalRegions();
    
    return {
        triangleSystem: triangleSystem,
        ...metrics
    };
}

async function initializeCapacityModule(environmentModule, metrics) {
    // Your existing capacity module initialization code
    console.log('Starting capacity module initialization');
    const capacityModule = new CapacityModule(environmentModule, metrics);
    await capacityModule.initialize();
}
