export class PoolSystem {
    constructor(environmentModule) {
        this.environmentModule = environmentModule;
        this.environmentDB = environmentModule.environmentDB;
        
        // Initialize state
        this.isProcessing = false;
        this.processInterval = null;
        this.displayUpdateInterval = null;
        this.flowRate = 10; // Symbols per second
        
        // Initialize dashboard elements
        this.dashboardElements = {
            poolData: document.getElementById('pool-d'),
            poolBits: document.getElementById('pool-b'),
            poolNoise: document.getElementById('pool-n'),
            flowRate: document.getElementById('pool-flow-rate'),
            bitsFlowRate: document.getElementById('pool-b-%'),
            noiseFlowRate: document.getElementById('pool-n-%'),
            pbLossRate: document.getElementById('pb-loss-%'),
            poolButton: document.getElementById('poolButton')
        };

        // Validate all elements exist
        Object.entries(this.dashboardElements).forEach(([key, element]) => {
            if (!element) {
                console.error(`Missing dashboard element: ${key}`);
            }
        });

        // Initialize flow rates
        this.flowRates = {
            bits: parseInt(this.dashboardElements.bitsFlowRate?.value) || 50,
            noise: parseInt(this.dashboardElements.noiseFlowRate?.value) || 50
        };

        console.log(`Initial flow rates: bits = ${this.flowRates.bits}%, noise = ${this.flowRates.noise}%`);

        this.setupControls();
        this.startDisplayUpdates();
        this.updateDisplay(); // Ensure immediate first update
    }

    setupControls() {
        const poolButton = this.dashboardElements.poolButton;
        console.log('Setting up Pool button:', poolButton);

        if (poolButton) {
            poolButton.addEventListener('click', (e) => {
                console.log('Pool button clicked!', e);
                try {
                    if (this.isProcessing) {
                        console.log('Was processing, stopping now...');
                        this.stopProcessing();
                        poolButton.classList.remove('active');
                    } else {
                        console.log('Was stopped, starting now...');
                        this.startProcessing();
                        poolButton.classList.add('active');
                    }
                    console.log('Processing state:', this.isProcessing);
                } catch (error) {
                    console.error('Error in pool button handler:', error);
                    this.stopProcessing();
                    poolButton.classList.remove('active');
                }
            });
            console.log('Click handler attached to Pool button');
        } else {
            console.error('Pool button not found! Available elements:', this.dashboardElements);
        }

        // Set up flow rate control (symbols per second)
        if (this.dashboardElements.flowRate) {
            this.dashboardElements.flowRate.addEventListener('input', (e) => {
                try {
                    const newRate = parseInt(e.target.value) || 10;
                    this.updateFlowRate(newRate);
                } catch (error) {
                    console.error('Error updating flow rate:', error);
                }
            });
        }

        // Set up bits flow rate (PB %)
        if (this.dashboardElements.bitsFlowRate) {
            this.dashboardElements.bitsFlowRate.addEventListener('input', (e) => {
                try {
                    const bitsRate = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    const noiseRate = 100 - bitsRate;
                    
                    this.flowRates.bits = bitsRate;
                    this.flowRates.noise = noiseRate;
                    
                    // Update noise flow rate display and ensure it's read-only
                    if (this.dashboardElements.noiseFlowRate) {
                        this.dashboardElements.noiseFlowRate.value = noiseRate;
                    }
                    
                    console.log('Updated pool flow rates:', this.flowRates);
                } catch (error) {
                    console.error('Error updating bits flow rate:', error);
                }
            });
        }
    }

    startDisplayUpdates() {
        this.updateDisplay();
        this.displayUpdateInterval = setInterval(() => {
            this.updateDisplay();
        }, 100); // Update every 100ms
    }

    async updateDisplay() {
        try {
            const poolData = await this.environmentDB.getProcessingPoolSymbols() || [];
            
            // Initialize counters
            const counts = poolData.reduce((acc, item) => {
                if (item.type === 'bit') acc.bits += (item.count || 1);
                if (item.type === 'noise') acc.noise += (item.count || 1);
                return acc;
            }, { bits: 0, noise: 0 });
            
            const totalData = counts.bits + counts.noise;

            // Update displays with null checks
            this.updateElementValue(this.dashboardElements.poolData, totalData);
            this.updateElementValue(this.dashboardElements.poolBits, counts.bits);
            this.updateElementValue(this.dashboardElements.poolNoise, counts.noise);
            
        } catch (error) {
            console.error('Error updating pool display:', error);
        }
    }

    updateElementValue(element, value) {
        if (element && typeof value !== 'undefined') {
            element.value = value;
        }
    }

    startProcessing() {
        console.log('Starting pool processing...');
        if (this.processInterval) {
            clearInterval(this.processInterval);
        }

        const intervalMs = 1000 / this.flowRate;
        console.log(`Setting processing interval to ${intervalMs}ms (${this.flowRate} symbols/sec)`);

        this.processInterval = setInterval(async () => {
            await this.processNextSymbol();
        }, intervalMs);

        this.isProcessing = true;
    }

