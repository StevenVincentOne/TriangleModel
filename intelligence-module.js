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
        // Add data reduction rate to state
        this.dataReductionRate = 9; // Default 9:1 ratio

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
            netLetters: 0,        // Net Data
            totalWords: 0,        // Total Bits (B)
            totalEntropy: 0,      // Total Entropy (E)
            convertedData: 0      // Data converted to B or E
        };

        // Add intelligence toggle listener
        const intelligenceToggle = document.getElementById('intelligenceToggle');
        if (intelligenceToggle) {
            intelligenceToggle.addEventListener('click', () => {
                this.toggleIntelligence(intelligenceToggle);
            });
        }

        // Initialize all system intelligence inputs
        this.initializeSystemInputs();

        // Initialize clean system state
        this.generateInitialDataset();
        this.updateDashboard();

        // Initialize Zero Data button
        const zeroDataButton = document.getElementById('zeroDataButton');
        if (zeroDataButton) {
            zeroDataButton.addEventListener('click', () => this.resetAllData());
        }
    }

    initializeSystemInputs() {
        // Data Reduction input
        this.setupInput('data-reduction', (value) => {
            if (!isNaN(value) && value >= 0) {
                this.dataReductionRate = value;
                console.log(`Data reduction rate updated to: ${value}`);
            }
        });

        // Loss Rate input
        this.setupInput('loss-rate', (value) => {
            if (!isNaN(value) && value >= 0 && value <= 100) {
                this.lossFunction.setLossFactor(value / 100);
                console.log(`Loss factor updated to: ${value}%`);
            }
        });

        // Flow Rate input (if it exists)
        this.setupInput('flow-rate', (value) => {
            if (!isNaN(value) && value >= 1 && value <= 100) {
                // Handle flow rate update
                console.log(`Flow rate updated to: ${value}`);
            }
        });
    }

    setupInput(inputId, callback) {
        const input = document.getElementById(inputId);
        if (input) {
            // Set initial value if applicable
            if (inputId === 'data-reduction') {
                input.value = this.dataReductionRate;
            } else if (inputId === 'loss-rate') {
                input.value = (this.lossFunction.getLossFactor() * 100).toFixed(4);
            }

            // Handle both input and keypress events
            input.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                callback(value);
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent default to avoid form submission
                    const value = parseFloat(e.target.value);
                    callback(value);
                    input.blur(); // Remove focus from input
                }
            });
        }
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

        // Increment total and net data immediately upon entry
        this.entropyState.totalLetters++;
        this.entropyState.netLetters++;

        // Process through loss function to determine if it's entropy
        const result = this.lossFunction.processDataLoss(letter);
        console.log(`Result of loss function: ${result.entropy ? 'Entropy (E)' : 'Data (D)'}`);

        if (result.entropy) {
            // Handle entropy case
            this.entropyState.totalEntropy++;
            this.entropyState.netLetters--; // Decrement net data
            this.entropyState.convertedData++; // Increment converted data
            console.log(`Entropy incremented to: ${this.entropyState.totalEntropy}, Net Data decremented to: ${this.entropyState.netLetters}`);

            const mapping = this.nodeChannelEntropy.bitToEntropyMapping[letter];
            if (mapping && this.intelligenceEnabled) {
                this.dispatchIntelligenceUpdate(mapping.channel, +1, 'entropy');
            }
        } else {
            this.addToDataPool(letter);
        }

        this.updateDashboard();
    }    
    
    // Update addToDataPool method
    addToDataPool(letter) {
        if (!this.letterPool.groups[letter]) {
            this.letterPool.groups[letter] = 0;
        }

        this.letterPool.groups[letter]++;
        this.letterPool.totalUnprocessed++;
        
        // Add debug logging for data reduction rate
        console.log(`Current data reduction rate: ${this.dataReductionRate}`);
        console.log(`Added to Data pool: { letter: "${letter}", count: ${this.letterPool.groups[letter]}, totalLetters: ${this.entropyState.totalLetters}, netLetters: ${this.entropyState.netLetters}, totalUnprocessed: ${this.letterPool.totalUnprocessed} }`);

        // Skip bit formation completely if dataReductionRate is 0
        if (this.dataReductionRate <= 0) {
            return; // Exit early if reduction rate is 0
        }

        // Only proceed with bit formation if reduction rate is greater than 0
        if (this.letterPool.groups[letter] >= this.dataReductionRate) {
            this.entropyState.totalWords++;
            this.letterPool.groups[letter] -= this.dataReductionRate;
            this.letterPool.totalUnprocessed -= this.dataReductionRate;
            this.entropyState.netLetters -= this.dataReductionRate;
            this.entropyState.convertedData += this.dataReductionRate; // Increment converted data

            console.log(`Bit formed from letter "${letter}": { remainingInGroup: ${this.letterPool.groups[letter]}, totalBits: ${this.entropyState.totalWords}, netLetters: ${this.entropyState.netLetters} }`);

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
        const systemNetD = document.getElementById('system-net-d');
        const systemConverted = document.getElementById('system-converted');
        const systemB = document.getElementById('system-b');
        const systemE = document.getElementById('system-e');
        const systemBERatio = document.getElementById('system-be-ratio');

        if (systemD) systemD.value = this.entropyState.totalLetters;
        if (systemNetD) systemNetD.value = this.entropyState.netLetters;
        if (systemConverted) systemConverted.value = this.entropyState.convertedData;
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
        this.entropyState = { totalLetters: 0, netLetters: 0, totalWords: 0, totalEntropy: 0, convertedData: 0 };
        console.log('System initialized with clean state:', this.entropyState);
    }

    resetAllData() {
        console.log('Resetting all data to zero...');
        
        // Reset all counters
        this.letterPool = { groups: {}, totalUnprocessed: 0 };
        this.entropyState = {
            totalLetters: 0,
            netLetters: 0,
            totalWords: 0,
            totalEntropy: 0,
            convertedData: 0
        };

        // Update the dashboard
        this.updateDashboard();

        console.log('Data reset complete:', this.entropyState);
    }
} 