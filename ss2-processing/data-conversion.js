import { environmentDB } from '../shared/ui/database.js';

export class DataConversion {
    constructor(environmentDB) {
        this.environmentDB = environmentDB;
        this.isConverting = false;
        this.conversionInterval = null;
        this.monitoringInterval = null;
        this.symbolCount = 0;
        this.batchSize = 300;
        
        // Add noise mapping
        this.noiseMap = {
            'A': 'α', 'B': 'β', 'C': 'γ', 'D': 'δ', 'E': 'ε',
            'F': 'ζ', 'G': 'η', 'H': 'θ', 'I': 'ι', 'J': 'κ',
            'K': 'λ', 'L': 'μ', 'M': 'ν', 'N': 'ξ', 'O': 'ο',
            'P': 'π', 'Q': 'ρ', 'R': 'σ', 'S': 'τ', 'T': 'υ',
            'U': 'φ', 'V': 'χ', 'W': 'ψ', 'X': 'ω', 'Y': 'ϑ',
            'Z': 'ϕ'
        };
        
        this.initializeDashboardElements();
        this.initializeControls();
        this.startProcessingMonitoring();
        
        // Listen for zero events
        document.getElementById('zeroDataButton').addEventListener('click', async () => {
            const shouldClearBytes = document.getElementById('zero-conv-bytes').checked;
            if (shouldClearBytes) {
                await this.clearConvertedBytes();
            }
        });
        
        // Initialize displays with current store state
        this.initializeDisplays();
    }

    async initializeDisplays() {
        try {
            const convertedBytes = await this.environmentDB.getConvertedBytes();
            const bytesCount = convertedBytes
                .filter(b => b.type === 'byte')
                .reduce((sum, b) => sum + (b.count || 1), 0);
            const noiseCount = convertedBytes
                .filter(b => b.type === 'noise')
                .reduce((sum, b) => sum + (b.count || 1), 0);

            this.updateDisplays(bytesCount, noiseCount);
            
            console.log('Initialized displays with store state:', {
                bytesCount,
                noiseCount,
                total: bytesCount + noiseCount
            });
        } catch (error) {
            console.error('Error initializing displays:', error);
        }
    }

    convertBitToNoise(symbol) {
        return this.noiseMap[symbol] || 'Ω';
    }

    initializeDashboardElements() {
        this.dashboardElements = {
            convertData: document.getElementById('convert-d'),
            convertBytes: document.getElementById('convert-b'),
            convertNoise: document.getElementById('convert-n'),
            flowRate: document.getElementById('conversion-rate'),
            cbFlowRate: document.getElementById('cb-flow-rate'),
            cnFlowRate: document.getElementById('cn-flow-rate')
        };

        // Set up flow rate input handler
        if (this.dashboardElements.flowRate) {
            // Update default value
            this.dashboardElements.flowRate.value = 10; // Default 10 symbols per second
            this.dashboardElements.flowRate.min = 0;    // Min 0 symbols per second
            this.dashboardElements.flowRate.max = 1000; // Max 1000 symbols per second
            this.dashboardElements.flowRate.step = 1;   // Increment by 1
            
            this.dashboardElements.flowRate.addEventListener('input', (e) => {
                const newRate = parseInt(e.target.value) || 0;
                this.flowRate = Math.max(0, Math.min(1000, newRate));
                console.log('Processing flow rate updated:', this.flowRate);
                
                // If currently converting, restart with new rate
                if (this.isConverting) {
                    this.stopConversion();
                    this.startConversion();
                }
            });
        }

        // Set up linked CB/CN flow rate handlers
        if (this.dashboardElements.cbFlowRate) {
            this.dashboardElements.cbFlowRate.addEventListener('input', (e) => {
                const cbValue = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                const cnValue = 100 - cbValue;
                
                // Update inputs
                this.dashboardElements.cbFlowRate.value = cbValue;
                if (this.dashboardElements.cnFlowRate) {
                    this.dashboardElements.cnFlowRate.value = cnValue;
                }
                
                console.log('Updated flow rates:', { cb: cbValue, cn: cnValue });
            });
        }

        if (this.dashboardElements.cnFlowRate) {
            this.dashboardElements.cnFlowRate.addEventListener('input', (e) => {
                const cnValue = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                const cbValue = 100 - cnValue;
                
                // Update inputs
                this.dashboardElements.cnFlowRate.value = cnValue;
                if (this.dashboardElements.cbFlowRate) {
                    this.dashboardElements.cbFlowRate.value = cbValue;
                }
                
                console.log('Updated flow rates:', { cb: cbValue, cn: cnValue });
            });
        }
    }

