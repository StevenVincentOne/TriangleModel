import { LossFunction } from '../ss2-processing/data-processing.js';
import { CircleMetrics } from './circle-metrics.js';
import { CapacityModule } from './capacity-module.js';

export class EnvironmentModule {
    constructor(intelligenceModule, triangleSystem) {
        this.intelligenceModule = intelligenceModule;
        this.triangleSystem = triangleSystem;
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

        this.environmentalData = new EnvironmentalData();
        this.dashboardElements = {};
        this.initializeDashboardElements();
        this.initializeControls();
        
        // Initialize environmental data right after setup
        this.initializeEnvironmentalData();
        
        // Add debug logging
        console.log('Environment Module initialized with:', {
            cc: this.getCC(),
            ed: this.environmentalData.environmentalData,
            ccu: this.calculateCCU()
        });

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

        this.circleMetrics = new CircleMetrics(triangleSystem);
        this.capacityModule = new CapacityModule(this.circleMetrics);

        // Add EN flow rate handler
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

        // Add disturbance controls
        this.initializeDisturbanceControls();
    }

    initializeDisturbanceControls() {
        const disturbancePanel = document.getElementById('disturbanceControls');
        if (!disturbancePanel) return;

        const buttons = [
            { id: 'randomDisturbance', label: 'Random Disturbance', type: 'random' },
            { id: 'bitsSurge', label: 'Bits Surge', type: 'bits-surge' },
            { id: 'noiseSurge', label: 'Noise Surge', type: 'noise-surge' },
            { id: 'capacityDrop', label: 'Capacity Drop', type: 'capacity-drop' }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.id = btn.id;
            button.textContent = btn.label;
            button.addEventListener('click', () => {
                this.capacityModule.introduceDisturbance({
                    type: btn.type,
                    intensity: 0.5,
                    duration: 5000
                });
            });
            disturbancePanel.appendChild(button);
        });

        // Add intensity slider
        const intensitySlider = document.createElement('input');
        intensitySlider.type = 'range';
        intensitySlider.min = '0';
        intensitySlider.max = '100';
        intensitySlider.value = '50';
        intensitySlider.id = 'disturbanceIntensity';
        disturbancePanel.appendChild(intensitySlider);
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

    initializeDashboardElements() {
        this.dashboardElements = {
            environmentalData: document.getElementById('system-ed'),
            environmentalBits: document.getElementById('system-eb'),
            environmentalNoise: document.getElementById('system-en'),
            circumcircleArea: document.getElementById('circumcircle-area'),
            circumcircleUtilization: document.getElementById('circumcircle-utilization'),
            cc1Area: document.getElementById('cc1-area'),
            cc1Utilization: document.getElementById('cc1-utilization'),
            cc2Area: document.getElementById('cc2-area'),
            cc2Utilization: document.getElementById('cc2-utilization'),
            cc3Area: document.getElementById('cc3-area'),
            cc3Utilization: document.getElementById('cc3-utilization')
        };
    }

    initializeEnvironmentalData() {
        const metrics = this.triangleSystem.circleMetrics.calculateExternalRegions();
        if (metrics) {
            // Set ED to 50% of CC (total external area)
            const cc = metrics.totalExternal;
            this.environmentalData.environmentalData = cc * 0.5;
            
            // Initialize CC1-3 data at 50% of their respective capacities
            this.environmentalData.cc1Data = metrics.cc1 * 0.5;
            this.environmentalData.cc2Data = metrics.cc2 * 0.5;
            this.environmentalData.cc3Data = metrics.cc3 * 0.5;
            
            this.updateDashboard();
        }
    }

    updateDashboard() {
        const metrics = this.triangleSystem.circleMetrics.calculateExternalRegions();
        if (metrics) {
            // Update CC and CCU
            const cc = metrics.totalExternal;
            const ccu = this.calculateCCU();

            if (this.dashboardElements.circumcircleArea) {
                this.dashboardElements.circumcircleArea.value = cc.toFixed(2);
            }
            if (this.dashboardElements.circumcircleUtilization) {
                this.dashboardElements.circumcircleUtilization.value = `${ccu.toFixed(1)}%`;
            }

            // Update CC1-3 areas and utilizations
            if (this.dashboardElements.cc1Area) {
                this.dashboardElements.cc1Area.value = metrics.cc1.toFixed(2);
            }
            if (this.dashboardElements.cc1Utilization) {
                const cc1u = (this.environmentalData.cc1Data / metrics.cc1) * 100;
                this.dashboardElements.cc1Utilization.value = `${cc1u.toFixed(1)}%`;
            }

            if (this.dashboardElements.cc2Area) {
                this.dashboardElements.cc2Area.value = metrics.cc2.toFixed(2);
            }
            if (this.dashboardElements.cc2Utilization) {
                const cc2u = (this.environmentalData.cc2Data / metrics.cc2) * 100;
                this.dashboardElements.cc2Utilization.value = `${cc2u.toFixed(1)}%`;
            }

            if (this.dashboardElements.cc3Area) {
                this.dashboardElements.cc3Area.value = metrics.cc3.toFixed(2);
            }
            if (this.dashboardElements.cc3Utilization) {
                const cc3u = (this.environmentalData.cc3Data / metrics.cc3) * 100;
                this.dashboardElements.cc3Utilization.value = `${cc3u.toFixed(1)}%`;
            }

            // Update Environmental Data values
            if (this.dashboardElements.environmentalData) {
                this.dashboardElements.environmentalData.value = 
                    this.environmentalData.environmentalData.toFixed(2);
            }
            if (this.dashboardElements.environmentalBits) {
                this.dashboardElements.environmentalBits.value = 
                    this.environmentalData.environmentalBits.toFixed(2);
            }
            if (this.dashboardElements.environmentalNoise) {
                this.dashboardElements.environmentalNoise.value = 
                    this.environmentalData.environmentalNoise.toFixed(2);
            }
        }
    }

    getCC() {
        const metrics = this.triangleSystem.circleMetrics.calculateExternalRegions();
        return metrics ? metrics.totalExternal : 0;
    }

    calculateCCU() {
        const cc = this.getCC();
        if (cc === 0) return 0;
        return (this.environmentalData.environmentalData / cc) * 100;
    }
}

class EnvironmentalData {
    constructor() {
        this._environmentalData = 0;  // ED
        this._environmentalBits = 0;   // EB
        this._environmentalNoise = 0;  // EN
        this.cc1Data = 0;
        this.cc2Data = 0;
        this.cc3Data = 0;
    }

    get environmentalData() {
        return this._environmentalData;
    }

    set environmentalData(value) {
        this._environmentalData = Math.max(0, value);
        // When ED is set, distribute it equally between EB and EN
        this._environmentalBits = this._environmentalData * 0.5;
        this._environmentalNoise = this._environmentalData * 0.5;
    }

    get environmentalBits() {
        return this._environmentalBits;
    }

    get environmentalNoise() {
        return this._environmentalNoise;
    }

    set environmentalBits(value) {
        this._environmentalBits = Math.max(0, value);
        this.recalculateED();
    }

    set environmentalNoise(value) {
        this._environmentalNoise = Math.max(0, value);
        this.recalculateED();
    }

    recalculateED() {
        this._environmentalData = this._environmentalBits + this._environmentalNoise;
    }
} 