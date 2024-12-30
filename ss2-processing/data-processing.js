import { environmentDB } from '../shared/ui/database.js';

export class LossFunction {
    constructor() {
        this.lossFactors = {
            inputLoss: 0.0,    // Existing D loss factor
            bitsLoss: 0.0,     // New B loss factor (processing cost)
            noiseGain: 0.0     // New N gain factor (processing errors)
        };

        // English to Greek mapping
        this.greekConversion = {
            'A': 'α',  // alpha
            'B': 'β',  // beta
            'C': 'χ',  // chi
            'D': 'δ',  // delta
            'E': 'ε',  // epsilon
            'F': 'φ',  // phi
            'G': 'γ',  // gamma
            'H': 'η',  // eta
            'I': 'ι',  // iota
            'J': 'ξ',  // xi
            'K': 'κ',  // kappa
            'L': 'λ',  // lambda
            'M': 'μ',  // mu
            'N': 'ν',  // nu
            'O': 'ο',  // omicron
            'P': 'π',  // pi
            'Q': 'ψ',  // psi
            'R': 'ρ',  // rho
            'S': 'σ',  // sigma
            'T': 'τ',  // tau
            'U': 'υ',  // upsilon
            'V': 'ϑ',  // theta variant
            'W': 'ω',  // omega
            'X': 'χ',  // chi
            'Y': 'ψ',  // psi
            'Z': 'ζ',  // zeta
            '/': 'ς',  // final sigma
            '+': 'Σ',  // capital sigma
            '&': 'Ω',  // capital omega
            '∅': 'θ'   // theta
        };
    }

    // Determine if a letter results in entropy based on the loss factor
    processDataLoss(letter) {
        const isEntropy = Math.random() < this.lossFactors.inputLoss;
        console.log(`Processing letter: "${letter}" with loss factor: ${(this.lossFactors.inputLoss * 100).toFixed(2)}% Result: ${isEntropy ? 'Entropy (E)' : 'Data (D)'}`);
        return { entropy: isEntropy, value: isEntropy ? 'E' : 'D' };
    }

    // Convert letter to its Greek equivalent
    convertToGreek(letter) {
        return this.greekConversion[letter] || letter;
    }

    // Get current loss factor
    getLossFactor() {
        return this.lossFactors.inputLoss;
    }

    // Set new loss factor
    setLossFactor(value) {
        if (value >= 0 && value <= 1) {
            this.lossFactors.inputLoss = value;
            console.log('Loss factor updated to:', `${this.lossFactors.inputLoss * 100}%`);
        }
    }

    // Get/Set methods for new factors
    getBitsLossFactor() {
        return this.lossFactors.bitsLoss;
    }

    setBitsLossFactor(value) {
        if (value >= 0 && value <= 1) {
            this.lossFactors.bitsLoss = value;
            console.log('Bits loss factor updated to:', `${this.lossFactors.bitsLoss * 100}%`);
        }
    }

    getNoiseGainFactor() {
        return this.lossFactors.noiseGain;
    }

    setNoiseGainFactor(value) {
        if (value >= 0 && value <= 1) {
            this.lossFactors.noiseGain = value;
            console.log('Noise gain factor updated to:', `${this.lossFactors.noiseGain * 100}%`);
        }
    }

    // Process incoming environmental data with all loss/gain factors
    processData(data) {
        const result = {
            originalBits: data.bits,
            originalNoise: data.noise,
            processedBits: data.bits,
            processedNoise: data.noise,
            lostBits: 0,
            gainedNoise: 0
        };

        // Apply processing cost (B loss)
        const bitsLost = Math.floor(result.processedBits * this.lossFactors.bitsLoss);
        result.processedBits -= bitsLost;
        result.lostBits = bitsLost;

        // Apply processing errors (N gain)
        const noiseGained = Math.floor(result.processedBits * this.lossFactors.noiseGain);
        result.processedNoise += noiseGained;
        result.gainedNoise = noiseGained;

        // Apply existing input loss
        const inputLoss = Math.floor(result.processedBits * this.lossFactors.inputLoss);
        result.processedBits -= inputLoss;
        result.processedNoise += inputLoss;

        console.log('Processing Results:', {
            original: { bits: result.originalBits, noise: result.originalNoise },
            processed: { bits: result.processedBits, noise: result.processedNoise },
            changes: { 
                lostBits: result.lostBits,
                gainedNoise: result.gainedNoise,
                inputLoss: inputLoss
            }
        });

        return result;
    }
}