    initializeControls() {
        const convertButton = document.getElementById('letterFlowToggle');
        if (convertButton) {
            convertButton.addEventListener('click', (e) => {
                if (this.isConverting) {
                    this.stopConversion();
                    e.target.classList.remove('active');
                } else {
                    this.startConversion();
                    e.target.classList.add('active');
                }
            });
        }

        const convertBitsButton = document.getElementById('convertBitsButton');
        if (convertBitsButton) {
            convertBitsButton.addEventListener('click', (e) => {
                if (this.isByteConverting) {
                    this.stopByteConversion();
                    e.target.classList.remove('active');
                } else {
                    this.startByteConversion();
                    e.target.classList.add('active');
                }
            });
        }
    }

    async startProcessingMonitoring() {
        console.log('Starting processing pool monitoring');
        // Update display immediately
        await this.updateProcessingDisplay();
        
        // Set up monitoring interval
        this.monitoringInterval = setInterval(async () => {
            await this.updateProcessingDisplay();
        }, 100);
    }

    async updateProcessingDisplay() {
        try {
            const poolCounts = await this.environmentDB.getProcessingPoolCounts();
            
            // Update displays with whole numbers
            if (this.dashboardElements.convertData) {
                this.dashboardElements.convertData.value = Math.round(poolCounts.totalBits + poolCounts.noise);
            }
            if (this.dashboardElements.convertBytes) {
                this.dashboardElements.convertBytes.value = Math.round(poolCounts.totalBits);
            }
            if (this.dashboardElements.convertNoise) {
                this.dashboardElements.convertNoise.value = Math.round(poolCounts.noise);
            }

            // Batch logging
            this.symbolCount++;
            if (this.symbolCount >= this.batchSize) {
                console.log('Processing Pool batch report:', {
                    batchSize: this.batchSize,
                    totalData: poolCounts.totalBits + poolCounts.noise,
                    bits: poolCounts.totalBits,
                    noise: poolCounts.noise,
                    bitsBySymbol: poolCounts.bits
                });
                this.symbolCount = 0;
            }
        } catch (error) {
            console.error('Error updating processing display:', error);
        }
    }

    stopProcessingMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    stopConversion() {
        console.log('Stopping conversion process');
        if (this.conversionInterval) {
            clearInterval(this.conversionInterval);
            this.conversionInterval = null;
        }
        this.isConverting = false;
    }

    async startConversion() {
        console.log('Starting conversion process');
        this.isConverting = true;
        
        const symbolsPerSecond = this.flowRate || 10;
        const intervalMs = 1000 / symbolsPerSecond;
        
        this.conversionInterval = setInterval(async () => {
            try {
                const uptakeData = await this.environmentDB.getUptakeSymbols();
                
                if (!uptakeData || uptakeData.length === 0) {
                    return; // No data to process
                }

                const symbol = uptakeData[0];
                const pbLossRateInput = document.getElementById('pblossrate');
                const pbLossRate = parseInt(pbLossRateInput?.value) || 0;
                
                // Debug logging
                console.log('Processing symbol with PB Loss:', {
                    symbol: symbol.symbol,
                    type: symbol.type,
                    pbLossRate: pbLossRate,
                    inputValue: pbLossRateInput?.value
                });
                
                // Determine if bit should be converted to noise
                let finalType = symbol.type;
                let finalSymbol = symbol.symbol;
                
                if (symbol.type === 'bit') {
                    const randomValue = Math.random() * 100;
                    if (randomValue < pbLossRate) {
                        finalType = 'noise';
                        finalSymbol = this.convertBitToNoise(symbol.symbol);
                        console.log(`Bit conversion triggered:`, {
                            original: symbol.symbol,
                            converted: finalSymbol,
                            randomValue: randomValue,
                            lossRate: pbLossRate
                        });
                    }
                }

                // Store in processing pool
                await this.environmentDB.storeProcessingPoolSymbol({
                    symbol: finalSymbol,
                    type: finalType,
                    timestamp: Date.now()
                });

                // Remove from uptake store
                await this.environmentDB.deleteUptakeSymbol(symbol.id);

                // Trigger display updates
                window.dispatchEvent(new CustomEvent('storeChanged', { 
                    detail: { 
                        store: 'processingPool',
                        action: 'convert',
                        conversion: finalType === 'noise' && symbol.type === 'bit' 
                            ? `${symbol.symbol} → ${finalSymbol}` 
                            : null
                    }
                }));

            } catch (error) {
                console.error('Error in conversion interval:', error);
                this.stopConversion();
            }
        }, intervalMs);
    }

