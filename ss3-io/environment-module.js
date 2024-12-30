import { LossFunction } from '../ss2-processing/data-processing.js';
import { CircleMetrics } from './circle-metrics.js';
import { CapacityModule } from './capacity-module.js';
import { EnvironmentDatabase } from '../shared/ui/database.js';

export class EnvironmentModule {
    constructor(intelligenceModule, triangleSystem, environmentDB) {
        console.log('Initializing EnvironmentModule');
        this.intelligenceModule = intelligenceModule;
        this.triangleSystem = triangleSystem;
        this.environmentDB = environmentDB;
        this.lossFunction = new LossFunction();
        this.isGenerating = false;
        this.generationInterval = null;
        this.flowRate = 10;
        this.enFlowRate = 0;
        this.enGenerationInterval = null;
        this.environmentalData = new EnvironmentalData();
        this.capacityModule = null;
        this.addFlowRateEventListeners();
        
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

        this.environmentDB = new EnvironmentDatabase();
        this.environmentData = new EnvironmentalData(this.environmentDB);

        this.dashboardElements = {};
        this.initializeDashboardElements();
        this.initializeControls();
        
        
        
        // Remove the initialize button handler from here since it's handled in index.js
        
        // Keep the zero data button handler
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

        // Add debug logging
        console.log('Environment Module initialized with:', {
            cc: this.getCC(),
            ed: this.environmentalData.environmentalData,
            ccu: this.calculateCCU()
        });

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

        // Add observer to triangle system's dashboard updates
        if (this.triangleSystem) {
            const originalUpdateDashboard = this.triangleSystem.updateDashboard.bind(this.triangleSystem);
            this.triangleSystem.updateDashboard = () => {
                originalUpdateDashboard();
                // After triangle updates its dashboard, update our CC values
                this.updateCircleCapacities();
            };
        }

        this.circleMetrics = new CircleMetrics(triangleSystem);

        // Add monitoring interval
        this.monitoringInterval = null;
        
        this.startStoreMonitoring();

        // Add cache for previous values and batch tracking
        this.previousValues = {
            ed: null,
            eb: null,
            en: null
        };
        this.batchTracking = {
            changeCount: 0,
            lastLogTime: Date.now(),
            BATCH_THRESHOLD: 300,  // Log after 300 symbol changes
            MIN_LOG_INTERVAL: 5000 // Minimum 5 seconds between logs
        };

        // Start monitoring but don't initialize data
        this.startEnvironmentMonitoring();
    }