export class NodeChannelEntropy {
    constructor(intelligenceModule) {
        this.intelligenceModule = intelligenceModule;
        this.bitToEntropyMapping = {
            // NC1 Channel Letters (9 letters)
            'A': { bit: 'A', entropy: 'α', channel: 'NC1' },  // Will send -1 as bit, +1 as entropy
            'D': { bit: 'D', entropy: 'δ', channel: 'NC1' },
            'G': { bit: 'G', entropy: 'γ', channel: 'NC1' },
            'J': { bit: 'J', entropy: 'ξ', channel: 'NC1' },
            'M': { bit: 'M', entropy: 'μ', channel: 'NC1' },
            'P': { bit: 'P', entropy: 'π', channel: 'NC1' },
            'S': { bit: 'S', entropy: 'σ', channel: 'NC1' },
            'V': { bit: 'V', entropy: 'ϑ', channel: 'NC1' },
            'Y': { bit: 'Y', entropy: 'ψ', channel: 'NC1' },

            // NC2 Channel Letters (9 letters)
            'B': { bit: 'B', entropy: 'β', channel: 'NC2' },
            'E': { bit: 'E', entropy: 'ε', channel: 'NC2' },
            'H': { bit: 'H', entropy: 'η', channel: 'NC2' },
            'K': { bit: 'K', entropy: 'κ', channel: 'NC2' },
            'N': { bit: 'N', entropy: 'ν', channel: 'NC2' },
            'Q': { bit: 'Q', entropy: 'ψ', channel: 'NC2' },
            'T': { bit: 'T', entropy: 'τ', channel: 'NC2' },
            'W': { bit: 'W', entropy: 'ω', channel: 'NC2' },
            'Z': { bit: 'Z', entropy: 'ζ', channel: 'NC2' },

            // NC3 Channel Letters (9 letters)
            'C': { bit: 'C', entropy: 'χ', channel: 'NC3' },
            'F': { bit: 'F', entropy: 'φ', channel: 'NC3' },
            'I': { bit: 'I', entropy: 'ι', channel: 'NC3' },
            'L': { bit: 'L', entropy: 'λ', channel: 'NC3' },
            'O': { bit: 'O', entropy: 'ο', channel: 'NC3' },
            'R': { bit: 'R', entropy: 'ρ', channel: 'NC3' },
            'U': { bit: 'U', entropy: 'υ', channel: 'NC3' },
            'X': { bit: 'X', entropy: 'χ', channel: 'NC3' },
            '∅': { bit: '∅', entropy: 'θ', channel: 'NC3' }
        };
    }

    // Removed processLetter as it's handled by IntelligenceModule
}

export class DataProcessing {
    constructor(environmentModule) {
        console.log('DataProcessing constructor called');
        this.environmentModule = environmentModule;
        this.environmentDB = environmentModule.environmentDB;
        
        this.isProcessing = false;
        this.flowInterval = null;
        this.flowRate = 10;
        this.pbPercent = 50;
        
        // Add cache for previous values and batch tracking
        this.previousValues = {
            pd: null,
            pb: null,
            pn: null
        };
        
        this.batchTracking = {
            processedCount: 0,
            lastLogTime: Date.now(),
            BATCH_THRESHOLD: 300,
            MIN_LOG_INTERVAL: 5000 // Minimum 5 seconds between logs
        };
        
        this.setupControls();
        this.startProcessPoolMonitoring();
    }

    async init() {
        try {
            await this.environmentDB.ready;
            console.log('Database ready for processing');
            this.initializeDashboardElements();
            this.setupControls();
        } catch (error) {
            console.error('Error initializing DataProcessing:', error);
        }
    }

    initializeDashboardElements() {
        this.dashboardElements = {
            processData: document.getElementById('process-d'),
            processBits: document.getElementById('process-b'),
            processNoise: document.getElementById('process-n')
        };
    }

