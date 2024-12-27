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
        this.environmentModule = environmentModule;
        this.lossFunction = new LossFunction();
        this.nodeChannelEntropy = new NodeChannelEntropy();
        this.isProcessing = false;
        
        // Add processing data pool
        this.processingPool = {
            totalData: 0,      // PD (Process Data)
            processBits: 0,    // PB (Process Bits)
            processNoise: 0,   // PN (Process Noise)
            unprocessed: 0     // Data waiting to be processed
        };

        // Initialize dashboard elements
        this.initializeDashboardElements();
    }

    initializeDashboardElements() {
        this.dashboardElements = {
            processData: document.getElementById('process-d'),
            processBits: document.getElementById('process-b'),
            processNoise: document.getElementById('process-n')
        };
        
        console.log('Data Processing Dashboard Elements:', this.dashboardElements); // Debug log
    }

    startDataFlow() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        // Get environmental data
        const envData = {
            bits: this.environmentModule.environmentalData.environmentalBits,
            noise: this.environmentModule.environmentalData.environmentalNoise
        };

        console.log('Processing environmental data:', envData);

        // Process incoming environmental data
        this.processEnvironmentalData(envData);
    }

    processData(data) {
        // Decrement from environmental pool
        this.environmentModule.environmentalData.environmentalBits--;
        
        // Increment processing pool
        this.processingPool.unprocessed++;
        this.processingPool.totalData++;
        
        // Process through loss function
        const processedData = this.lossFunction.processData(data);
        
        // Update processing pool based on loss function results
        if (processedData) {
            this.processingPool.processBits += processedData.processedBits;
            this.processingPool.processNoise += processedData.processedNoise;
            this.processingPool.unprocessed--;
        }
        
        // Update dashboard
        this.updateDashboard();
        
        // If intelligence module exists, add to data pool
        if (this.environmentModule.intelligenceModule) {
            this.environmentModule.intelligenceModule.addToDataPool(data.letter);
        }

        console.log('Processing pool state:', this.processingPool);
        return processedData;
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

    processEnvironmentalData(envData) {
        // Apply loss function to incoming data
        const processedData = this.lossFunction.processData(envData);
        
        // Process through node channels
        this.nodeChannelEntropy.processData(processedData);

        console.log('Processed data:', processedData);
        
        return processedData;
    }

    stopDataFlow() {
        this.isProcessing = false;
    }
}