    startByteConversion() {
        console.log('Starting byte conversion process');
        this.isByteConverting = true;
        
        // Start monitoring interval
        this.byteConversionInterval = setInterval(async () => {
            try {
                // Get current processing pool state and noise filter rate
                const poolCounts = await this.environmentDB.getProcessingPoolCounts();
                const noiseFilter = parseInt(document.getElementById('noise-filter-1').value) || 0;
                const cdFlowRate = parseInt(document.getElementById('cd-flow-rate').value) || 10;
                
                // Process bits to bytes
                const byteRate = parseInt(document.getElementById('byte-convert-rate').value) || 8;
                
                // Handle bits conversion
                for (const [symbol, count] of Object.entries(poolCounts.bits)) {
                    if (count >= byteRate) {
                        const bytesToCreate = Math.floor(count / byteRate);
                        const bitsToRemove = bytesToCreate * byteRate;
                        
                        // Remove bits from processing pool
                        await this.environmentDB.decrementProcessingPoolBits(symbol, bitsToRemove);
                        
                        // Add bytes to converted bytes pool
                        await this.environmentDB.storeConvertedBytes({
                            symbol: symbol,
                            type: 'byte',
                            count: bytesToCreate,
                            timestamp: Date.now()
                        });
                    }
                }

                // Handle noise transfer with noise filtering
                const processingPool = await this.environmentDB.getProcessingPool();
                const noiseSymbols = processingPool.filter(item => item.type === 'noise');
                
                for (const noiseSymbol of noiseSymbols) {
                    // Apply CD flow rate and noise filter
                    if (Math.random() * 1000 < cdFlowRate && Math.random() * 100 >= noiseFilter) {
                        // Transfer noise to converted bytes store
                        await this.environmentDB.storeConvertedBytes({
                            symbol: noiseSymbol.symbol,
                            type: 'noise',
                            count: 1,
                            timestamp: Date.now()
                        });
                        
                        // Remove from processing pool
                        await this.environmentDB.decrementProcessingPoolNoise(noiseSymbol.symbol, 1);
                    }
                }

                // Update displays with fresh data
                const convertedBytes = await this.environmentDB.getConvertedBytes();
                const bytesCount = convertedBytes
                    .filter(b => b.type === 'byte')
                    .reduce((sum, b) => sum + (b.count || 1), 0);
                const noiseCount = convertedBytes
                    .filter(b => b.type === 'noise')
                    .reduce((sum, b) => sum + (b.count || 1), 0);

                this.updateDisplays(bytesCount, noiseCount);
                
            } catch (error) {
                console.error('Error in byte conversion interval:', error);
                this.stopByteConversion();
            }
        }, 100);
    }

    updateDisplays(bytesCount, noiseCount) {
        // Get the elements directly each time to ensure we have the latest references
        const cdElement = document.getElementById('converted-bytes-d');
        const cbElement = document.getElementById('convertedBytes');
        const cnElement = document.getElementById('convert-step-n');

        if (cdElement) {
            cdElement.value = bytesCount + noiseCount;
        }
        if (cbElement) {
            cbElement.value = bytesCount;
        }
        if (cnElement) {
            cnElement.value = noiseCount;
        }

        console.log('Display values updated:', {
            CD: cdElement?.value,
            CB: cbElement?.value,
            CN: cnElement?.value,
            rawValues: {
                bytes: bytesCount,
                noise: noiseCount,
                total: bytesCount + noiseCount
            }
        });
    }