    stopProcessing() {
        console.log('Stopping pool processing...');
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
        }
        this.isProcessing = false;
    }

    restartProcessing() {
        if (this.isProcessing) {
            this.stopProcessing();
            this.startProcessing();
        }
    }

    async processNextSymbol() {
        try {
            const uptakeData = await this.environmentDB.getUptakeSymbols();
            
            if (!uptakeData || uptakeData.length === 0) {
                console.log('No uptake data available');
                return;
            }

            // Helper function to check if a symbol is a Greek letter (noise)
            const isNoiseSymbol = (sym) => {
                const greekLetters = new Set([
                    'α', 'β', 'ς', 'δ', 'ε', 'φ', 'γ', 'η', 'ι',
                    'ξ', 'κ', 'λ', 'μ', 'ν', 'ο', 'π', 'ϱ', 'ρ',
                    'σ', 'τ', 'υ', 'ϑ', 'ω', 'χ', 'ψ', 'ζ', 'θ'
                ]);
                return greekLetters.has(sym);
            };

            // Helper function to check if a symbol is a Latin letter (bit)
            const isBitSymbol = (sym) => {
                return /^[A-Z]$/.test(sym) || sym === '∅';
            };

            // Group available symbols by type, with validation
            const availableSymbols = {
                bits: uptakeData.filter(s => isBitSymbol(s.symbol) && s.type === 'bit'),
                noise: uptakeData.filter(s => isNoiseSymbol(s.symbol) && s.type === 'noise')
            };

            console.log('Available symbols:', {
                bits: availableSymbols.bits.length,
                noise: availableSymbols.noise.length
            });

            // Determine if processing as bit based on flow rates
            const processingAsBit = Math.random() * 100 < this.flowRates.bits;
            console.log(`Flow rates - Bits: ${this.flowRates.bits}%, Noise: ${this.flowRates.noise}%`);
            console.log(`Processing as bit: ${processingAsBit}`);

            let symbolData, finalType;

            // Select symbol based on preferred type and availability
            if (processingAsBit && availableSymbols.bits.length > 0) {
                symbolData = availableSymbols.bits[0];
                finalType = 'bit';
            } else if (!processingAsBit && availableSymbols.noise.length > 0) {
                symbolData = availableSymbols.noise[0];
                finalType = 'noise';
            } else if (availableSymbols.bits.length > 0) {
                symbolData = availableSymbols.bits[0];
                finalType = 'bit';
            } else if (availableSymbols.noise.length > 0) {
                symbolData = availableSymbols.noise[0];
                finalType = 'noise';
            } else {
                console.log('No valid symbols available');
                return;
            }

            let symbol = symbolData.symbol;
            let type = finalType;

            // Only apply PB Loss to actual bit symbols
            if (type === 'bit' && isBitSymbol(symbol)) {
                const pbLossRate = parseInt(this.dashboardElements.pbLossRate?.value) || 0;
                console.log(`Applying PB Loss Rate: ${pbLossRate}% to bit symbol: ${symbol}`);
                if (Math.random() * 100 < pbLossRate) {
                    type = 'noise';
                    symbol = this.convertBitToNoise(symbol);
                    console.log(`Pool: Bit ${symbolData.symbol} converted to noise ${symbol} due to PB Loss`);
                }
            }

            try {
                // Store in processingPool
                await this.environmentDB.storeProcessingPoolSymbol({
                    symbol,
                    type,
                    count: 1,
                    timestamp: Date.now()
                });

                console.log(`Stored symbol ${symbol} (${type}) in processingPool`);

                // Remove from uptake store
                await this.environmentDB.deleteUptakeSymbol(symbolData.id);
                console.log(`Removed symbol ${symbolData.symbol} from uptake store`);

                // Update displays
                await this.updateDisplay();

            } catch (error) {
                console.error('Error updating processing pool:', error);
            }

        } catch (error) {
            console.error('Error processing pool symbol:', error);
        }
    }

    convertBitToNoise(bit) {
        const noiseMap = {
            'A': 'α', 'B': 'β', 'C': 'ς', 'D': 'δ', 'E': 'ε',
            'F': 'φ', 'G': 'γ', 'H': 'η', 'I': 'ι', 'J': 'ξ',
            'K': 'κ', 'L': 'λ', 'M': 'μ', 'N': 'ν', 'O': 'ο',
            'P': 'π', 'Q': 'ϱ', 'R': 'ρ', 'S': 'σ', 'T': 'τ',
            'U': 'υ', 'V': 'ϑ', 'W': 'ω', 'X': 'χ', 'Y': 'ψ',
            'Z': 'ζ', '∅': 'θ'
        };
        const result = noiseMap[bit];
        if (!result) {
            console.error(`No noise mapping found for bit: ${bit}`);
            return 'Ω'; // Default fallback symbol
        }
        return result;
    }

    cleanup() {
        this.stopProcessing();
        if (this.displayUpdateInterval) {
            clearInterval(this.displayUpdateInterval);
        }
    }

    updateFlowRate(newRate) {
        this.flowRate = Math.max(1, parseInt(newRate) || 10); // Ensure minimum rate of 1/sec
        console.log(`Flow rate updated to ${this.flowRate} symbols/sec`);
        if (this.isProcessing) {
            this.restartProcessing(); // Restart with new rate if currently processing
        }
    }
}
