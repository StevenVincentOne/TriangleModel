import { LossFunction } from '../ss2-processing/data-processing.js';

export class EnvironmentModule {
    constructor(intelligenceModule) {
        this.intelligenceModule = intelligenceModule;
        this.lossFunction = new LossFunction();
        this.isGenerating = false;
        this.generationInterval = null;
        this.flowRate = 10;
        this.enFlowRate = 0;
        this.enGenerationInterval = null;
        
        // Updated alphabet: 26 letters plus 4 special characters (30 total characters)
        this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/+&∅';
        this.noiseAlphabet = 'αβχδεφγηιξκλμνοπψρστυϑωχψζςΣΩθ';
        
        this.randomGenerator = {
            generateLetter: () => {
                const index = Math.floor(Math.random() * this.alphabet.length);
                return this.alphabet[index];
            },
            generateNoise: () => {
                const index = Math.floor(Math.random() * this.noiseAlphabet.length);
                return this.noiseAlphabet[index];
            }
        };

        this.initializeControls();
        console.log('EnvironmentModule initialized with weighted letter distribution');
        console.log('Total letter pool size:', this.alphabet.length);
        console.log('Intelligence module connected:', this.intelligenceModule ? 'yes' : 'no');

        // Add zero data button handler
        const zeroDataButton = document.getElementById('zeroDataButton');
        if (zeroDataButton) {
            zeroDataButton.addEventListener('click', () => {
                this.stopLetterGeneration();
                const toggleBtn = document.getElementById('letterFlowToggle');
                if (toggleBtn) {
                    toggleBtn.textContent = 'Start Flow';
                    toggleBtn.classList.remove('active');
                }
            });
        }
    }

    initializeControls() {
        const toggleBtn = document.getElementById('letterFlowToggle');
        const rateValue = document.getElementById('flow-rate');

        console.log('Found elements:', {
            toggleBtn: toggleBtn ? 'yes' : 'no',
            rateValue: rateValue ? 'yes' : 'no'
        });

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (this.isGenerating) {
                    this.stopLetterGeneration();
                    toggleBtn.textContent = 'Start Flow';
                    toggleBtn.classList.remove('active');
                } else {
                    this.startLetterGeneration();
                    toggleBtn.textContent = 'Stop Flow';
                    toggleBtn.classList.add('active');
                }
            });
        }

        // Add handlers for the flow rate input
        if (rateValue) {
            console.log('Adding flow rate event listeners');
            
            // Handle direct input changes (including arrow buttons)
            rateValue.addEventListener('input', (e) => {
                console.log('Flow rate input event:', e.target.value);
                const newRate = Math.min(1000, Math.max(0, parseInt(e.target.value) || 0));
                console.log('Parsed new rate:', newRate);
                this.updateFlowRate(newRate);
            });
        }

        // Add handlers for EN flow rate
        const enRateInput = document.getElementById('en-flow-rate');
        if (enRateInput) {
            enRateInput.value = this.enFlowRate;
            
            // Handle both input and keypress events
            enRateInput.addEventListener('input', (e) => {
                const newRate = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                this.updateENFlowRate(newRate);
            });

            enRateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent default to avoid form submission
                    const newRate = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                    this.updateENFlowRate(newRate);
                    enRateInput.blur(); // Remove focus from input
                }
            });
        }
    }

    updateFlowRate(newRate) {
        console.log('Updating flow rate from', this.flowRate, 'to', newRate);
        this.flowRate = newRate;
        if (this.isGenerating) {
            console.log('Restarting generation with new rate');
            this.stopLetterGeneration();
            this.startLetterGeneration();
        }
    }

    updateENFlowRate(newRate) {
        console.log('Updating EN flow rate from', this.enFlowRate, 'to', newRate);
        this.enFlowRate = newRate;
        if (this.isGenerating) {
            this.restartENGeneration();
        }
    }

    startLetterGeneration() {
        if (!this.isGenerating) {
            console.log(`Starting generation - Data rate: ${this.flowRate}/s, EN rate: ${this.enFlowRate}/s`);
            this.isGenerating = true;
            
            // Start Data generation
            if (this.flowRate > 0) {
                const interval = 1000 / this.flowRate;
                this.generationInterval = setInterval(() => {
                    this.generateData();
                }, interval);
            }

            // Start EN generation
            this.startENGeneration();
        }
    }

    startENGeneration() {
        if (this.enFlowRate > 0) {
            const enInterval = 1000 / this.enFlowRate;
            this.enGenerationInterval = setInterval(() => {
                this.generateEN();
            }, enInterval);
        }
    }

    generateEN() {
        if (this.intelligenceModule) {
            const noise = this.randomGenerator.generateNoise();
            this.intelligenceModule.processEN(noise);
        }
    }

    restartENGeneration() {
        if (this.isGenerating) {
            clearInterval(this.enGenerationInterval);
            this.startENGeneration();
        }
    }

    stopLetterGeneration() {
        if (this.isGenerating) {
            console.log('Stopping all generation');
            clearInterval(this.generationInterval);
            clearInterval(this.enGenerationInterval);
            this.isGenerating = false;
            
            const toggleBtn = document.getElementById('letterFlowToggle');
            if (toggleBtn && !toggleBtn.disabled) {
                toggleBtn.textContent = 'Start Flow';
                toggleBtn.classList.remove('active');
            }
        }
    }

    initializeDataSources() {
        console.log('Initializing data sources...');
        // Placeholder for adding data sources
    }

    addDataSource(source) {
        console.log('Adding data source:', source);
        this.dataSources.push(source);
    }

    getMixedData(params) {
        console.log('Mixing data with params:', params);
        // Placeholder for data mixing logic
        return {};
    }

    generateData() {
        if (this.intelligenceModule) {
            const letter = this.randomGenerator.generateLetter();
            this.intelligenceModule.processLetter(letter);
        }
    }
}

