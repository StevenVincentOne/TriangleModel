import { LossFunction, NodeChannelEntropy } from '../ss2-processing/data-processing.js';

export class IntelligenceModule {
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
            totalLetters: 0,
            netLetters: 0,
            convertedData: 0,
            totalWords: 0,
            totalEntropy: 0
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
    dispatchIntelligenceUpdate(channel, delta, type = 'bit') {
        console.log('Dispatching intelligence update:', {
            channel,
            delta,
            type,
            eventCreated: true
        });

        const event = new CustomEvent('intelligence-update', {
            detail: {
                channel,
                delta,
                type
            },
            bubbles: true
        });

        document.dispatchEvent(event);
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

    // Keep this method for processing EN from EnvironmentModule
    processEN(noise) {
        if (noise) {
            this.entropyState.totalEntropy++;
            this.updateDashboard();
        }
    }

    // New method to fetch processing pool symbols
    async getProcessingPoolSymbols() {
        try {
            console.log('Fetching symbols from Processing Pool store...');
            const processedSymbols = await this.environmentDB.getProcessedSymbols();
            console.log('Retrieved Processing Pool symbols:', processedSymbols);
            return processedSymbols;
        } catch (error) {
            console.error('Error fetching Processing Pool symbols:', error);
            return null;
        }
    }

    // New method for Stage 2 of Process step
    async processPoolSymbols() {
        const poolSymbols = await this.getProcessingPoolSymbols();
        if (!poolSymbols) return;

        console.log('Starting Stage 2 processing of Pool symbols:', poolSymbols);

        // Process each symbol through the existing letter processing logic
        for (const symbol of poolSymbols) {
            this.processLetter(symbol); // Uses existing symbol processing logic
        }

        console.log('Stage 2 processing complete:', {
            totalLetters: this.entropyState.totalLetters,
            netLetters: this.entropyState.netLetters,
            totalWords: this.entropyState.totalWords,
            totalEntropy: this.entropyState.totalEntropy,
            convertedData: this.entropyState.convertedData
        });
    }
} 