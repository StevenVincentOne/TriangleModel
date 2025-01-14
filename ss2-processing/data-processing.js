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
            'C': 'ς',  // sigma variant (was incorrectly 'χ')
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
            'Q': 'ϱ',  // rho variant (was incorrectly 'ψ')
            'R': 'ρ',  // rho
            'S': 'σ',  // sigma
            'T': 'τ',  // tau
            'U': 'υ',  // upsilon
            'V': 'ϑ',  // theta variant
            'W': 'ω',  // omega
            'X': 'χ',  // chi
            'Y': 'ψ',  // psi
            'Z': 'ζ',  // zeta
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
            'A': { bit: 'A', entropy: 'α', channel: 'NC1' },
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
            'Q': { bit: 'Q', entropy: 'ϱ', channel: 'NC2' },
            'T': { bit: 'T', entropy: 'τ', channel: 'NC2' },
            'W': { bit: 'W', entropy: 'ω', channel: 'NC2' },
            'Z': { bit: 'Z', entropy: 'ζ', channel: 'NC2' },

            // NC3 Channel Letters (9 letters)
            'C': { bit: 'C', entropy: 'ς', channel: 'NC3' },
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
        
        // Keep noise mapping as it's used elsewhere
        this.noiseMap = {
            'A': 'α', 'B': 'β', 'C': 'ς', 'D': 'δ', 'E': 'ε',
            'F': 'φ', 'G': 'γ', 'H': 'η', 'I': 'ι', 'J': 'ξ',
            'K': 'κ', 'L': 'λ', 'M': 'μ', 'N': 'ν', 'O': 'ο',
            'P': 'π', 'Q': 'ϱ', 'R': 'ρ', 'S': 'σ', 'T': 'τ',
            'U': 'υ', 'V': 'ϑ', 'W': 'ω', 'X': 'χ', 'Y': 'ψ',
            'Z': 'ζ', '∅': 'θ'
        };
    }

    // Keep only the essential initialization method
    async initializeProcessingPool() {
        let symbols = await this.environmentDB.getProcessingPoolSymbols();
        if (!symbols || symbols.length === 0) {
            // Initialize if empty
            await this.environmentDB.storeProcessingPoolSymbol({
                symbol: 'A',
                type: 'bit',
                count: 0,
                timestamp: Date.now()
            });
        }
    }

    // Keep utility methods that don't affect processing
    convertBitToNoise(symbol) {
        return this.noiseMap[symbol] || 'Ω';
    }
}