    setupControls() {
        console.log('Setting up controls');
        
        // Process button handler
        const processButton = document.getElementById('processDataButton');
        console.log('Process button element:', processButton);
        
        if (processButton) {
            // Remove any existing listeners first
            processButton.removeEventListener('click', this.processButtonClick);
            // Add new listener with bound context
            processButton.addEventListener('click', () => this.processButtonClick());
        }

        // Flow rate control
        const flowRateInput = document.getElementById('flow-rate');
        if (flowRateInput) {
            flowRateInput.addEventListener('input', (e) => {
                this.flowRate = parseInt(e.target.value) || 0;
            });
        }

        // PB percentage control
        const pbFlowRate = document.getElementById('pb-flow-rate');
        if (pbFlowRate) {
            pbFlowRate.addEventListener('input', (e) => {
                this.pbPercent = parseInt(e.target.value) || 0;
                const pnInput = document.getElementById('pn-flow-rate');
                if (pnInput) {
                    pnInput.value = Math.round(100 - this.pbPercent);
                }
            });
        }
    }

    async startDataFlow() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        this.flowInterval = setInterval(async () => {
            try {
                const envData = await this.environmentModule.environmentDB.getEnvironmentalPool();
                if (!envData || (!envData.bits.length && !envData.noise.length)) {
                    console.log('No environmental data available');
                    return;
                }

                // Calculate symbols to process based on flow rate
                const symbolsToProcess = Math.min(this.flowRate, envData.bits.length + envData.noise.length);
                
                for (let i = 0; i < symbolsToProcess; i++) {
                    const processingAsBit = Math.random() * 100 < this.pbPercent;
                    let symbol;

                    if (processingAsBit && envData.bits.length > 0) {
                        symbol = envData.bits.shift();
                        this.processingPool.processBits++;
                    } else if (!processingAsBit && envData.noise.length > 0) {
                        symbol = envData.noise.shift();
                        this.processingPool.processNoise++;
                    } else {
                        continue;
                    }

                    this.processingPool.totalData++;

                    // Skip storing if processingPoolDB is not available
                    if (!this.processingPoolDB) {
                        console.log('Processing Pool DB not available - continuing without storage');
                        continue;
                    }

                    try {
                        await this.processingPoolDB.storeSymbol({
                            symbol,
                            timestamp: Date.now(),
                            type: processingAsBit ? 'bit' : 'noise'
                        });
                    } catch (error) {
                        console.log('Unable to store symbol - continuing without storage');
                        continue;
                    }
                }

                // Update environmental database
                await this.environmentModule.environmentDB.storeEnvironmentalPool(envData);
                
                // Update displays
                this.updateDashboard();
            } catch (error) {
                console.error('Error in data flow:', error);
            }
        }, 1000);
    }

    stopDataFlow() {
        this.isProcessing = false;
        clearInterval(this.flowInterval);
    }

    updateDashboard() {
        if (this.dashboardElements.processData) {
            this.dashboardElements.processData.value = this.processingPool.totalData.toFixed(2);
        }
        if (this.dashboardElements.processBits) {
            this.dashboardElements.processBits.value = this.processingPool.processBits.toFixed(2);
        }
        if (this.dashboardElements.processNoise) {
            this.dashboardElements.processNoise.value = this.processingPool.processNoise.toFixed(2);
        }
    }

    async startProcessing() {
        console.log('startProcessing called');
        if (!this.environmentDB) {
            console.error('No database connection available');
            return;
        }

        try {
            console.log('Setting up process interval');
            this.processInterval = setInterval(async () => {
                try {
                    // Get data from environmental pool
                    const envData = await this.environmentDB.getEnvironmentalPool();
                    console.log('Retrieved environmental data:', envData);

                    if (!envData || envData.length === 0) {
                        console.log('No environmental data available');
                        return;
                    }

                    // Process the array of symbols
                    for (const symbol of envData) {
                        // Process each symbol
                        await this.processSymbol(symbol);
                    }

                } catch (error) {
                    console.error('Error in processing cycle:', error);
                }
            }, 1000);

        } catch (error) {
            console.error('Error starting processing:', error);
        }
    }

    async processNextSymbol(envData) {
        try {
            // Determine whether to process bit or noise based on percentages
            const processBit = Math.random() * 100 < this.pbPercent;
            
            if (processBit && envData.bits && envData.bits.length > 0) {
                const symbol = envData.bits.shift();
                // Update bitsLength
                if (envData.bitsLength !== undefined) {
                    envData.bitsLength = envData.bits.length;
                }
                return {
                    symbol,
                    type: 'bit',
                    timestamp: Date.now()
                };
            } else if (!processBit && envData.noise && envData.noise.length > 0) {
                const symbol = envData.noise.shift();
                // Update noiseLength
                if (envData.noiseLength !== undefined) {
                    envData.noiseLength = envData.noise.length;
                }
                return {
                    symbol,
                    type: 'noise',
                    timestamp: Date.now()
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error processing symbol:', error);
            return null;
        }
    }

    // Update process control methods
    async processButtonClick() {
        console.log('Process button clicked');
        if (this.isProcessing) {
            console.log('Stopping processing');
            this.stopProcessing();
            // Update button state
            const processButton = document.getElementById('processDataButton');
            if (processButton) {
                processButton.classList.remove('active');
            }
        } else {
            console.log('Starting processing');
            this.isProcessing = true;
            await this.startProcessing();
            // Update button state
            const processButton = document.getElementById('processDataButton');
            if (processButton) {
                processButton.classList.add('active');
            }
        }
    }

    stopProcessing() {
        console.log('Stopping processing...');
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
        }
        this.isProcessing = false;
        console.log('Processing stopped');
    }

    async processData() {
        try {
            const envData = await this.environmentModule.environmentDB.getEnvironmentalPool();
            if (!envData) return;

            const symbolsToProcess = Math.min(this.flowRate, envData.bits.length + envData.noise.length);
            
            for (let i = 0; i < symbolsToProcess; i++) {
                const processingAsBit = Math.random() * 100 < this.pbPercent;
                let symbol;
                let symbolType;

                if (processingAsBit && envData.bits.length > 0) {
                    symbol = envData.bits.shift();
                    
                    if (Math.random() * 100 < this.pbLossRate) {
                        symbolType = 'noise';
                        this.processingPool.processNoise++;
                        this.batchStats.processedNoise++;
                        this.batchStats.lostBits++;
                        this.environmentModule.environmentalData.decrementBits();
                        this.environmentModule.environmentalData.incrementNoise();
                    } else {
                        symbolType = 'bit';
                        this.processingPool.processBits++;
                        this.batchStats.processedBits++;
                        this.environmentModule.environmentalData.decrementBits();
                    }
                } else if (!processingAsBit && envData.noise.length > 0) {
                    symbol = envData.noise.shift();
                    symbolType = 'noise';
                    this.processingPool.processNoise++;
                    this.batchStats.processedNoise++;
                    this.environmentModule.environmentalData.decrementNoise();
                } else {
                    continue;
                }

                this.processedCount++;
                this.processingPool.totalData++;

                // Store in processing pool
                await this.processingPoolDB.storeSymbol({
                    symbol,
                    timestamp: Date.now(),
                    type: symbolType
                });

                // Log batch stats every 300 symbols
                if (this.processedCount % this.batchSize === 0) {
                    console.log(`Processing Batch Report (${this.batchSize} symbols):`, {
                        processedBits: this.batchStats.processedBits,
                        processedNoise: this.batchStats.processedNoise,
                        lostBits: this.batchStats.lostBits,
                        totalProcessed: this.processedCount,
                        remainingBits: envData.bits.length,
                        remainingNoise: envData.noise.length
                    });
                    
                    // Reset batch stats
                    this.batchStats = {
                        processedBits: 0,
                        processedNoise: 0,
                        lostBits: 0
                    };
                }
            }

            // Update environmental database
            await this.environmentModule.environmentDB.storeEnvironmentalPool(envData);
            
            // Update both dashboards
            this.updateDashboard();
            this.environmentModule.updateDashboard();

        } catch (error) {
            console.error('Error in processData:', error);
        }
    }

    resetProcessingPool() {
        this.processingPool = {
            totalData: 0,
            processBits: 0,
            processNoise: 0
        };
        this.totalProcessedCount = 0;
        this.batchStats = this.createEmptyBatchStats();
        console.log('Processing pool reset');
    }

    // Add this method to be called during initialization
    async handleInitialization() {
        try {
            // Stop any ongoing processing
            if (this.isProcessing) {
                this.stopProcessing();
            }
            
            // Reset all processing-related data
            this.resetProcessingPool();
            
            console.log('DataProcessing initialization complete');
        } catch (error) {
            console.error('Error during DataProcessing initialization:', error);
        }
    }

    async startProcessPoolMonitoring() {
        console.log('Starting process pool monitoring');
        
        // Initial update
        await this.updateProcessPoolDisplay();

        // Set up periodic monitoring
        this.monitoringInterval = setInterval(async () => {
            await this.updateProcessPoolDisplay();
        }, 5000); // Update every 5 seconds
    }

    async updateProcessPoolDisplay() {
        try {
            if (!this.environmentDB) {
                return;
            }
            
            const processedSymbols = await this.environmentDB.getProcessedSymbols();
            
            if (!processedSymbols || processedSymbols.length === 0) {
                if (this.previousValues.pd !== 0) {
                    const pdInput = document.getElementById('process-d');
                    const pbInput = document.getElementById('process-b');
                    const pnInput = document.getElementById('process-n');

                    if (pdInput) pdInput.value = '0.00';
                    if (pbInput) pbInput.value = '0.00';
                    if (pnInput) pnInput.value = '0.00';
                    
                    this.previousValues = { pd: 0, pb: 0, pn: 0 };
                }
                return;
            }

            // Count bits and noise
            const counts = processedSymbols.reduce((acc, symbol) => {
                if (symbol.type === 'bit') {
                    acc.bits++;
                } else if (symbol.type === 'noise') {
                    acc.noise++;
                }
                return acc;
            }, { bits: 0, noise: 0 });

            const totalData = counts.bits + counts.noise;

            // Check if values have changed
            const hasChanged = 
                this.previousValues.pd !== totalData ||
                this.previousValues.pb !== counts.bits ||
                this.previousValues.pn !== counts.noise;

            if (hasChanged) {
                // Update displays
                const pdInput = document.getElementById('process-d');
                const pbInput = document.getElementById('process-b');
                const pnInput = document.getElementById('process-n');

                if (pdInput) pdInput.value = totalData.toFixed(2);
                if (pbInput) pbInput.value = counts.bits.toFixed(2);
                if (pnInput) pnInput.value = counts.noise.toFixed(2);
                
                // Calculate change in processed data
                const processedDiff = Math.abs((this.previousValues.pd || 0) - totalData);
                this.batchTracking.processedCount += processedDiff;
                
                // Update previous values
                this.previousValues = {
                    pd: totalData,
                    pb: counts.bits,
                    pn: counts.noise
                };

                // Check if we should log based on batch threshold and time interval
                const now = Date.now();
                if (this.batchTracking.processedCount >= this.batchTracking.BATCH_THRESHOLD &&
                    (now - this.batchTracking.lastLogTime) >= this.batchTracking.MIN_LOG_INTERVAL) {
                    
                    console.log('Process Pool Batch Update:', {
                        processedSinceLastLog: this.batchTracking.processedCount,
                        currentTotals: {
                            pd: totalData,
                            pb: counts.bits,
                            pn: counts.noise
                        },
                        timeSinceLastLog: `${((now - this.batchTracking.lastLogTime) / 1000).toFixed(1)}s`
                    });

                    // Reset batch tracking
                    this.batchTracking.processedCount = 0;
                    this.batchTracking.lastLogTime = now;
                }
            }
        } catch (error) {
            console.error('Error updating process pool display:', error);
        }
    }

    stopProcessPoolMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('Process pool monitoring stopped');
        }
    }

    // Add cleanup method
    cleanup() {
        this.stopProcessPoolMonitoring();
    }

    // Make sure this is called when component is destroyed
    destroy() {
        this.cleanup();
    }

    async processSymbol(symbol) {
        try {
            // Store the symbol in the processing store
            await this.environmentDB.storeProcessedSymbol({
                symbol: symbol.symbol,
                type: symbol.type,
                timestamp: Date.now()
            });

            // Remove the processed symbol from the environment store
            await this.environmentDB.deleteEnvironmentSymbol(symbol.id);

            // Dispatch event to notify of environment store change
            window.dispatchEvent(new CustomEvent('storeChanged', { 
                detail: { 
                    store: 'environment', 
                    action: 'process',
                    symbolType: symbol.type 
                }
            }));

            console.log('Processed symbol:', symbol);
        } catch (error) {
            console.error('Error processing symbol:', error);
            throw error;
        }
    }
}