export class CircleMetrics {
    constructor(triangleSystem) {
        this.triangleSystem = triangleSystem;
        if (typeof paper === 'undefined') {
            console.error('Paper.js library not loaded!');
            return;
        }
        const canvas = document.createElement('canvas');
        paper.setup(canvas);
    }

    calculateCircumcircleMetrics() {
        try {
            const circumcircle = this.triangleSystem.calculateCircumcircle();
            if (!circumcircle || !circumcircle.radius) {
                return null;
            }
            
            const area = Math.PI * Math.pow(circumcircle.radius, 2);
            return {
                area: area,
                circumference: 2 * Math.PI * circumcircle.radius
            };
        } catch (error) {
            console.error('Error calculating circumcircle metrics:', error);
            return null;
        }
    }

    calculateExternalRegions() {
        try {
            const circumcircle = this.triangleSystem.calculateCircumcircle();
            if (!circumcircle || !circumcircle.radius) {
                return null;
            }

            const { n1, n2, n3 } = this.triangleSystem.system;

            const circle = new paper.Path.Circle({
                center: circumcircle.center,
                radius: circumcircle.radius,
                fillColor: new paper.Color(1, 0, 0, 0.5)
            });

            const triangle = new paper.Path({
                segments: [n1, n2, n3],
                closed: true,
                fillColor: new paper.Color(0, 0, 1, 0.5)
            });

            if (triangle.clockwise) {
                triangle.reverse();
            }

            const totalCircleArea = Math.abs(circle.area);
            const intersection = triangle.intersect(circle);
            const internalArea = intersection ? Math.abs(intersection.area) : 0;
            const externalArea = totalCircleArea - internalArea;

            // Clean up
            circle.remove();
            triangle.remove();
            if (intersection) intersection.remove();

            return {
                totalExternal: externalArea,
                cc1: externalArea / 3,
                cc2: externalArea / 3,
                cc3: externalArea / 3
            };
        } catch (error) {
            console.error('Error calculating external regions:', error);
            return null;
        }
    }

    calculateNinePointCircleMetrics() {
        try {
            const ninePointCircle = this.triangleSystem.calculateNinePointCircle();
            if (!ninePointCircle || !ninePointCircle.radius) {
                return null;
            }
            
            const area = Math.PI * Math.pow(ninePointCircle.radius, 2);
            return {
                area: area,
                circumference: 2 * Math.PI * ninePointCircle.radius
            };
        } catch (error) {
            console.error('Error calculating nine-point circle metrics:', error);
            return null;
        }
    }

    calculateNinePointExternalRegions() {
        try {
            const ninePointCircle = this.triangleSystem.calculateNinePointCircle();
            if (!ninePointCircle || !ninePointCircle.radius) {
                return null;
            }

            const { n1, n2, n3 } = this.triangleSystem.system;

            const circle = new paper.Path.Circle({
                center: ninePointCircle.center,
                radius: ninePointCircle.radius,
                fillColor: new paper.Color(1, 0, 0, 0.5)
            });

            const triangle = new paper.Path({
                segments: [n1, n2, n3],
                closed: true,
                fillColor: new paper.Color(0, 0, 1, 0.5)
            });

            if (triangle.clockwise) {
                triangle.reverse();
            }

            // Flatten paths slightly to improve intersection accuracy
            circle.flatten(0.5);  // Smaller value = more precise
            triangle.flatten(0.5);

            const totalCircleArea = Math.abs(circle.area);
            const intersection = triangle.intersect(circle);
            const internalArea = intersection ? Math.abs(intersection.area) : 0;
            
            // Apply epsilon threshold for very small external areas
            const epsilon = 1e-10;  // Adjust this value if needed
            let externalArea = totalCircleArea - internalArea;
            
            // If external area is very small relative to total area, consider it zero
            if (Math.abs(externalArea) < epsilon * totalCircleArea) {
                externalArea = 0;
            }

            // Clean up
            circle.remove();
            triangle.remove();
            if (intersection) intersection.remove();

            return {
                totalExternal: externalArea,
                nc1: 0,
                nc2: 0,
                nc3: 0,
                nc1Ratio: 0,
                nc2Ratio: 0,
                nc3Ratio: 0
            };
        } catch (error) {
            console.error('Error calculating nine-point external regions:', error);
            return null;
        }
    }
} 