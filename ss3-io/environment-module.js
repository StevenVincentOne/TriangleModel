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
        console.log('CircleMetrics initialized with TriangleSystem');
    }

    calculateExternalRegions() {
        console.log('Calculating external regions');
        try {
            const circumcircle = this.triangleSystem.calculateCircumcircle();
            if (!circumcircle || !circumcircle.radius) {
                console.log('Invalid circumcircle data');
                return null;
            }

            // Get triangle vertices from the system
            const { n1, n2, n3 } = this.triangleSystem.system;

            // Calculate total circumcircle area
            const totalCircumArea = Math.PI * Math.pow(circumcircle.radius, 2);
            
            // Calculate triangle area
            const triangleArea = this.triangleSystem.calculateArea();
            
            // Calculate total external area (CC - Triangle)
            const totalExternalArea = totalCircumArea - triangleArea;

            // Calculate angles at center for each vertex
            const angles = this.calculateCentralAngles(circumcircle.center, n1, n2, n3);

            // Calculate individual external regions based on angles
            const cc1 = (angles.n1 / (2 * Math.PI)) * totalExternalArea;
            const cc2 = (angles.n2 / (2 * Math.PI)) * totalExternalArea;
            const cc3 = (angles.n3 / (2 * Math.PI)) * totalExternalArea;

            const metrics = {
                totalExternal: totalExternalArea,
                cc1,
                cc2,
                cc3,
                cc1Ratio: cc1 / totalExternalArea,
                cc2Ratio: cc2 / totalExternalArea,
                cc3Ratio: cc3 / totalExternalArea
            };

            console.log('External region metrics calculated:', metrics);
            return metrics;
        } catch (error) {
            console.error('Error calculating external regions:', error);
            return null;
        }
    }

    calculateCentralAngles(center, n1, n2, n3) {
        // Calculate angles at circumcenter for each vertex
        const angleN1 = Math.atan2(n1.y - center.y, n1.x - center.x);
        const angleN2 = Math.atan2(n2.y - center.y, n2.x - center.x);
        const angleN3 = Math.atan2(n3.y - center.y, n3.x - center.x);

        // Create array of angle-vertex pairs to maintain association
        let anglePairs = [
            { angle: this.normalizeAngle(angleN1), vertex: 'n1' },
            { angle: this.normalizeAngle(angleN2), vertex: 'n2' },
            { angle: this.normalizeAngle(angleN3), vertex: 'n3' }
        ];
        
        // Sort by angle while maintaining vertex association
        anglePairs.sort((a, b) => a.angle - b.angle);

        // Calculate sectors while preserving vertex association
        const sectors = {
            n1: 0,
            n2: 0,
            n3: 0
        };

        // For each vertex, calculate its sector size
        for (let i = 0; i < 3; i++) {
            const nextI = (i + 1) % 3;
            const sector = this.normalizeAngle(
                i === 2 
                    ? anglePairs[0].angle - anglePairs[2].angle + 2 * Math.PI 
                    : anglePairs[nextI].angle - anglePairs[i].angle
            );
            sectors[anglePairs[i].vertex] = sector;
        }

        return sectors;
    }

    normalizeAngle(angle) {
        // Ensure angle is positive and less than 2π
        while (angle < 0) angle += 2 * Math.PI;
        while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
        return angle;
    }

    calculateCircumcircleMetrics() {
        console.log('Calculating circumcircle metrics');
        try {
            const circumcircle = this.triangleSystem.calculateCircumcircle();
            if (!circumcircle || !circumcircle.radius) {
                console.log('Invalid circumcircle data');
                return null;
            }

            const metrics = {
                area: Math.PI * Math.pow(circumcircle.radius, 2),
                circumference: 2 * Math.PI * circumcircle.radius
            };
            console.log('Circumcircle metrics calculated:', metrics);
            return metrics;
        } catch (error) {
            console.error('Error calculating circumcircle metrics:', error);
            return null;
        }
    }

    calculateNinePointCircleMetrics() {
        console.log('Calculating nine-point circle metrics');
        try {
            const ninePointCircle = this.triangleSystem.calculateNinePointCircle();
            if (!ninePointCircle || !ninePointCircle.radius) {
                console.log('Invalid nine-point circle data');
                return null;
            }

            const metrics = {
                area: Math.PI * Math.pow(ninePointCircle.radius, 2),
                circumference: 2 * Math.PI * ninePointCircle.radius
            };
            console.log('Nine-point circle metrics calculated:', metrics);
            return metrics;
        } catch (error) {
            console.error('Error calculating nine-point circle metrics:', error);
            return null;
        }
    }
} 