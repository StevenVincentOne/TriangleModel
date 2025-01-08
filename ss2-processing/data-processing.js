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
        console.log(`Processing letter: "${letter}" with loss factor: ${Math.round(this.lossFactors.inputLoss * 100)}% Result: ${isEntropy ? 'Entropy (E)' : 'Data (D)'}`);
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
            console.log('Loss factor updated to:', `${Math.round(this.lossFactors.inputLoss * 100)}%`);
        }
    }

    // Get/Set methods for new factors
    getBitsLossFactor() {
        return this.lossFactors.bitsLoss;
    }

    setBitsLossFactor(value) {
        if (value >= 0 && value <= 1) {
            this.lossFactors.bitsLoss = value;
            console.log('Bits loss factor updated to:', `${Math.round(this.lossFactors.bitsLoss * 100)}%`);
        }
    }

    getNoiseGainFactor() {
        return this.lossFactors.noiseGain;
    }

    setNoiseGainFactor(value) {
        if (value >= 0 && value <= 1) {
            this.lossFactors.noiseGain = value;
            console.log('Noise gain factor updated to:', `${Math.round(this.lossFactors.noiseGain * 100)}%`);
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
        
        // Add noise mapping
        this.noiseMap = {
            'A': 'α', 'B': 'β', 'C': 'γ', 'D': 'δ', 'E': 'ε',
            'F': 'ζ', 'G': 'η', 'H': 'θ', 'I': 'ι', 'J': 'κ',
            'K': 'λ', 'L': 'μ', 'M': 'ν', 'N': 'ξ', 'O': 'ο',
            'P': 'π', 'Q': 'ρ', 'R': 'σ', 'S': 'τ', 'T': 'υ',
            'U': 'φ', 'V': 'χ', 'W': 'ψ', 'X': 'ω', 'Y': 'ϑ',
            'Z': 'ϕ'
        };
        
        // Keep existing properties
        this.previousValues = {
            pd: null,
            pb: null,
            pn: null
        };
        
        this.batchTracking = {
            processedCount: 0,
            lastLogTime: Date.now(),
            BATCH_THRESHOLD: 300,
            MIN_LOG_INTERVAL: 5000
        };
        
        this.recycleInterval = null;
        this.isRecycling = false;
        this.setupRecyclingControls();
        
        this.isUptaking = false;
        
        this.setupControls();
        this.startProcessPoolMonitoring();
        this.initializeDashboardElements();
        
        // Listen for store changes
        window.addEventListener('storeChanged', async (event) => {
            if (event.detail.store === 'uptake') {
                await this.updateUptakeDisplay();
            } else if (event.detail.store === 'filteredNoise' || event.detail.store === 'all') {
                await this.updateFilteredNoiseDisplay();
            }
        });
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
            processNoise: document.getElementById('process-n'),
            filteredNoise: document.getElementById('convert-step-n')
        };
    }

    setupControls() {
        console.log('Setting up controls');
        
        const uptakeButton = document.getElementById('processDataButton');
        if (uptakeButton) {
            // Remove any existing listeners first
            uptakeButton.replaceWith(uptakeButton.cloneNode(true));
            const newUptakeButton = document.getElementById('processDataButton');
            
            newUptakeButton.addEventListener('click', () => {
                this.toggleUptake();
            });
            
            // Set initial state
            if (this.isUptaking) {
                newUptakeButton.classList.add('active');
            } else {
                newUptakeButton.classList.remove('active');
            }
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
            this.dashboardElements.processData.value = Math.round(this.processingPool.totalData);
        }
        if (this.dashboardElements.processBits) {
            this.dashboardElements.processBits.value = Math.round(this.processingPool.processBits);
        }
        if (this.dashboardElements.processNoise) {
            this.dashboardElements.processNoise.value = Math.round(this.processingPool.processNoise);
        }
    }

    async startProcessing() {
        console.log('Starting processing...');
        
        const flowRateInput = document.getElementById('flow-rate');
        const pbFlowRateInput = document.getElementById('pb-flow-rate');
        const symbolsPerSecond = parseInt(flowRateInput.value) || 10;
        const pbFlowPercent = parseInt(pbFlowRateInput.value) || 50;
        const intervalMs = 1000 / symbolsPerSecond;
        
        this.processInterval = setInterval(async () => {
            try {
                const environmentalData = await this.environmentDB.getEnvironmentalPool();
                
                if (!environmentalData || environmentalData.length === 0) {
                    console.log('No environmental data to process');
                    this.stopProcessing();
                    return;
                }

                const currentData = environmentalData[0];
                
                // Decide whether to process bit or noise based on flow rate percentages
                const processBit = Math.random() * 100 < pbFlowPercent;
                
                let symbol = null;
                let type = null;

                if (processBit) {
                    // Try to process a bit if available
                    if (currentData.bits && currentData.bits.length > 0) {
                        symbol = currentData.bits.shift();
                        type = 'bit';
                    }
                    // If no bits available but noise exists, process noise instead
                    else if (currentData.noise && currentData.noise.length > 0) {
                        symbol = currentData.noise.shift();
                        type = 'noise';
                    }
                } else {
                    // Try to process noise if available
                    if (currentData.noise && currentData.noise.length > 0) {
                        symbol = currentData.noise.shift();
                        type = 'noise';
                    }
                    // If no noise available but bits exist, process bits instead
                    else if (currentData.bits && currentData.bits.length > 0) {
                        symbol = currentData.bits.shift();
                        type = 'bit';
                    }
                }

                if (symbol) {
                    await this.processSymbol({
                        parentId: currentData.id,
                        symbol: symbol,
                        type: type,
                        remainingBits: currentData.bits,
                        remainingNoise: currentData.noise
                    });
                } else {
                    console.log('No more symbols to process');
                    this.stopProcessing();
                }

            } catch (error) {
                console.error('Error in processing interval:', error);
                this.stopProcessing();
            }
        }, intervalMs);
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

        // Force one final update with whole numbers
        if (this.dashboardElements.processData) {
            this.dashboardElements.processData.value = Math.round(this.dashboardElements.processData.value);
        }
        if (this.dashboardElements.processBits) {
            this.dashboardElements.processBits.value = Math.round(this.dashboardElements.processBits.value);
        }
        if (this.dashboardElements.processNoise) {
            this.dashboardElements.processNoise.value = Math.round(this.dashboardElements.processNoise.value);
        }

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
        // Update display immediately
        await this.updateUptakeDisplay();
        
        // Set up monitoring interval
        this.monitoringInterval = setInterval(async () => {
            await this.updateUptakeDisplay();
        }, 100);
    }

    async updateUptakeDisplay() {
        try {
            const uptakeData = await this.environmentDB.getUptakeSymbols();
            
            // Calculate totals
            let totalBits = 0;
            let totalNoise = 0;
            
            uptakeData.forEach(item => {
                if (item.type === 'bit') totalBits++;
                if (item.type === 'noise') totalNoise++;
            });
            
            const totalData = totalBits + totalNoise;

            // Update displays with whole numbers
            const udInput = document.getElementById('process-d');
            const ubInput = document.getElementById('process-b');
            const unInput = document.getElementById('process-n');

            if (udInput) udInput.value = Math.round(totalData);
            if (ubInput) ubInput.value = Math.round(totalBits);
            if (unInput) unInput.value = Math.round(totalNoise);

            // Increment symbol count and check for batch logging
            this.symbolCount++;
            if (this.symbolCount >= this.batchSize) {
                console.log('Uptake batch report:', {
                    batchSize: this.batchSize,
                    totalData,
                    bits: totalBits,
                    noise: totalNoise
                });
                this.symbolCount = 0; // Reset counter
            }
        } catch (error) {
            console.error('Error updating uptake display:', error);
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
        this.stopRecycling();
    }

    // Make sure this is called when component is destroyed
    destroy() {
        this.cleanup();
    }
        
    convertBitToNoise(symbol) {
        return this.noiseMap[symbol] || 'Ω'; // Default to Omega if no mapping exists
    }

    async processSymbol(symbolData) {
        try {
            console.log('Processing symbol data:', symbolData);
            
            // Get UB Loss rate (updated ID)
            const ubLossRate = parseInt(document.getElementById('uptake-loss-%').value) || 0;
            
            // Determine if bit should be converted to noise
            let finalType = symbolData.type;
            let finalSymbol = symbolData.symbol;
            
            if (symbolData.type === 'bit' && (Math.random() * 100) < ubLossRate) {
                finalType = 'noise';
                finalSymbol = this.convertBitToNoise(symbolData.symbol);
                console.log(`Bit ${symbolData.symbol} converted to noise ${finalSymbol} due to UB Loss`);
            }

            // Store the symbol in the uptake store
            await this.environmentDB.storeUptakeSymbol({
                symbol: finalSymbol,
                type: finalType,
                timestamp: Date.now()
            });

            // Update the environmental data with the remaining symbols
            await this.environmentDB.updateEnvironmentalPool(symbolData.parentId, {
                bits: symbolData.remainingBits,
                noise: symbolData.remainingNoise
            });

            window.dispatchEvent(new CustomEvent('storeChanged', { 
                detail: { 
                    store: 'uptake', 
                    action: 'process',
                    symbolType: finalType 
                }
            }));

            console.log('Successfully processed symbol:', finalSymbol);
        } catch (error) {
            console.error('Error processing symbol:', error);
            throw error;
        }
    }    
    
    

    async updateProcessingDisplay() {
        try {
            const uptakeData = await this.environmentDB.getUptakeSymbols();
            
            // Calculate totals
            let totalBits = 0;
            let totalNoise = 0;
            
            uptakeData.forEach(item => {
                if (item.type === 'bit') totalBits++;
                if (item.type === 'noise') totalNoise++;
            });
            
            const totalData = totalBits + totalNoise;

            // Update displays with whole numbers
            if (this.dashboardElements.processData) {
                this.dashboardElements.processData.value = Math.round(totalData);
            }
            if (this.dashboardElements.processBits) {
                this.dashboardElements.processBits.value = Math.round(totalBits);
            }
            if (this.dashboardElements.processNoise) {
                this.dashboardElements.processNoise.value = Math.round(totalNoise);
            }
        } catch (error) {
            console.error('Error updating processing display:', error);
        }
    }

    async zeroStores() {
        const zeroEnvironment = document.getElementById('zero-environment').checked;
        const zeroProcessing = document.getElementById('zero-processing').checked;
        const zeroConverted = document.getElementById('zero-converted').checked;
        const zeroConvBytes = document.getElementById('zero-conv-bytes').checked;

        try {
            if (zeroEnvironment) {
                await this.environmentDB.clearStore('environment');
                console.log('Environment store zeroed');
            }
            
            if (zeroProcessing) {
                await this.environmentDB.clearStore('uptake');
                console.log('Uptake store zeroed');
            }
            
            if (zeroConverted) {
                await this.environmentDB.clearStore('processingPool');
                console.log('Processing pool store zeroed');
            }

            // Separate check for convertedBytes store
            if (zeroConvBytes) {
                await this.environmentDB.clearStore('convertedBytes');
                console.log('Converted bytes store zeroed');
            }

            // Trigger display updates
            window.dispatchEvent(new CustomEvent('storeChanged', { 
                detail: { 
                    store: 'all',
                    action: 'zero'
                }
            }));

        } catch (error) {
            console.error('Error zeroing stores:', error);
        }
    }

    setupRecyclingControls() {
        const recycleButton = document.getElementById('recycleNoiseButton');
        if (recycleButton) {
            recycleButton.addEventListener('click', () => this.handleRecycleButtonClick());
        }
    }

    async handleRecycleButtonClick() {
        if (this.isRecycling) {
            this.stopRecycling();
            const recycleButton = document.getElementById('recycleNoiseButton');
            if (recycleButton) {
                recycleButton.classList.remove('active');
            }
        } else {
            this.startRecycling();
            const recycleButton = document.getElementById('recycleNoiseButton');
            if (recycleButton) {
                recycleButton.classList.add('active');
            }
        }
    }

    async startRecycling() {
        if (this.isRecycling) return;
        
        this.isRecycling = true;
        const recycleRateInput = document.getElementById('noise-recycle-rate');
        const symbolsPerSecond = parseInt(recycleRateInput?.value) || 10;
        const intervalMs = 1000 / symbolsPerSecond;

        this.recycleInterval = setInterval(async () => {
            try {
                // Get filtered noise symbols
                const filteredNoise = await this.environmentDB.getFilteredNoise();
                
                if (!filteredNoise || filteredNoise.length === 0) {
                    console.log('No filtered noise to recycle');
                    this.stopRecycling();
                    return;
                }

                // Get the first noise symbol
                const noiseSymbol = filteredNoise[0];

                // Get current environmental pool
                const envPool = await this.environmentDB.getEnvironmentalPool();
                let currentPool = envPool[0] || { bits: [], noise: [] };

                // Add noise symbol to environmental pool
                currentPool.noise.push(noiseSymbol.symbol);

                // Update environmental pool
                if (envPool[0]) {
                    await this.environmentDB.updateEnvironmentalPool(currentPool.id, currentPool);
                } else {
                    await this.environmentDB.storeEnvironmentalPool(currentPool);
                }

                // Remove symbol from filtered noise
                await this.environmentDB.deleteFilteredNoise(noiseSymbol.id);

                // Update filtered noise display immediately
                await this.updateFilteredNoiseDisplay();

                // Trigger store updates
                window.dispatchEvent(new CustomEvent('storeChanged', { 
                    detail: { 
                        store: 'all',
                        action: 'recycle'
                    }
                }));

            } catch (error) {
                console.error('Error recycling noise:', error);
                this.stopRecycling();
            }
        }, intervalMs);
    }

    stopRecycling() {
        if (this.recycleInterval) {
            clearInterval(this.recycleInterval);
            this.recycleInterval = null;
        }
        this.isRecycling = false;
        
        const recycleButton = document.getElementById('recycleNoiseButton');
        if (recycleButton) {
            recycleButton.classList.remove('active');
        }
    }

    // Add new method to update filtered noise display
    async updateFilteredNoiseDisplay() {
        try {
            const filteredNoise = await this.environmentDB.getFilteredNoise();
            const count = filteredNoise ? filteredNoise.length : 0;
            
            if (this.dashboardElements.filteredNoise) {
                this.dashboardElements.filteredNoise.value = count;
            }
        } catch (error) {
            console.error('Error updating filtered noise display:', error);
        }
    }

    toggleUptake() {
        const uptakeButton = document.getElementById('processDataButton');
        
        if (this.isUptaking) {
            this.stopProcessing();
            if (uptakeButton) {
                uptakeButton.classList.remove('active');
            }
        } else {
            this.startProcessing();
            if (uptakeButton) {
                uptakeButton.classList.add('active');
            }
        }
        
        this.isUptaking = !this.isUptaking;
    }
}
