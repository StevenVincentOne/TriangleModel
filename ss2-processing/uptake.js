export class UptakeSystem {
    constructor(environmentModule) {
        this.environmentModule = environmentModule;
        this.environmentDB = environmentModule.environmentDB;
        
        // Initialize state
        this.isProcessing = false;
        this.processInterval = null;
        this.displayUpdateInterval = null;
        this.flowRate = 10;
        
        // Initialize dashboard elements
        this.dashboardElements = {
            uptakeData: document.getElementById('uptake-d'),
            uptakeBits: document.getElementById('uptake-b'),
            uptakeNoise: document.getElementById('uptake-n'),
            flowRate: document.getElementById('uptake-flow-rate'),
            bitsFlowRate: document.getElementById('uptake-b-flow-rate'),
            noiseFlowRate: document.getElementById('uptake-n-flow-rate'),
            ubLossRate: document.getElementById('uptake-loss-%'),
            uptakeButton: document.getElementById('uptakeButton')
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

        this.setupControls();
        this.startDisplayUpdates();
        this.updateDisplay(); // Ensure immediate first update
    }

    setupControls() {
        // Set up Uptake button
        const uptakeButton = this.dashboardElements.uptakeButton;
        console.log('Setting up Uptake button:', uptakeButton); // Log button element

        if (uptakeButton) {
            uptakeButton.addEventListener('click', (e) => {
                console.log('Uptake button clicked!', e); // Log click event
                try {
                    if (this.isProcessing) {
                        console.log('Was processing, stopping now...');
                        this.stopProcessing();
                        uptakeButton.classList.remove('active');
                    } else {
                        console.log('Was stopped, starting now...');
                        this.startProcessing();
                        uptakeButton.classList.add('active');
                    }
                    console.log('Processing state:', this.isProcessing); // Log state after change
                } catch (error) {
                    console.error('Error in uptake button handler:', error);
                    this.stopProcessing();
                    uptakeButton.classList.remove('active');
                }
            });
            console.log('Click handler attached to Uptake button');
        } else {
            console.error('Uptake button not found! Available elements:', this.dashboardElements);
        }

        // Set up main flow rate control
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

        // Set up bits flow rate (UB %)
        if (this.dashboardElements.bitsFlowRate) {
            this.dashboardElements.bitsFlowRate.addEventListener('input', (e) => {
                try {
                    const bitsRate = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    const noiseRate = 100 - bitsRate;
                    
                    this.flowRates.bits = bitsRate;
                    this.flowRates.noise = noiseRate;
                    
                    // Update noise flow rate display
                    if (this.dashboardElements.noiseFlowRate) {
                        this.dashboardElements.noiseFlowRate.value = noiseRate;
                    }
                    
                    console.log('Updated uptake flow rates:', this.flowRates);
                } catch (error) {
                    console.error('Error updating bits flow rate:', error);
                }
            });
        }
    }

    startDisplayUpdates() {
        this.updateDisplay(); // Initial update
        this.displayUpdateInterval = setInterval(() => {
            this.updateDisplay();
        }, 100); // Update every 100ms
    }

    async updateDisplay() {
        try {
            const uptakeData = await this.environmentDB.getUptakeSymbols() || [];
            
            // Initialize counters
            const counts = uptakeData.reduce((acc, item) => {
                if (item.type === 'bit') acc.bits++;
                if (item.type === 'noise') acc.noise++;
                return acc;
            }, { bits: 0, noise: 0 });
            
            const totalData = counts.bits + counts.noise;

            // Update displays with null checks
            this.updateElementValue(this.dashboardElements.uptakeData, totalData);
            this.updateElementValue(this.dashboardElements.uptakeBits, counts.bits);
            this.updateElementValue(this.dashboardElements.uptakeNoise, counts.noise);
            
        } catch (error) {
            console.error('Error updating uptake display:', error);
        }
    }

    // Helper method to safely update element values
    updateElementValue(element, value) {
        if (element && typeof value !== 'undefined') {
            element.value = value;
        }
    }

    startProcessing() {
        console.log('Starting uptake processing...');
        if (this.processInterval) {
            clearInterval(this.processInterval);
        }

        // Calculate interval based on flow rate (symbols per second)
        const intervalMs = 1000 / this.flowRate; // Convert rate/sec to milliseconds
        console.log(`Setting processing interval to ${intervalMs}ms (${this.flowRate} symbols/sec)`);

        this.processInterval = setInterval(async () => {
            await this.processNextSymbol();
        }, intervalMs);

        this.isProcessing = true;
    }

    stopProcessing() {
        console.log('Stopping uptake processing...');
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
            const envData = await this.environmentDB.getEnvironmentalPool();
            
            // Get the first environmental pool record
            const currentPool = envData[0];
            if (!currentPool || (!currentPool.bits?.length && !currentPool.noise?.length)) {
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

            // Determine if processing as bit based on flow rates
            const processingAsBit = Math.random() * 100 < this.flowRates.bits;
            let symbol, type;

            // Try to process according to preference, but fall back if preferred type is empty
            if (processingAsBit && currentPool.bits.length > 0) {
                symbol = currentPool.bits.shift();
                type = 'bit';
            } else if (!processingAsBit && currentPool.noise.length > 0) {
                symbol = currentPool.noise.shift();
                type = 'noise';
            } else if (currentPool.bits.length > 0) {
                // Fall back to bits if noise was preferred but empty
                symbol = currentPool.bits.shift();
                type = 'bit';
            } else if (currentPool.noise.length > 0) {
                // Fall back to noise if bits were preferred but empty
                symbol = currentPool.noise.shift();
                type = 'noise';
            }

            // Validate symbol type
            if (type === 'bit' && !isBitSymbol(symbol)) {
                console.error(`Invalid bit symbol detected: ${symbol}`);
                return;
            }
            if (type === 'noise' && !isNoiseSymbol(symbol)) {
                console.error(`Invalid noise symbol detected: ${symbol}`);
                return;
            }

            // Apply UB Loss to bits
            if (type === 'bit' && isBitSymbol(symbol)) {
                const ubLossRate = parseInt(this.dashboardElements.ubLossRate?.value) || 0;
                if (Math.random() * 100 < ubLossRate) {
                    type = 'noise';
                    const originalSymbol = symbol;
                    symbol = this.convertBitToNoise(symbol);
                    console.log(`Uptake: Bit ${originalSymbol} converted to noise ${symbol} (UB Loss: ${ubLossRate}%)`);
                }
            }

            // First store in uptake store
            await this.environmentDB.storeUptakeSymbol({
                symbol,
                type,
                timestamp: Date.now()
            });

            // Update environmental pool with remaining symbols
            await this.environmentDB.storeEnvironmentalPool([{
                ...currentPool,
                bits: currentPool.bits,
                noise: currentPool.noise
            }]);

            console.log(`Processed symbol: ${symbol} as ${type}. Remaining in pool:`, {
                bits: currentPool.bits.length,
                noise: currentPool.noise.length
            });
            
            // Update displays
            await this.updateDisplay();
            await this.environmentModule.updateDashboard();

        } catch (error) {
            console.error('Error processing uptake symbol:', error);
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

    // Add flow rate update method
    updateFlowRate(newRate) {
        this.flowRate = Math.max(1, parseInt(newRate) || 10); // Ensure minimum rate of 1/sec
        console.log(`Flow rate updated to ${this.flowRate} symbols/sec`);
        if (this.isProcessing) {
            this.restartProcessing(); // Restart with new rate if currently processing
        }
    }
}