    stopByteConversion() {
        console.log('Stopping byte conversion process');
        if (this.byteConversionInterval) {
            clearInterval(this.byteConversionInterval);
            this.byteConversionInterval = null;
        }
        this.isByteConverting = false;
    }

    async clearConvertedBytes() {
        try {
            await this.environmentDB.clearStore('convertedBytes');
            console.log('Cleared convertedBytes store');
            
            // Update displays with zeroed values
            const poolCounts = await this.environmentDB.getProcessingPoolCounts();
            const convertedBytes = await this.environmentDB.getConvertedBytes();
            this.updateDisplays(0, 0);
            
            // Trigger store changed event
            window.dispatchEvent(new CustomEvent('storeChanged', { 
                detail: { 
                    store: 'convertedBytes',
                    action: 'clear'
                }
            }));
        } catch (error) {
            console.error('Error clearing convertedBytes store:', error);
        }
    }

    async processConversion() {
        try {
            // Get current processing pool state and noise filter rate
            const poolCounts = await this.environmentDB.getProcessingPoolCounts();
            const noiseFilter = parseInt(document.getElementById('noise-filter-1').value) || 0;
            const cdFlowRate = parseInt(document.getElementById('cd-flow-rate').value) || 10;
            const byteRate = parseInt(document.getElementById('byte-convert-rate').value) || 8;
            
            // Process bits to bytes
            for (const [symbol, count] of Object.entries(poolCounts.bits)) {
                if (count >= byteRate) {
                    const bytesToCreate = Math.floor(count / byteRate);
                    const bitsToRemove = bytesToCreate * byteRate;
                    
                    // Remove bits from processing pool
                    const decremented = await this.environmentDB.decrementProcessingPoolBits(symbol, bitsToRemove);
                    
                    if (decremented) {
                        await this.environmentDB.storeConvertedBytes({
                            symbol: symbol,
                            type: 'byte',
                            count: bytesToCreate,
                            timestamp: Date.now()
                        });
                    }
                }
            }

            // Handle noise transfer with noise filtering
            if (poolCounts.noise > 0) {
                // Get all items from processing pool
                const processingPool = await this.environmentDB.getProcessingPool();
                // Filter for noise items
                const noiseSymbols = processingPool.filter(item => item.type === 'noise');
                
                for (const noiseSymbol of noiseSymbols) {
                    // Apply CD flow rate and noise filter
                    if (Math.random() * 1000 < cdFlowRate && Math.random() * 100 >= noiseFilter) {
                        // Transfer noise to converted bytes store
                        await this.environmentDB.storeConvertedBytes({
                            symbol: noiseSymbol.symbol,
                            type: 'noise',
                            count: 1,
                            timestamp: Date.now()
                        });
                        
                        // Remove from processing pool
                        await this.environmentDB.decrementProcessingPoolNoise(noiseSymbol.symbol, 1);
                    }
                }
            }

            // Get current state and update displays
            const convertedBytes = await this.environmentDB.getConvertedBytes();
            
            // Calculate totals
            const bytesCount = convertedBytes
                .filter(b => b.type === 'byte')
                .reduce((sum, b) => sum + (b.count || 1), 0);
                
            const noiseCount = convertedBytes
                .filter(b => b.type === 'noise')
                .reduce((sum, b) => sum + (b.count || 1), 0);
            
            // Update displays with CB + CN = CD logic
            if (this.dashboardElements.convertData) {
                this.dashboardElements.convertData.value = bytesCount + noiseCount;
            }
            if (this.dashboardElements.convertBytes) {
                this.dashboardElements.convertBytes.value = bytesCount;
            }
            if (this.dashboardElements.convertNoise) {
                this.dashboardElements.convertNoise.value = noiseCount;
            }

            console.log('Conversion stats:', {
                totalData: bytesCount + noiseCount,
                bytes: bytesCount,
                noise: noiseCount,
                convertedBytes: convertedBytes
            });

        } catch (error) {
            console.error('Error in processConversion:', error);
        }
    }
}
