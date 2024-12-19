export class LossFunction {
    constructor() {
        this.lossFactors = {
            inputLoss: 0.0  // Set to 0 for testing
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