    initializeControls() {
        const toggleBtn = document.getElementById('letterFlowToggle');
        const rateValue = document.getElementById('flow-rate');

        console.log('Found elements:', {
            toggleBtn: toggleBtn ? 'yes' : 'no',
            rateValue: rateValue ? 'yes' : 'no'
        });

        

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

    async initializeEnvironmentalData(resetToZero = false) {
        try {
            console.log('Waiting for database to be ready...');
            // Wait for database to be ready
            await this.environmentDB.ready;
            console.log('Database is ready, proceeding with initialization');

            // Clear existing data first
            const initialData = {
                bits: Array(13825).fill({ type: 'bit' }),
                noise: Array(13825).fill({ type: 'noise' }),
                timestamp: Date.now()
            };
            
            await this.environmentDB.storeEnvironmentalPool(initialData);
            console.log('Stored new environmental data');
            
            // Update the display
            await this.updateEnvironmentDisplay();
        } catch (error) {
            console.error('Error in initializeEnvironmentalData:', error);
        }
    }

    updateDashboard() {
        const metrics = this.triangleSystem.circleMetrics.calculateExternalRegions();
        if (metrics) {
            // Update CC areas only
            if (this.dashboardElements.circumcircleArea) {
                this.dashboardElements.circumcircleArea.value = metrics.totalExternal.toFixed(2);
            }
            if (this.dashboardElements.cc1Area) {
                this.dashboardElements.cc1Area.value = metrics.cc1.toFixed(2);
            }
            if (this.dashboardElements.cc2Area) {
                this.dashboardElements.cc2Area.value = metrics.cc2.toFixed(2);
            }
            if (this.dashboardElements.cc3Area) {
                this.dashboardElements.cc3Area.value = metrics.cc3.toFixed(2);
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

            // Notify CapacityModule of metrics change
            if (this.triangleSystem.capacityModule) {
                this.triangleSystem.capacityModule.updateUtilizationPercentages(metrics);
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

    // New method to update only CC values
    updateCircleCapacities() {
        try {
            const metrics = this.triangleSystem?.circleMetrics?.calculateExternalRegions();
            if (!metrics) {
                console.warn('No metrics available for updateCircleCapacities');
                return;
            }

            console.log('Updating circle capacities with metrics:', metrics);
            
            // Update area displays
            if (this.dashboardElements.circumcircleArea) {
                this.dashboardElements.circumcircleArea.value = metrics.totalExternal?.toFixed(2) || '0.00';
            }
            if (this.dashboardElements.cc1Area) {
                this.dashboardElements.cc1Area.value = metrics.cc1?.toFixed(2) || '0.00';
            }
            if (this.dashboardElements.cc2Area) {
                this.dashboardElements.cc2Area.value = metrics.cc2?.toFixed(2) || '0.00';
            }
            if (this.dashboardElements.cc3Area) {
                this.dashboardElements.cc3Area.value = metrics.cc3?.toFixed(2) || '0.00';
            }

            // Notify CapacityModule of the update
            if (this.triangleSystem?.capacityModule) {
                console.log('Notifying CapacityModule of metrics update');
                this.triangleSystem.capacityModule.updateUtilizationPercentages(metrics);
            }

        } catch (error) {
            console.error('Error in updateCircleCapacities:', error);
        }
    }

    async handleInitialization(initialState) {
        if (!initialState) {
            console.warn('No initial state provided to handleInitialization');
            return;
        }

        console.log('EnvironmentModule handling initialization with state:', {
            edPercent: initialState.metrics.edPercent,
            ebPercent: initialState.metrics.ebPercent,
            totalCapacity: initialState.metrics.totalCapacity,
            usedCapacity: initialState.metrics.usedCapacity,
            bitsCount: initialState.metrics.bitsCount,
            noiseCount: initialState.metrics.noiseCount,
            cc1: initialState.metrics.cc1,
            cc2: initialState.metrics.cc2,
            cc3: initialState.metrics.cc3
        });

        // Update environmental data with the provided state
        this.environmentalData.setDirectly(
            initialState.metrics.bitsCount || 0,
            initialState.metrics.noiseCount || 0
        );

        // Update CC data
        this.environmentalData.cc1Data = initialState.metrics.cc1 || 0;
        this.environmentalData.cc2Data = initialState.metrics.cc2 || 0;
        this.environmentalData.cc3Data = initialState.metrics.cc3 || 0;

        // Let CapacityModule handle the dashboard update
        // Remove this.updateDashboard() call to prevent competing updates

        console.log('EnvironmentModule initialization complete with values:', {
            environmentalData: this.environmentalData.environmentalData,
            bits: this.environmentalData.environmentalBits,
            noise: this.environmentalData.environmentalNoise,
            cc1: this.environmentalData.cc1Data,
            cc2: this.environmentalData.cc2Data,
            cc3: this.environmentalData.cc3Data
        });
    }

    addFlowRateEventListeners() {
        // Handle flow rate input
        const rateInput = document.getElementById('flow-rate');
        if (rateInput) {
            rateInput.value = this.flowRate;
            
            // Handle both input and keypress events
            rateInput.addEventListener('input', (e) => {
                const newRate = Math.min(1000, Math.max(0, parseInt(e.target.value) || 0));
                this.updateFlowRate(newRate);
            });

            rateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const newRate = Math.min(1000, Math.max(0, parseInt(e.target.value) || 0));
                    this.updateFlowRate(newRate);
                    rateInput.blur();
                }
            });
        }

        // Handle EN flow rate input
        const enRateInput = document.getElementById('en-flow-rate');
        if (enRateInput) {
            enRateInput.value = this.enFlowRate;
            
            enRateInput.addEventListener('input', (e) => {
                const newRate = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                this.updateENFlowRate(newRate);
            });

            enRateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const newRate = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                    this.updateENFlowRate(newRate);
                    enRateInput.blur();
                }
            });
        }
    }

    async clearExistingData() {
        try {
            console.log('clearExistingData: Starting to clear existing data...');
            await this.environmentDB.ready;
            console.log('clearExistingData: EnvironmentDB is ready');

            console.log('clearExistingData: Clearing "environmental" store...');
            await this.environmentDB.clearStore('environmental');
            console.log('clearExistingData: "environmental" store cleared');

            console.log('clearExistingData: Clearing "processing" store...');
            await this.environmentDB.clearStore('processing');
            console.log('clearExistingData: "processing" store cleared');

            console.log('clearExistingData: Resetting in-memory environmental data');
            this.resetEnvironmentalData();

            console.log('clearExistingData: All stores cleared successfully');
            return true;
        } catch (error) {
            console.error('clearExistingData: Error clearing stores:', error);
            throw error;
        }
    }

    resetEnvironmentalData() {
        // Implement any in-memory data reset logic if needed
        console.log('resetEnvironmentalData: In-memory environmental data reset');
    }

    async handlingInitialization(state) {
        console.log('handleInitialization: Starting environment initialization...');
        try {
            console.log('handleInitialization: Clearing existing data...');
            const cleared = await this.clearExistingData();
            if (!cleared) {
                throw new Error('handleInitialization: Failed to clear existing data');
            }
            console.log('handleInitialization: Existing data cleared successfully');

            console.log('handleInitialization: Generating new environmental data...');
            await this.environmentData.generateNewData(state);
            console.log('handleInitialization: New environmental data generated');

            console.log('handleInitialization: Initialization complete');
            return true;
        } catch (error) {
            console.error('handleInitialization: Error during environment initialization:', error);
            throw error;
        }
    }

    async updateEnvironmentDisplay() {
        try {
            // Get all symbols from environment store
            const environmentalData = await this.environmentDB.getEnvironmentalPool();
            const currentData = environmentalData[0];
            
            if (!currentData) {
                
                return;
            }

            // Calculate totals from arrays
            const totalBits = currentData.bits?.length || 0;
            const totalNoise = currentData.noise?.length || 0;
            const totalData = totalBits + totalNoise;

            // Check if values have changed before updating
            const edInput = document.getElementById('system-ed');
            const ebInput = document.getElementById('system-eb');
            const enInput = document.getElementById('system-en');

            const hasChanged = 
                edInput && parseFloat(edInput.value) !== totalData ||
                ebInput && parseFloat(ebInput.value) !== totalBits ||
                enInput && parseFloat(enInput.value) !== totalNoise;

            // Only update and log if values have changed
            if (hasChanged) {
                if (edInput) edInput.value = totalData.toFixed(2);
                if (ebInput) ebInput.value = totalBits.toFixed(2);
                if (enInput) enInput.value = totalNoise.toFixed(2);

                console.log('Environmental Data values updated:', {
                    totalData,
                    totalBits,
                    totalNoise
                });
            }
        } catch (error) {
            console.error('Error updating environment display:', error);
        }
    }

    async startStoreMonitoring() {
        console.log('Starting environment store monitoring');
        
        // Initial update
        await this.updateEnvironmentDisplay();

        // Set up periodic monitoring
        this.monitoringInterval = setInterval(async () => {
            await this.updateEnvironmentDisplay();
        }, 1000); // Update every second
    }

    stopStoreMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('Environment store monitoring stopped');
        }
    }

    // Add cleanup method
    cleanup() {
        this.stopStoreMonitoring();
        // ... any other cleanup needed
    }

    // Make sure this is called when component is destroyed/unmounted
    destroy() {
        this.cleanup();
    }

    startEnvironmentMonitoring() {
        // Clear any existing interval
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        
        // Update immediately
        this.updateEnvironmentDisplay();
        
        // Listen for ALL store changes
        window.addEventListener('storeChanged', async (event) => {
            if (event.detail.store === 'environment') {
                console.log('Environment store changed:', event.detail.action);
                // Always update display when environment store changes
                await this.updateEnvironmentDisplay();
            }
        });
    }
}

class EnvironmentalData {
    constructor(environmentDB) {
        this.environmentDB = environmentDB;
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

    // Add method to directly set bits and noise without recalculating
    setDirectly(bits, noise) {
        this._environmentalBits = Math.max(0, bits);
        this._environmentalNoise = Math.max(0, noise);
        this._environmentalData = this._environmentalBits + this._environmentalNoise;
    }

    decrementBits() {
        if (this._environmentalBits > 0) {
            this._environmentalBits = Math.max(0, this._environmentalBits - 1);
            this.recalculateED();
        }
    }

    decrementNoise() {
        if (this._environmentalNoise > 0) {
            this._environmentalNoise = Math.max(0, this._environmentalNoise - 1);
            this.recalculateED();
        }
    }

    incrementNoise() {
        this._environmentalNoise++;
        this.recalculateED();
    }
}

document.getElementById('zeroDataButton')?.addEventListener('click', () => {
    const button = document.getElementById('zeroDataButton');
    if (button) {
        button.classList.add('flash');
        setTimeout(() => {
            button.classList.remove('flash');
        }, 1000);
    }
    // ... rest of zero data functionality
});