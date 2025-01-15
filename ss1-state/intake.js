export class Intake {
    constructor(environmentDB, stateCapacity) {
        this.environmentDB = environmentDB;
        this.stateCapacity = stateCapacity;
        this.isIntaking = false;
        this.intakeInterval = null;

        // Simplified state controls with a single data rate
        this.stateData = {
            dataRate: 10  // symbols per second for both bytes and entropy
        };

        this.stateRates = {
            sd: 10,  // symbols per second
            sb: 50,  // byte percentage (default 50%)
            se: 50   // entropy percentage (default 50%)
        };

        this.initializeControls();
    }

    initializeControls() {
        this.initializeDistributionControls();
        this.initializeStateControls();
        this.setupIntakeButton();
    }

    initializeDistributionControls() {
        // SB percentage control
        const sbPercentInput = document.getElementById('sb-percent');
        if (sbPercentInput) {
            sbPercentInput.value = this.stateRates.sb;
            sbPercentInput.addEventListener('input', (e) => {
                const newPercent = parseInt(e.target.value);
                if (!isNaN(newPercent) && newPercent >= 0 && newPercent <= 100) {
                    this.stateRates.sb = newPercent;
                    this.stateRates.se = 100 - newPercent;
                    
                    // Update SE input
                    const seInput = document.getElementById('se-percent');
                    if (seInput) {
                        seInput.value = this.stateRates.se;
                    }
                    
                    console.log('Updated distribution percentages:', {
                        sb: this.stateRates.sb,
                        se: this.stateRates.se,
                        dataRate: this.stateData.dataRate
                    });
                }
            });
        }

        // SE percentage control
        const sePercentInput = document.getElementById('se-percent');
        if (sePercentInput) {
            sePercentInput.value = this.stateRates.se;
            sePercentInput.addEventListener('input', (e) => {
                const newPercent = parseInt(e.target.value);
                if (!isNaN(newPercent) && newPercent >= 0 && newPercent <= 100) {
                    this.stateRates.se = newPercent;
                    this.stateRates.sb = 100 - newPercent;
                    
                    // Update SB input
                    const sbInput = document.getElementById('sb-percent');
                    if (sbInput) {
                        sbInput.value = this.stateRates.sb;
                    }
                    
                    console.log('Updated distribution percentages:', {
                        sb: this.stateRates.sb,
                        se: this.stateRates.se,
                        dataRate: this.stateData.dataRate
                    });
                }
            });
        }
    }

    initializeStateControls() {
        const sdRateInput = document.getElementById('sd-rate');
        if (sdRateInput) {
            sdRateInput.value = this.stateRates.sd;
            sdRateInput.addEventListener('input', (e) => {
                const newRate = parseInt(e.target.value);
                if (!isNaN(newRate) && newRate >= 0) {
                    this.stateRates.sd = newRate;
                    this.stateData.dataRate = newRate;
                    
                    console.log('Updated data rate:', {
                        sd: this.stateRates.sd,
                        dataRate: this.stateData.dataRate
                    });
                }
            });
        }
    }

    updateDistributionRates() {
        this.stateData.byteRate = Math.floor((this.stateRates.sb / 100) * this.stateData.totalRate);
        this.stateData.entropyRate = Math.floor((this.stateRates.se / 100) * this.stateData.totalRate);
        this.updateStateDisplays();
    }

    setupIntakeButton() {
        const intakeButton = document.getElementById('intakeStateButton');
        if (intakeButton) {
            // Remove any existing listeners first
            const newButton = intakeButton.cloneNode(true);
            intakeButton.parentNode.replaceChild(newButton, intakeButton);
            
            // Add new click listener with debounce
            let isProcessing = false;
            newButton.addEventListener('click', async () => {
                if (isProcessing) return; // Prevent multiple rapid clicks
                
                try {
                    isProcessing = true;
                    await this.toggleIntake();
                } catch (error) {
                    console.error('Error in intake button click:', error);
                    // Reset button state on error
                    this.isIntaking = false;
                    newButton.classList.remove('active');
                } finally {
                    isProcessing = false;
                }
            });
        }
    }

    async toggleIntake() {
        const button = document.getElementById('intakeStateButton');
        if (!button) return;

        this.isIntaking = !this.isIntaking;
        
        try {
            if (this.isIntaking) {
                button.classList.add('active');
                await this.startIntake();
            } else {
                button.classList.remove('active');
                this.stopIntake();
            }
        } catch (error) {
            console.error('Error toggling intake:', error);
            // Reset state on error
            this.isIntaking = false;
            button.classList.remove('active');
            this.stopIntake();
            throw error;
        }
    }

    async startIntake() {
        if (this.intakeInterval) return;

        console.log('Starting state intake process:', {
            sd: this.stateRates.sd,
            bytePercent: this.stateRates.sb,
            entropyPercent: this.stateRates.se
        });

        this.intakeInterval = setInterval(async () => {
            try {
                const currentCapacity = await this.stateCapacity.getCurrentUsage();
                const maxCapacity = this.stateCapacity.maxCapacity;
                
                if (currentCapacity >= maxCapacity) {
                    console.log('State system at capacity, pausing intake');
                    return;
                }

                const convertedData = await this.environmentDB.getConvertedBytes();
                
                if (!convertedData.length) {
                    console.log('No converted data available');
                    return;
                }

                // Calculate total symbols to process this cycle
                const totalSymbols = Math.max(1, Math.floor(this.stateRates.sd));
                
                // Calculate target amounts based on percentages
                const targetBytes = Math.round((this.stateRates.sb / 100) * totalSymbols);
                const targetEntropy = Math.round((this.stateRates.se / 100) * totalSymbols);

                console.log('Processing distribution:', {
                    totalSymbols,
                    targetBytes,
                    targetEntropy,
                    bytePercent: this.stateRates.sb,
                    entropyPercent: this.stateRates.se
                });

                // Process bytes first if any
                if (targetBytes > 0) {
                    await this.processSymbols('byte', targetBytes, convertedData);
                }

                // Then process entropy if any
                if (targetEntropy > 0) {
                    await this.processSymbols('entropy', targetEntropy, convertedData);
                }

                await this.updateStateDisplays();
                await this.updateConvertedDisplays();

            } catch (error) {
                console.error('Error in intake cycle:', error);
            }
        }, 1000);
    }

    async processSymbols(type, amount, convertedData) {
        // Get available symbols of the requested type
        const availableSymbols = convertedData.filter(d => d.type === type);
        
        // Process up to the requested amount or what's available
        const symbolsToProcess = availableSymbols.slice(0, amount);

        console.log(`Processing ${type}:`, {
            requested: amount,
            available: availableSymbols.length,
            processing: symbolsToProcess.length
        });

        for (const symbol of symbolsToProcess) {
            const subsystem = this.mapSymbolToSubsystem(symbol.symbol);
            
            // Only process if we have a valid subsystem mapping
            if (subsystem) {
                await this.environmentDB.storeStateIntakeSymbol({
                    symbol: symbol.symbol,
                    type: type,
                    subsystem: subsystem
                });
                await this.environmentDB.deleteConvertedByte(symbol.id);
            } else {
                console.error(`Skipping unknown symbol: ${symbol.symbol}`);
            }
        }
    }

    mapSymbolToSubsystem(symbol) {
        // Map symbols to subsystems based on predefined NC assignments
        const ncMapping = {
            // English letters to NC1 (ss1)
            'A': 'ss1', 'D': 'ss1', 'G': 'ss1', 'J': 'ss1', 'M': 'ss1', 
            'P': 'ss1', 'S': 'ss1', 'V': 'ss1', 'Y': 'ss1',
            // English letters to NC2 (ss2)
            'B': 'ss2', 'E': 'ss2', 'H': 'ss2', 'K': 'ss2', 'N': 'ss2', 
            'Q': 'ss2', 'T': 'ss2', 'W': 'ss2', 'Z': 'ss2',
            // English letters to NC3 (ss3)
            'C': 'ss3', 'F': 'ss3', 'I': 'ss3', 'L': 'ss3', 'O': 'ss3', 
            'R': 'ss3', 'U': 'ss3', 'X': 'ss3', '∅': 'ss3',
            // Greek letters to NC1 (ss1)
            'α': 'ss1', 'δ': 'ss1', 'γ': 'ss1', 'ξ': 'ss1', 'μ': 'ss1', 
            'π': 'ss1', 'σ': 'ss1', 'ϑ': 'ss1', 'ψ': 'ss1',
            // Greek letters to NC2 (ss2)
            'β': 'ss2', 'ε': 'ss2', 'η': 'ss2', 'κ': 'ss2', 'ν': 'ss2', 
            'ϱ': 'ss2', 'τ': 'ss2', 'ω': 'ss2', 'ζ': 'ss2',
            // Greek letters to NC3 (ss3)
            'ς': 'ss3', 'φ': 'ss3', 'ι': 'ss3', 'λ': 'ss3', 'ο': 'ss3', 
            'ρ': 'ss3', 'υ': 'ss3', 'χ': 'ss3', 'θ': 'ss3'
        };

        const subsystem = ncMapping[symbol];
        if (!subsystem) {
            console.error(`No subsystem mapping found for symbol: ${symbol}`);
            return null;
        }
        return subsystem;
    }

    stopIntake() {
        if (this.intakeInterval) {
            clearInterval(this.intakeInterval);
            this.intakeInterval = null;
        }
        console.log('State intake stopped');
    }

    async updateStateDisplays() {
        try {
            await this.environmentDB.ready;
            const stateIntakeSymbols = await this.environmentDB.getStateIntakeSymbols();
            
            const totalSymbols = stateIntakeSymbols.length;
            const byteSymbols = stateIntakeSymbols.filter(s => s.type === 'byte').length;
            const entropySymbols = stateIntakeSymbols.filter(s => s.type === 'entropy').length;

            const displays = {
                'system-d': totalSymbols,
                'system-b': byteSymbols,
                'system-e': entropySymbols
            };

            Object.entries(displays).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                }
            });

        } catch (error) {
            console.error('Error updating state displays:', error);
        }
    }

    async updateConvertedDisplays() {
        try {
            const convertedData = await this.environmentDB.getConvertedBytes();
            
            const byteCount = convertedData
                .filter(item => item.type === 'byte')
                .reduce((sum, item) => sum + (item.count || 1), 0);
            
            const entropyCount = convertedData
                .filter(item => item.type === 'entropy')
                .reduce((sum, item) => sum + (item.count || 1), 0);

            // Update converted bytes/entropy displays
            const displays = {
                'convertedBytes': byteCount,
                'convertedEntropy': entropyCount
            };

            Object.entries(displays).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                }
            });

        } catch (error) {
            console.error('Error updating converted displays:', error);
        }
    }
}