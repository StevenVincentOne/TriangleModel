import { environmentDB } from '../shared/ui/database.js';

export class DataConversion {
    constructor(environmentDB) {
        this.environmentDB = environmentDB;
        this.byteConversionInterval = null;
        this.noiseFilterInterval = null;  // Add interval for noise filtering
        this.isConverting = false;
        this.isFiltering = false;  // Add state tracking for filtering
        this.symbolCount = 0;
        this.batchSize = 300;
        this.lastProcessTime = Date.now();
        this.lastFilterTime = Date.now();  // Add separate timing for filtering
        
        // Initialize flow rate ratios
        this.currentPbRatio = 50; // Default PB ratio
        this.currentPnRatio = 50; // Default PN ratio
        
        // Add noise mapping
        this.noiseMap = {
            'A': 'α', 'B': 'β', 'C': 'γ', 'D': 'δ', 'E': 'ε',
            'F': 'ζ', 'G': 'η', 'H': 'θ', 'I': 'ι', 'J': 'κ',
            'K': 'λ', 'L': 'μ', 'M': 'ν', 'N': 'ξ', 'O': 'ο',
            'P': 'π', 'Q': 'ρ', 'R': 'σ', 'S': 'τ', 'T': 'υ',
            'U': 'φ', 'V': 'χ', 'W': 'ψ', 'X': 'ω', 'Y': 'ϑ',
            'Z': 'ϕ'
        };
        
        // Initialize all elements and controls
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

            this.updateDisplay({ totalBits: bytesCount, noise: noiseCount });
            
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
            procpoolData: document.getElementById('procpool-d'),
            procpoolBytes: document.getElementById('procpool-b'),
            procpoolNoise: document.getElementById('procpool-n'),
            flowRate: document.getElementById('conversion-rate'),
            procbflowrate: document.getElementById('proc-b-flow-rate'),
            procnflowrate: document.getElementById('proc-n-flow-rate')
        };

        // Initialize flow rate ratios based on default or existing input values
        this.currentPbRatio = parseInt(this.dashboardElements.procbflowrate?.value) || 50;
        this.currentPnRatio = parseInt(this.dashboardElements.procnflowrate?.value) || 50;

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

        // Set up linked PB/PN flow rate handlers
        if (this.dashboardElements.procbflowrate) {
            this.dashboardElements.procbflowrate.addEventListener('input', (e) => {
                const pbValue = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                const pnValue = 100 - pbValue;
                
                // Update inputs
                this.dashboardElements.procbflowrate.value = pbValue;
                if (this.dashboardElements.procnflowrate) {
                    this.dashboardElements.procnflowrate.value = pnValue;
                }
                
                console.log('Updated processing flow rates:', { pb: pbValue, pn: pnValue });
            });
        }

