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
        this.environmentDB = environmentDB;
        console.log('Using shared database instance in DataProcessing');
        this.flowRate = 10;
        this.pbPercent = 50;
        this.isProcessing = false;
        
        // Wait for database to be ready
        this.ready = this.init();
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
        
        processButton?.addEventListener('click', (e) => {
            console.log('Process button clicked');
            if (this.isProcessing) {
                console.log('Stopping processing');
                this.stopProcessing();
                e.target.classList.remove('active');
            } else {
                console.log('Starting processing');
                this.startProcessing();
                e.target.classList.add('active');
            }
        });

        // Flow rate control
        document.getElementById('flow-rate')?.addEventListener('input', (e) => {
            this.flowRate = parseInt(e.target.value) || 0;
        });

        // PB percentage control
        document.getElementById('pb-flow-rate')?.addEventListener('input', (e) => {
            this.pbPercent = parseInt(e.target.value) || 0;
            const pnInput = document.getElementById('pn-flow-rate');
            if (pnInput) {
                pnInput.value = 100 - this.pbPercent;
            }
        });

        // Data Flow button
        document.getElementById('letterFlowToggle')?.addEventListener('click', (e) => {
            if (this.isProcessing) {
                this.stopDataFlow();
                e.target.classList.remove('active');
            } else {
                this.startDataFlow();
                e.target.classList.add('active');
            }
        });
    }

    async startDataFlow() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        this.flowInterval = setInterval(async () => {
            const envData = await this.environmentModule.environmentDB.getEnvironmentalPool();
            if (!envData || (!envData.bits.length && !envData.noise.length)) {
                console.log('No environmental data available');
                return;
            }

            // Calculate symbols to process based on flow rate
            const symbolsToProcess = Math.min(this.flowRate, envData.bits.length + envData.noise.length);
            
            for (let i = 0; i < symbolsToProcess; i++) {
                // Determine whether to process as bit or noise based on PB percentage
                const processingAsBit = Math.random() * 100 < this.pbPercent;
                let symbol;

                if (processingAsBit && envData.bits.length > 0) {
                    symbol = envData.bits.shift();
                    this.processingPool.processBits++;
                } else if (!processingAsBit && envData.noise.length > 0) {
                    symbol = envData.noise.shift();
                    this.processingPool.processNoise++;
                } else {
                    continue; // Skip if desired type is empty
                }

                this.processingPool.totalData++;

                // Store in processing pool database
                await this.processingPoolDB.storeSymbol({
                    symbol,
                    timestamp: Date.now(),
                    type: processingAsBit ? 'bit' : 'noise'
                });
            }

            // Update environmental database
            await this.environmentModule.environmentDB.storeEnvironmentalPool(envData);
            
            // Update displays
            this.updateDashboard();
        }, 1000); // Run every second
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
        if (this.isProcessing) {
            console.log('Already processing, returning');
            return;
        }
        
        this.isProcessing = true;
        console.log('Setting up process interval');
        
        this.processInterval = setInterval(async () => {
            try {
                console.log('Process interval tick');
                const envData = await this.environmentDB.getEnvironmentalPool();
                console.log('Retrieved environmental data:', {
                    bitsLength: envData?.bits?.length || 0,
                    noiseLength: envData?.noise?.length || 0,
                    sampleBits: envData?.bits?.slice(0, 5),
                    sampleNoise: envData?.noise?.slice(0, 5)
                });

                if (!envData || (!envData.bits?.length && !envData.noise?.length)) {
                    console.log('No environmental data available');
                    return;
                }

                // Process symbols based on flow rate
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

                    // Store the processed symbol
                    await this.environmentDB.storeProcessedSymbol({
                        symbol,
                        type: processingAsBit ? 'bit' : 'noise'
                    });
                }

                // Update environmental pool
                await this.environmentDB.storeEnvironmentalPool(envData);
                
                // Update displays
                this.updateDashboard();

                console.log('Processing Pool State:', {
                    total: this.processingPool.totalData,
                    bits: this.processingPool.processBits,
                    noise: this.processingPool.processNoise,
                    remainingEnv: {
                        bits: envData.bits.length,
                        noise: envData.noise.length
                    }
                });
            } catch (error) {
                console.error('Error in processing:', error);
            }
        }, 1000);
    }

    stopProcessing() {
        this.isProcessing = false;
        clearInterval(this.processInterval);
    }
}
