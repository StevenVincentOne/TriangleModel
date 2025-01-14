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
import { StateModule } from './ss1-state/state-module.js';
import { UptakeSystem } from './ss2-processing/uptake.js';
import { PoolSystem } from './ss2-processing/pool.js';
import { RecycleModule } from './ss2-processing/recycle.js';
import { SystemControl } from './shared/system-control.js';

// Initialize both databases and connect them
async function initializeDatabases() {
    try {
        // Wait for EnvironmentDB to be ready
        await environmentDB.ready;
        console.log('EnvironmentDB initialized');

        // Optional: Set up debug logging for state data imports
        window.addEventListener('stateDataImported', (event) => {
            console.log('State data imported:', event.detail);
        });

    } catch (error) {
        console.error('Error initializing databases:', error);
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDatabases();
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
    
    // Initialize UptakeSystem with environmentModule
    const uptakeSystem = new UptakeSystem(environmentModule);
    console.log('UptakeSystem initialized:', uptakeSystem);

    // Initialize PoolSystem with environmentModule
    const poolSystem = new PoolSystem(environmentModule);
    console.log('PoolSystem initialized:', poolSystem);

    const rulesModule = new RulesModule(triangleSystem, canvas, ctx, intelligenceModule, environmentModule);
    triangleSystem.rulesModule = rulesModule; // Now set the rulesModule in triangleSystem

    // Initialize DataProcessing with the shared database instance
    const dataProcessing = new DataProcessing(environmentModule);

    // Initialize Processing Pool
    await dataProcessing.initializeProcessingPool();
    console.log('Processing Pool initialized.');

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
            
            // Initialize capacity module
            const initialState = await capacityModule.initializeSystemData();
            console.log('Capacity Module initialized with state:', {
                
                usedCapacity: initialState.metrics.usedCapacity,
                bitsCount: initialState.metrics.bitsCount,
                noiseCount: initialState.metrics.noiseCount
            });
            
            // Update environment module
            await environmentModule.handleInitialization(initialState);
            
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    });

    // Add data conversion
    const dataConversion = new DataConversion(environmentModule.environmentDB, intelligenceModule);

    const stateModule = new StateModule(triangleSystem);

    const recycleModule = new RecycleModule(environmentDB);

    // Initialize system control
    const systemControl = new SystemControl();
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
