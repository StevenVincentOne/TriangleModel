export class SystemControl {
    constructor() {
        this.isSystemRunning = false;
        this.setupSystemControls();
    }

    setupSystemControls() {
        const systemButton = document.getElementById('systemButton');
        if (systemButton) {
            systemButton.addEventListener('click', () => this.handleSystemButtonClick());
        }
    }

    async handleSystemButtonClick() {
        const systemButton = document.getElementById('systemButton');
        
        if (this.isSystemRunning) {
            await this.stopSystem();
            systemButton?.classList.remove('active');
        } else {
            await this.startSystem();
            systemButton?.classList.add('active');
        }
    }

    async startSystem() {
        if (this.isSystemRunning) return;
        
        this.isSystemRunning = true;
        
        // Start all workflows in sequence with updated button IDs
        const workflows = [
            'uptakeButton',         // Was 'processDataButton'
            'poolButton',           // Was 'letterFlowToggle'
            'convertBitsButton',    // This one stayed the same
            'recycleNoiseButton'    // This one stayed the same
        ];

        for (const buttonId of workflows) {
            const button = document.getElementById(buttonId);
            if (button && !button.classList.contains('active')) {
                button.click();
                // Small delay to prevent race conditions
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log('System started - all workflows activated');
    }

    async stopSystem() {
        if (!this.isSystemRunning) return;
        
        this.isSystemRunning = false;
        
        // Stop all active workflows in reverse sequence with updated button IDs
        const workflows = [
            'recycleNoiseButton',   // This one stayed the same
            'convertBitsButton',    // This one stayed the same
            'poolButton',           // Was 'letterFlowToggle'
            'uptakeButton'          // Was 'processDataButton'
        ];

        for (const buttonId of workflows) {
            const button = document.getElementById(buttonId);
            if (button?.classList.contains('active')) {
                button.click();
                // Small delay to prevent race conditions
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log('System stopped - all workflows deactivated');
    }
}
