import { RulesModule } from '../../ss1-state/rules-module.js';
import { IntelligenceModule } from '../../intelligence/intelligence-module.js';
import { EnvironmentModule } from '../../ss3-io/environment-module.js';

class TriangleSystemController {
    constructor(canvas) {
        console.log('Initializing TriangleSystemController');
        this.rulesModule = new RulesModule(canvas);
        this.intelligenceModule = new IntelligenceModule(this.rulesModule);
        this.environmentModule = new EnvironmentModule(this.intelligenceModule);
    }
}

export { TriangleSystemController };