        if (this.dashboardElements.procnflowrate) {
            this.dashboardElements.procnflowrate.addEventListener('input', (e) => {
                const pnValue = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                const pbValue = 100 - pnValue;
                
                // Update inputs
                this.dashboardElements.procnflowrate.value = pnValue;
                if (this.dashboardElements.procbflowrate) {
                    this.dashboardElements.procbflowrate.value = pbValue;
                }
                
                console.log('Updated processing flow rates:', { pb: pbValue, pn: pnValue });
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
                } else {
                    this.startByteConversion();
                }
            });
        }

        const filterNoiseButton = document.getElementById('filterNoiseButton');
        if (filterNoiseButton) {
            filterNoiseButton.addEventListener('click', () => {
                if (this.isFiltering) {
                    this.stopNoiseFiltering();
                } else {
                    this.startNoiseFiltering();
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
            if (this.dashboardElements.procpoolData) {
                this.dashboardElements.procpoolData.value = Math.round(poolCounts.totalBits + poolCounts.noise);
            }
            if (this.dashboardElements.procpoolBytes) {
                this.dashboardElements.procpoolBytes.value = Math.round(poolCounts.totalBits);
            }
            if (this.dashboardElements.procpoolNoise) {
                this.dashboardElements.procpoolNoise.value = Math.round(poolCounts.noise);
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
                const pbLossRateInput = document.getElementById('pb-loss-rate');
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
        if (this.isConverting || this.byteConversionInterval) {
            console.log('Conversion already running, stopping first');
            this.stopByteConversion();
            return;
        }

        console.log('Starting byte conversion process');
        this.isConverting = true;
        
        // Update button state
        const convertButton = document.getElementById('convertBitsButton');
        if (convertButton) {
            convertButton.classList.add('active');
        }

        this.lastProcessTime = Date.now();
        
        this.byteConversionInterval = setInterval(async () => {
            try {
                // Get flow rate and loss rate
                const flowRateInput = document.getElementById('converted-bytes-flow-rate');
                const cbLossRateInput = document.getElementById('cb-loss-%');
                
                if (!flowRateInput) {
                    throw new Error('Missing converted-bytes-flow-rate input');
                }

                const now = Date.now();
                const deltaTime = now - this.lastProcessTime;
                const convertRate = parseInt(flowRateInput.value) || 10;
                const cbLossRate = parseInt(cbLossRateInput?.value) || 0;
                const symbolsToProcess = Math.floor(convertRate * (deltaTime / 1000));

                if (symbolsToProcess < 1) {
                    return;
                }

                this.lastProcessTime = now;
                const bitsPerByte = 8;
                const poolCounts = await this.environmentDB.getProcessingPoolCounts();

                let processedThisCycle = 0;
                let batchReport = [];

                if (poolCounts && poolCounts.bits && Object.keys(poolCounts.bits).length > 0) {
                    console.log('Processing pool bits:', poolCounts.bits);
                    
                    for (const [symbol, count] of Object.entries(poolCounts.bits)) {
                        if (processedThisCycle >= symbolsToProcess) break;

                        if (count >= bitsPerByte) {
                            const bytesToCreate = Math.min(
                                Math.floor(count / bitsPerByte),
                                symbolsToProcess - processedThisCycle
                            );

                            if (bytesToCreate > 0) {
                                const bitsToRemove = bytesToCreate * bitsPerByte;
                                await this.environmentDB.decrementProcessingPoolBits(symbol, bitsToRemove);

                                // Apply CB Loss % - determine how many bytes become noise
                                const bytesLost = Math.floor(bytesToCreate * (cbLossRate / 100));
                                const bytesPreserved = bytesToCreate - bytesLost;

                                // Store preserved bytes
                                if (bytesPreserved > 0) {
                                    await this.environmentDB.storeConvertedBytes({
                                        symbol: symbol,
                                        type: 'byte',
                                        count: bytesPreserved,
                                        timestamp: Date.now()
                                    });
                                }

                                // Store lost bytes as noise in filteredNoise store
                                if (bytesLost > 0) {
                                    await this.environmentDB.storeFilteredNoise({
                                        symbol: this.convertBitToNoise(symbol),
                                        type: 'noise',
                                        count: bytesLost,
                                        timestamp: Date.now()
                                    });
                                }

                                processedThisCycle += bytesToCreate;
                                
                                batchReport.push({
                                    symbol,
                                    bytesCreated: bytesToCreate,
                                    bytesPreserved,
                                    bytesLost,
                                    bitsRemoved: bitsToRemove,
                                    lossRate: cbLossRate
                                });
                            }
                        }
                    }
                }

                if (batchReport.length > 0) {
                    console.log('Batch conversion report:', {
                        processedThisCycle,
                        conversions: batchReport,
                        flowRate: convertRate,
                        lossRate: cbLossRate
                    });
                    
                    const updatedPoolCounts = await this.environmentDB.getProcessingPoolCounts();
                    await this.updateDisplay(updatedPoolCounts);
                }

            } catch (error) {
                console.error('Error in byte conversion interval:', error);
                this.stopByteConversion();
            }
        }, 50);
    }

    stopByteConversion() {
        console.log('Stopping byte conversion process', {
            hadInterval: !!this.byteConversionInterval,
            wasConverting: this.isConverting
        });

        // Clear the interval
        if (this.byteConversionInterval) {
            clearInterval(this.byteConversionInterval);
            this.byteConversionInterval = null;
        }

        // Reset state and button appearance
        this.isConverting = false;
        const convertButton = document.getElementById('convertBitsButton');
        if (convertButton) {
            convertButton.classList.remove('active');
        }
    }

    async updateDisplay(poolCounts) {
        try {
            // Update Processing Pool displays
            if (poolCounts) {
                const processingPoolDisplays = {
                    'procpool-d': Math.round(poolCounts.totalBits + poolCounts.noise).toString(),
                    'procpool-b': Math.round(poolCounts.totalBits * (this.currentPbRatio / 100)).toString(),
                    'procpool-n': Math.round(poolCounts.noise * (this.currentPnRatio / 100)).toString()
                };

                Object.entries(processingPoolDisplays).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.value = value;
                    }
                });
            }

            // Update Converted Bytes display
            const convertedBytes = await this.environmentDB.getConvertedBytes();
            const bytesCount = convertedBytes
                .filter(b => b.type === 'byte')
                .reduce((sum, b) => sum + (b.count || 1), 0);
            
            const cbDisplay = document.getElementById('convertedBytes');
            if (cbDisplay) {
                cbDisplay.value = bytesCount.toString();
            }

            // Update Converted Noise (CN) display
            const filteredNoise = await this.environmentDB.getFilteredNoise();
            const noiseCount = filteredNoise
                .filter(n => n.type === 'noise')
                .reduce((sum, n) => sum + (n.count || 1), 0);
            
            const cnDisplay = document.getElementById('convert-step-n');
            if (cnDisplay) {
                cnDisplay.value = noiseCount.toString();
            }

            // Log current state
            console.log('Display State:', {
                convertedBytes: bytesCount,
                convertedNoise: noiseCount
            });

        } catch (error) {
            console.error('Error updating displays:', error);
        }
    }

    setupEventListeners() {
        const convertButton = document.getElementById('convertBitsButton');
        if (convertButton) {
            let debounceTimeout = null;
            convertButton.addEventListener('click', () => {
                if (debounceTimeout) return; // Ignore if debounce is active

                debounceTimeout = setTimeout(() => {
                    debounceTimeout = null;
                }, 300); // 300ms debounce

                console.log('Convert button clicked, current state:', {
                    isConverting: this.isConverting,
                    hasInterval: !!this.byteConversionInterval
                });

                if (this.isConverting) {
                    this.stopByteConversion();
                } else {
                    this.startByteConversion();
                }
            });
        }
    }

    async clearConvertedBytes() {
        try {
            console.log('Clearing converted bytes...');
            await this.environmentDB.clearStore('convertedBytes');
            console.log('Converted bytes cleared successfully');
            
            // Update displays after clearing
            const poolCounts = await this.environmentDB.getProcessingPoolCounts();
            await this.updateDisplay(poolCounts);
        } catch (error) {
            console.error('Error clearing converted bytes:', error);
        }
    }

    async filterNoise() {
        try {
            // Get flow rate and filter rate
            const flowRateInput = document.getElementById('convert-step-n-flow-rate');
            const filterRateInput = document.getElementById('noise-filter-1');
            
            if (!flowRateInput) {
                throw new Error('Missing convert-step-n-flow-rate input');
            }

            const now = Date.now();
            const deltaTime = now - this.lastProcessTime;
            const flowRate = parseInt(flowRateInput.value) || 10;
            const filterRate = parseInt(filterRateInput?.value) || 0;
            const symbolsToProcess = Math.floor(flowRate * (deltaTime / 1000));

            if (symbolsToProcess < 1) {
                return;
            }

            this.lastProcessTime = now;

            // Get all symbols from processing pool
            const poolSymbols = await this.environmentDB.getProcessingPool();
            
            // Filter out noise symbols
            const noiseSymbols = poolSymbols.filter(symbol => symbol.type === 'noise');
            
            let processedThisCycle = 0;
            let batchReport = [];

            // Process each noise symbol
            for (const noiseSymbol of noiseSymbols) {
                if (processedThisCycle >= symbolsToProcess) break;

                // Apply NF1 filter rate
                const symbolsToFilter = Math.min(
                    Math.floor(noiseSymbol.count * (filterRate / 100)),
                    symbolsToProcess - processedThisCycle
                );

                if (symbolsToFilter > 0) {
                    // Store in filteredNoise with type descriptor
                    await this.environmentDB.storeFilteredNoise({
                        symbol: noiseSymbol.symbol,
                        type: 'noise',
                        count: symbolsToFilter,
                        originalTimestamp: noiseSymbol.timestamp
                    });
                    
                    // Remove from processing pool
                    await this.environmentDB.decrementProcessingPoolNoise(noiseSymbol.symbol, symbolsToFilter);

                    processedThisCycle += symbolsToFilter;
                    
                    batchReport.push({
                        symbol: noiseSymbol.symbol,
                        filtered: symbolsToFilter,
                        remaining: noiseSymbol.count - symbolsToFilter
                    });
                }
            }
            
            if (batchReport.length > 0) {
                console.log('Noise filtering report:', {
                    processedThisCycle,
                    flowRate,
                    filterRate,
                    filters: batchReport
                });
                
                // Update displays after filtering
                const poolCounts = await this.environmentDB.getProcessingPoolCounts();
                await this.updateDisplay(poolCounts);
            }
            
        } catch (error) {
            console.error('Error filtering noise:', error);
        }
    }

    startNoiseFiltering() {
        if (this.isFiltering || this.noiseFilterInterval) {
            console.log('Filtering already running, stopping first');
            this.stopNoiseFiltering();
            return;
        }

        console.log('Starting noise filtering process');
        this.isFiltering = true;
        
        // Update button state
        const filterButton = document.getElementById('filterNoiseButton');
        if (filterButton) {
            filterButton.classList.add('active');
        }

        this.lastFilterTime = Date.now();
        
        this.noiseFilterInterval = setInterval(async () => {
            try {
                const flowRateInput = document.getElementById('convert-step-n-flow-rate');
                const filterRateInput = document.getElementById('noise-filter-1');
                
                const now = Date.now();
                const deltaTime = now - this.lastFilterTime;
                const flowRate = parseInt(flowRateInput?.value) || 10;
                const filterRate = parseInt(filterRateInput?.value) || 0;
                const symbolsToProcess = Math.floor(flowRate * (deltaTime / 1000));

                if (symbolsToProcess < 1) {
                    return;
                }

                this.lastFilterTime = now;

                // Get noise symbols from processing pool
                const poolSymbols = await this.environmentDB.getProcessingPool();
                const noiseSymbols = poolSymbols.filter(symbol => symbol.type === 'noise');
                
                let processedThisCycle = 0;
                let batchReport = [];

                for (const noiseSymbol of noiseSymbols) {
                    if (processedThisCycle >= symbolsToProcess) break;

                    const symbolsToFilter = Math.min(
                        Math.floor(noiseSymbol.count * (filterRate / 100)),
                        symbolsToProcess - processedThisCycle
                    );

                    if (symbolsToFilter > 0) {
                        await this.environmentDB.storeFilteredNoise({
                            symbol: noiseSymbol.symbol,
                            type: 'noise',
                            count: symbolsToFilter,
                            originalTimestamp: noiseSymbol.timestamp
                        });
                        
                        await this.environmentDB.decrementProcessingPoolNoise(noiseSymbol.symbol, symbolsToFilter);
                        processedThisCycle += symbolsToFilter;
                        
                        batchReport.push({
                            symbol: noiseSymbol.symbol,
                            filtered: symbolsToFilter,
                            remaining: noiseSymbol.count - symbolsToFilter
                        });
                    }
                }

                if (batchReport.length > 0) {
                    console.log('Noise filtering report:', {
                        processedThisCycle,
                        flowRate,
                        filterRate,
                        filters: batchReport
                    });
                    
                    const poolCounts = await this.environmentDB.getProcessingPoolCounts();
                    await this.updateDisplay(poolCounts);
                }

            } catch (error) {
                console.error('Error in noise filtering interval:', error);
                this.stopNoiseFiltering();
            }
        }, 50); // Check every 50ms for smooth updates
    }

    stopNoiseFiltering() {
        if (this.noiseFilterInterval) {
            clearInterval(this.noiseFilterInterval);
            this.noiseFilterInterval = null;
        }
        this.isFiltering = false;
        
        const filterButton = document.getElementById('filterNoiseButton');
        if (filterButton) {
            filterButton.classList.remove('active');
        }
    }
}
