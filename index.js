// Import necessary modules
import { TriangleSystem, RulesModule } from './ss1-state/rules-module.js';
import { EnvironmentModule } from './ss3-io/environment-module.js';
import { IntelligenceModule } from './intelligence/intelligence-module.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get the canvas element with the correct ID
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Initialize main system components
    const triangleSystem = new TriangleSystem(canvas);
    const rulesModule = new RulesModule(canvas);
    const intelligenceModule = new IntelligenceModule(triangleSystem);
    const environmentModule = new EnvironmentModule(intelligenceModule);

    // Initialize any other necessary components or event listeners
    
    console.log('System initialized with:', {
        triangleSystem,
        rulesModule,
        intelligenceModule,
        environmentModule
    });
});
