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
        
        
        
        // Add noise mapping
        this.noiseMap = {
            'A': 'α', 'B': 'β', 'C': 'ς', 'D': 'δ', 'E': 'ε',
            'F': 'φ', 'G': 'γ', 'H': 'η', 'I': 'ι', 'J': 'ξ',
            'K': 'κ', 'L': 'λ', 'M': 'μ', 'N': 'ν', 'O': 'ο',
            'P': 'π', 'Q': 'ϱ', 'R': 'ρ', 'S': 'σ', 'T': 'τ',
            'U': 'υ', 'V': 'ϑ', 'W': 'ω', 'X': 'χ', 'Y': 'ψ',
            'Z': 'ζ', '∅': 'θ'
        };
        
        // Initialize all elements and controls
        this.initializeDashboardElements();
        this.initializeControls();
        
        
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

    async startByteConversion() {
        if (this.byteConversionInterval) {
            console.log('Conversion already running, stopping first');
            this.stopByteConversion();
            return;
        }

        console.log('Starting conversion processes');
        this.isConverting = true;
        
        // Add active state to button
        const convertButton = document.getElementById('convertBitsButton');
        if (convertButton) {
            convertButton.classList.add('active');
        }

        this.lastProcessTime = Date.now();
        
        this.byteConversionInterval = setInterval(async () => {
            try {
                // Get flow rates and thresholds
                const flowRateInput = document.getElementById('converted-bytes-flow-rate');
                const cbLossRateInput = document.getElementById('cb-loss-%');
                const nf1RateInput = document.getElementById('noise-filter-1');
                const byteThresholdInput = document.getElementById('byte-convert-rate');
                const entropyThresholdInput = document.getElementById('entropy-convert-rate');
                
                if (!flowRateInput || !byteThresholdInput || !entropyThresholdInput) {
                    throw new Error('Missing required inputs');
                }

                const now = Date.now();
                const deltaTime = now - this.lastProcessTime;
                const convertRate = parseInt(flowRateInput.value) || 10;
                const cbLossRate = parseInt(cbLossRateInput?.value) || 0;
                const nf1Rate = parseInt(nf1RateInput?.value) || 0;
                const bitsPerByte = parseInt(byteThresholdInput.value) || 8;
                const noisePerEntropy = parseInt(entropyThresholdInput.value) || 8;
                
                // Separate maximums for bits and noise
                const maxBitsToProcess = Math.floor(convertRate * (deltaTime / 1000));
                const maxNoiseToProcess = Math.floor(convertRate * (deltaTime / 1000));

                if (maxBitsToProcess < 1 && maxNoiseToProcess < 1) {
                    return; // Skip this cycle but don't stop
                }

                this.lastProcessTime = now;
                const poolSymbols = await this.environmentDB.getProcessingPool();
                const bitSymbols = poolSymbols.filter(symbol => symbol.type === 'bit');
                
                let processedBitsThisCycle = 0;
                let processedNoiseThisCycle = 0;
                let batchReport = { bytes: [], entropy: [], filtered: [] };

                // Process bits to bytes
                for (const symbol of bitSymbols) {
                    if (processedBitsThisCycle >= maxBitsToProcess) break;

                    if (symbol.count >= bitsPerByte) {
                        const bytesToCreate = Math.min(
                            Math.floor(symbol.count / bitsPerByte),
                            maxBitsToProcess - processedBitsThisCycle
                        );

                        if (bytesToCreate > 0) {
                            const bitsToRemove = bytesToCreate * bitsPerByte;
                            await this.environmentDB.decrementProcessingPoolBits(symbol.symbol, bitsToRemove);

                            // Handle CB Loss with similar approach to NF1
                            let bytesPreserved = 0;
                            let bytesLost = 0;

                            if (bytesToCreate === 1) {
                                // For single byte, use random chance
                                if (Math.random() < (cbLossRate / 100)) {
                                    bytesLost = 1;
                                } else {
                                    bytesPreserved = 1;
                                }
                            } else {
                                // For multiple bytes, use percentage splitting
                                bytesLost = Math.round(bytesToCreate * (cbLossRate / 100));
                                bytesPreserved = bytesToCreate - bytesLost;
                            }

                            console.log('CB Loss calculation:', {
                                bytesToCreate,
                                cbLossRate,
                                bytesLost,
                                bytesPreserved,
                                calculation: bytesToCreate === 1 
                                    ? `Single byte: ${bytesLost ? 'lost' : 'preserved'} based on ${cbLossRate}% chance`
                                    : `${bytesToCreate} * (${cbLossRate} / 100) = ${bytesLost}, preserved: ${bytesPreserved}`,
                            });

                            // Store preserved bytes
                            if (bytesPreserved > 0) {
                                await this.environmentDB.storeConvertedBytes({
                                    symbol: symbol.symbol,
                                    type: 'byte',
                                    count: bytesPreserved,
                                    timestamp: Date.now()
                                });

                                batchReport.bytes.push({
                                    symbol: symbol.symbol,
                                    bytesCreated: bytesToCreate,
                                    bytesPreserved,
                                    bytesLost,
                                    bitsRemoved: bitsToRemove,
                                    cbLossRate
                                });
                            }

                            // Store lost bytes as noise in filteredNoise store
                            if (bytesLost > 0) {
                                await this.environmentDB.storeFilteredNoise({
                                    symbol: this.convertBitToNoise(symbol.symbol),
                                    type: 'noise',
                                    count: bytesLost,
                                    timestamp: Date.now()
                                });
                            }

                            processedBitsThisCycle += bytesToCreate;
                            
                            console.log('Bits processing results:', {
                                symbol: symbol.symbol,
                                totalProcessed: bytesToCreate,
                                preserved: bytesPreserved,
                                lost: bytesLost,
                                cbLossRate,
                                processingMethod: bytesToCreate === 1 ? 'random' : 'percentage'
                            });
                        }
                    }
                }

                // Process noise to entropy
                const noiseSymbols = poolSymbols.filter(symbol => symbol.type === 'noise');
                

                for (const symbol of noiseSymbols) {
                    if (processedNoiseThisCycle >= maxNoiseToProcess) break;

                    if (symbol.count >= noisePerEntropy) {
                        const noiseToProcess = Math.min(
                            Math.floor(symbol.count / noisePerEntropy),
                            maxNoiseToProcess - processedNoiseThisCycle
                        );

                        if (noiseToProcess > 0) {
                            const noiseToRemove = noiseToProcess * noisePerEntropy;
                            
                            console.log('Processing noise:', {
                                symbol: symbol.symbol,
                                toProcess: noiseToProcess,
                                toRemove: noiseToRemove,
                                currentCount: symbol.count,
                                nf1Rate
                            });

                            await this.environmentDB.decrementProcessingPoolNoise(symbol.symbol, noiseToRemove);
                            
                            // New approach to handle small numbers and ensure both filtered and entropy get processed
                            let symbolsToFilter = 0;
                            let symbolsToConvert = 0;
                            
                            if (noiseToProcess === 1) {
                                // For single symbols, alternate based on random chance
                                if (Math.random() < (nf1Rate / 100)) {
                                    symbolsToFilter = 1;
                                } else {
                                    symbolsToConvert = 1;
                                }
                            } else {
                                // For multiple symbols, use proper percentage splitting
                                symbolsToFilter = Math.round(noiseToProcess * (nf1Rate / 100));
                                symbolsToConvert = noiseToProcess - symbolsToFilter;
                            }

                            console.log('NF1 calculation:', {
                                noiseToProcess,
                                nf1Rate,
                                symbolsToFilter,
                                symbolsToConvert,
                                calculation: noiseToProcess === 1 
                                    ? `Single symbol: ${symbolsToFilter ? 'filtered' : 'converted'} based on ${nf1Rate}% chance`
                                    : `${noiseToProcess} * (${nf1Rate} / 100) = ${symbolsToFilter}, remainder: ${symbolsToConvert}`,
                            });

                            // Store filtered noise
                            if (symbolsToFilter > 0) {
                                await this.environmentDB.storeFilteredNoise({
                                    symbol: symbol.symbol,
                                    type: 'noise',
                                    count: symbolsToFilter,
                                    timestamp: Date.now()
                                });
                                
                                batchReport.filtered.push({
                                    symbol: symbol.symbol,
                                    filtered: symbolsToFilter,
                                    nf1Rate
                                });
                            }

                            // Store converted entropy
                            if (symbolsToConvert > 0) {
                                await this.environmentDB.storeConvertedBytes({
                                    symbol: symbol.symbol,
                                    type: 'entropy',
                                    count: symbolsToConvert,
                                    timestamp: Date.now()
                                });
                                
                                batchReport.entropy.push({
                                    symbol: symbol.symbol,
                                    entropyCreated: symbolsToConvert,
                                    nf1Rate
                                });
                            }

                            processedNoiseThisCycle += noiseToProcess;
                            
                            console.log('Noise processing results:', {
                                symbol: symbol.symbol,
                                totalProcessed: noiseToProcess,
                                filtered: symbolsToFilter,
                                convertedToEntropy: symbolsToConvert,
                                nf1Rate,
                                processingMethod: noiseToProcess === 1 ? 'random' : 'percentage'
                            });
                        }
                    }
                }

                // Only update displays and log if we processed something
                if (batchReport.bytes.length > 0 || batchReport.entropy.length > 0 || batchReport.filtered.length > 0) {
                    console.log('Batch conversion report:', {
                        processedBits: processedBitsThisCycle,
                        processedNoise: processedNoiseThisCycle,
                        conversions: batchReport,
                        flowRate: convertRate,
                        cbLossRate,
                        nf1Rate,
                        calculations: {
                            cbLoss: `${cbLossRate}% of bytes become noise`,
                            nf1: `${nf1Rate}% of noise is filtered, remainder becomes entropy`
                        },
                        thresholds: {
                            bitsPerByte,
                            noisePerEntropy
                        }
                    });
                    
                    const updatedPoolCounts = await this.environmentDB.getProcessingPoolCounts();
                    await this.updateDisplay(updatedPoolCounts);
                }

            } catch (error) {
                console.error('Error in conversion cycle:', error);
                if (error.message === 'Missing required inputs') {
                    this.stopByteConversion();
                }
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
            // Get existing converted bytes and entropy counts
            const convertedBytesCount = await this.environmentDB.getConvertedBytes()
                .then(bytes => bytes.filter(b => b.type === 'byte')
                    .reduce((sum, b) => sum + (b.count || 1), 0));
            
            const convertedEntropyCount = await this.environmentDB.getConvertedBytes()
                .then(bytes => bytes.filter(b => b.type === 'entropy')
                    .reduce((sum, b) => sum + (b.count || 1), 0));

            // Get filtered noise count
            const filteredNoiseCount = await this.environmentDB.getFilteredNoiseCount();

            // Update display elements - Fix the ID to match HTML
            const convertedBytesInput = document.getElementById('convertedBytes');
            if (convertedBytesInput) {
                convertedBytesInput.value = convertedBytesCount;
            }

            const convertedEntropyInput = document.getElementById('convertedEntropy');
            if (convertedEntropyInput) {
                convertedEntropyInput.value = convertedEntropyCount;
            }

            // Update CN input
            const cnInput = document.getElementById('convert-step-n');
            if (cnInput) {
                cnInput.value = filteredNoiseCount;
            }

            // Log the display state
            console.log('Display State:', {
                convertedBytes: convertedBytesCount,
                convertedEntropy: convertedEntropyCount,
                filteredNoise: filteredNoiseCount
            });
        } catch (error) {
            console.error('Error updating conversion displays:', error);
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

// Add this function to handle input events
function setupInputEventListeners() {
    // Get all number inputs in the system intelligence panels
    const inputs = document.querySelectorAll('.system-intelligence-inputs input[type="number"]');
    
    inputs.forEach(input => {
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission
                input.blur(); // Remove focus from input
                
                // Trigger change event to ensure value is updated
                const changeEvent = new Event('change', { bubbles: true });
                input.dispatchEvent(changeEvent);
            }
        });
    });
}

// Call this when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupInputEventListeners();
});
