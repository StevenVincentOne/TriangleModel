class LossFunction {
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

class NodeChannelEntropy {
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

class IntelligenceModule {
    constructor() {
        // Private variable to track intelligence state
        this._intelligenceEnabled = false;

        // Initialize other components
        this.lossFunction = new LossFunction();
        this.nodeChannelEntropy = new NodeChannelEntropy(this);

        // Initialize data structures
        this.letterPool = {
            groups: {},           // Stores counts of each letter
            totalUnprocessed: 0   // Total unprocessed letters
        };
        this.entropyState = {
            totalLetters: 0,      // Total Data (D)
            totalWords: 0,        // Total Bits (B)
            totalEntropy: 0       // Total Entropy (E)
        };

        // Add intelligence toggle listener
        const intelligenceToggle = document.getElementById('intelligenceToggle');
        if (intelligenceToggle) {
            intelligenceToggle.addEventListener('click', () => {
                this.toggleIntelligence(intelligenceToggle);
            });
        }

        // Initialize loss rate input
        const lossInputField = document.getElementById('loss-rate');
        if (lossInputField) {
            lossInputField.value = (this.lossFunction.getLossFactor() * 100).toFixed(4);
            lossInputField.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                    this.lossFunction.setLossFactor(value / 100);
                    console.log(`Loss factor updated to: ${value} %`);
                }
            });
        }

        // Initialize clean system state
        this.generateInitialDataset();
        this.updateDashboard();
    }

    // Getter for intelligenceEnabled
    get intelligenceEnabled() {
        return this._intelligenceEnabled;
    }

    // Setter for intelligenceEnabled
    set intelligenceEnabled(value) {
        this._intelligenceEnabled = value;
        console.log('Intelligence state set to:', value);
    }

    // Toggle Intelligence Mode
    toggleIntelligence(button) {
        this.intelligenceEnabled = !this.intelligenceEnabled;

        if (this.intelligenceEnabled) {
            button.classList.add('active');
            button.querySelector('.status-icon-off').style.display = 'none';
            button.querySelector('.status-icon-on').style.display = 'inline';
            console.log('Intelligence mode: enabled');
        } else {
            button.classList.remove('active');
            button.querySelector('.status-icon-on').style.display = 'none';
            button.querySelector('.status-icon-off').style.display = 'inline';
            console.log('Intelligence mode: disabled');
        }
    }

    // Process Incoming Letter
    processLetter(letter) {
        console.log(`Processing letter: "${letter}"`);

        // Process through loss function to determine if it's entropy
        const result = this.lossFunction.processDataLoss(letter);
        console.log(`Result of loss function: ${result.entropy ? 'Entropy (E)' : 'Data (D)'}`);

        if (result.entropy) {
            // Handle entropy case
            this.entropyState.totalEntropy++;
            console.log(`Entropy incremented to: ${this.entropyState.totalEntropy}`);

            // Dispatch entropy update
            const mapping = this.nodeChannelEntropy.bitToEntropyMapping[letter];
            if (mapping && this.intelligenceEnabled) {
                this.dispatchIntelligenceUpdate(mapping.channel, +1, 'entropy');
            }

        } else {
            // Not entropy - add to Data pool
            this.addToDataPool(letter);
        }

        this.updateDashboard();
    }

    // Add Letter to Data Pool
    addToDataPool(letter) {
        // Initialize group if it doesn't exist
        if (!this.letterPool.groups[letter]) {
            this.letterPool.groups[letter] = 0;
        }

        // Add letter to its group
        this.letterPool.groups[letter]++;
        this.letterPool.totalUnprocessed++;
        this.entropyState.totalLetters++;
        console.log(`Added to Data pool: { letter: "${letter}", count: ${this.letterPool.groups[letter]}, totalLetters: ${this.entropyState.totalLetters}, totalUnprocessed: ${this.letterPool.totalUnprocessed} }`);

        // Check if we have enough matching letters to form a Bit
        if (this.letterPool.groups[letter] >= 9) {
            // Form a Bit
            this.entropyState.totalWords++;
            this.letterPool.groups[letter] -= 9;
            this.letterPool.totalUnprocessed -= 9;
            console.log(`Bit formed from letter "${letter}": { remainingInGroup: ${this.letterPool.groups[letter]}, totalBits: ${this.entropyState.totalWords} }`);

            // Dispatch Bit update
            const mapping = this.nodeChannelEntropy.bitToEntropyMapping[letter];
            if (mapping && this.intelligenceEnabled) {
                this.dispatchIntelligenceUpdate(mapping.channel, -1, 'bit');
            }
        }
    }

    // Dispatch Intelligence Update Event
    dispatchIntelligenceUpdate(channel, delta, type) {
        if (this.intelligenceEnabled) {
            console.log(`Dispatching intelligence update: { channel: "${channel}", delta: ${delta}, type: "${type}" }`);
            const event = new CustomEvent('intelligence-update', {
                bubbles: true,
                detail: { channel, delta, type }
            });
            document.dispatchEvent(event);
        } else {
            console.log('Intelligence update blocked - intelligence disabled');
        }
    }

    // Update Dashboard UI
    updateDashboard() {
        const systemD = document.getElementById('system-d');
        const systemB = document.getElementById('system-b');
        const systemE = document.getElementById('system-e');
        const systemBERatio = document.getElementById('system-be-ratio');

        if (systemD) systemD.value = this.entropyState.totalLetters;
        if (systemB) systemB.value = this.entropyState.totalWords;
        if (systemE) systemE.value = this.entropyState.totalEntropy;
        
        if (systemBERatio) {
            if (this.entropyState.totalEntropy === 0) {
                systemBERatio.value = 'N/A';
            } else {
                const ratio = this.entropyState.totalWords / this.entropyState.totalEntropy;
                systemBERatio.value = ratio.toFixed(2);
            }
        }
    }

    // Initialize or Reset System State
    generateInitialDataset() {
        console.log('Initializing clean system state...');
        // Reset all counts
        this.letterPool = { groups: {}, totalUnprocessed: 0 };
        this.entropyState = { totalLetters: 0, totalWords: 0, totalEntropy: 0 };
        console.log('System initialized with clean state:', this.entropyState);
    }
} 