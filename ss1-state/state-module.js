import { LossFunction, NodeChannelEntropy } from '../ss2-processing/data-processing.js';
import { environmentDB } from '../shared/ui/database.js';
import { StateCapacity } from './state-capacity.js';

export class StateModule {
    constructor(triangleSystem) {
        this.triangleSystem = triangleSystem;
        
        this.stateCapacity = new StateCapacity(triangleSystem);
        
        // Add reference to environmentDB
        this.environmentDB = environmentDB;
        
        

        // State management
        this.dataReductionRate = 9; // Default 9:1 ratio
        this._stateEnabled = false;

        // Initialize components
        this.lossFunction = new LossFunction();
        this.nodeChannelEntropy = new NodeChannelEntropy(this);

        // Initialize data structures
        this.statePool = {
            groups: {},           // Stores counts of each symbol
            totalUnprocessed: 0   // Total unprocessed symbols
        };
        
        this.stateMetrics = {
            totalSymbols: 0,
            netSymbols: 0,
            convertedData: 0,
            totalBytes: 0,
            totalEntropy: 0
        };

        // Add state toggle listener
        const stateToggle = document.getElementById('intelligenceToggle');
        if (stateToggle) {
            stateToggle.addEventListener('click', () => {
                this.toggleState(stateToggle);
            });
        }

        // Initialize all system state inputs
        this.initializeStateInputs();

        // Initialize clean state
        this.generateInitialState();
        this.updateDashboard();

        // Set up intake button
        this.setupIntakeButton();
        
        // Track intake state
        this.isIntaking = false;
        this.intakeInterval = null;

        // State flow controls
        this.stateRates = {
            sd: 10,  // symbols per second
            sb: 50,  // byte percentage (default 50%)
            se: 50   // entropy percentage (default 50%)
        };

        // Initialize state controls
        this.initializeStateControls();

        // Listen for distribution changes
        this.initializeDistributionControls();

        // Initial state display update with retry
        this.initializeStateDisplays();

        // Listen for convertedBytes updates
        window.addEventListener('convertedBytesUpdated', async () => {
            try {
                const convertedData = await this.environmentDB.getConvertedBytes();
                const byteCount = convertedData
                    .filter(item => item.type === 'byte')
                    .reduce((sum, item) => sum + (item.count || 1), 0);
                const entropyCount = convertedData
                    .filter(item => item.type === 'entropy')
                    .reduce((sum, item) => sum + (item.count || 1), 0);
                
                console.log('ConvertedBytes updated:', {
                    total: convertedData.length,
                    bytes: byteCount,
                    entropy: entropyCount
                });
                
                // Update converted bytes/entropy displays
                const cbDisplay = document.getElementById('convertedBytes');
                const ceDisplay = document.getElementById('convertedEntropy');
                
                if (cbDisplay) {
                    cbDisplay.value = byteCount.toString();
                }
                if (ceDisplay) {
                    ceDisplay.value = entropyCount.toString();
                }
            } catch (error) {
                console.error('Error updating converted bytes display:', error);
            }
        });

        // Add real-time monitoring of stateIntake store
        this.setupStateMonitoring();

        // Add NC update rates and distributions
        this.ncRates = {
            nc1: { rate: 10, bytePercent: 50, entropyPercent: 50 },
            nc2: { rate: 10, bytePercent: 50, entropyPercent: 50 },
            nc3: { rate: 10, bytePercent: 50, entropyPercent: 50 }
        };

        // Add loss rates
        this.ncLossRates = {
            nc1: 0,
            nc2: 0,
            nc3: 0
        };

        // Initialize NC controls
        this.initializeNCControls();
        
        // Set up update button
        this.setupUpdateButton();

        // Initialize NC displays immediately after database is ready
        this.initializeNCDisplays();

        // Listen for stateUpdateNC store changes
        window.addEventListener('stateUpdateNCUpdated', async (event) => {
            const { nc } = event.detail;
            try {
                await this.updateNCDisplay(nc);
            } catch (error) {
                console.error('Error updating NC display:', error);
            }
        });

        // Add run controls
        this.runRates = {
            nc1: 10,
            nc2: 10,
            nc3: 10
        };

        // Add run monitoring
        this.runCounts = {
            nc1: 0,
            nc2: 0,
            nc3: 0
        };

        this.setupRunButton();
        this.initializeRunControls();
        this.setupNCUpdateListeners();
    }

    // Getter for stateEnabled
    get stateEnabled() {
        return this._stateEnabled;
    }

    // Setter for stateEnabled
    set stateEnabled(value) {
        this._stateEnabled = value;
        console.log('State system enabled:', value);
    }

    // Toggle State Mode
    toggleState(button) {
        this.stateEnabled = !this.stateEnabled;

        if (this.stateEnabled) {
            button.classList.add('active');
            button.querySelector('.status-icon-off').style.display = 'none';
            button.querySelector('.status-icon-on').style.display = 'inline';
            console.log('State system: enabled');
        } else {
            button.classList.remove('active');
            button.querySelector('.status-icon-on').style.display = 'none';
            button.querySelector('.status-icon-off').style.display = 'inline';
            console.log('State system: disabled');
        }
    }

    

    async processImportedData(importedData) {
        for (const data of importedData) {
            try {
                // Determine target subsystem based on symbol mapping
                const subsystem = this.mapSymbolToSubsystem(data.symbol);
                
                // Check capacity before processing
                if (!this.stateCapacity.hasSubsystemCapacity(subsystem)) {
                    console.log(`Subsystem ${subsystem} at capacity, skipping import`);
                    continue;
                }

                // Process based on type
                if (data.type === 'byte') {
                    await this.processByte(data, subsystem);
                } else if (data.type === 'entropy') {
                    await this.processEntropy(data, subsystem);
                }

                

            } catch (error) {
                console.error('Error processing data item:', error);
            }
        }
    }

    mapSymbolToSubsystem(symbol) {
        // Convert symbol to character code if it's a string
        const charCode = typeof symbol === 'string' ? symbol.charCodeAt(0) : symbol;
        
        // Distribute symbols evenly across subsystems based on character code
        return (charCode % 3) + 1;  // Returns 1, 2, or 3
    }

    

    // Rename intelligence-specific methods to state-specific ones
    initializeStateInputs() {
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

        // Flow Rate input
        this.setupInput('flow-rate', (value) => {
            if (!isNaN(value) && value >= 1 && value <= 100) {
                console.log(`Flow rate updated to: ${value}`);
            }
        });
    }

    generateInitialState() {
        console.log('Initializing clean state...');
        this.statePool = { groups: {}, totalUnprocessed: 0 };
        this.stateMetrics = {
            totalSymbols: 0,
            netSymbols: 0,
            totalBytes: 0,
            totalEntropy: 0,
            convertedData: 0
        };
        console.log('System initialized with clean state:', this.stateMetrics);
    }

    // Keep other utility methods
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

    updateDashboard() {
        // Update with state-specific metrics
        const displays = {
            'system-d': this.stateMetrics.totalSymbols,
            'system-b': this.stateMetrics.totalBytes,
            'system-e': this.stateMetrics.totalEntropy,
            'system-be-ratio': this.stateMetrics.totalEntropy === 0 ? 'N/A' : 
                (this.stateMetrics.totalBytes / this.stateMetrics.totalEntropy).toFixed(2)
        };

        Object.entries(displays).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });

        // Log state metrics update
        console.log('State Metrics Updated:', this.stateMetrics);
    }

    setupIntakeButton() {
        const intakeButton = document.getElementById('intakeStateButton');
        if (intakeButton) {
            intakeButton.addEventListener('click', () => this.toggleIntake());
        }
    }

    async toggleIntake() {
        const button = document.getElementById('intakeStateButton');
        this.isIntaking = !this.isIntaking;

        if (this.isIntaking) {
            button?.classList.add('active');
            this.startIntake();
        } else {
            button?.classList.remove('active');
            this.stopIntake();
        }
    }

    async startIntake() {
        if (this.intakeInterval) return;

        console.log('Starting state intake process');
        this.intakeInterval = setInterval(async () => {
            try {
                // Check system capacity first
                const currentCapacity = await this.stateCapacity.getCurrentUsage();
                const maxCapacity = this.stateCapacity.maxCapacity;
                
                if (currentCapacity >= maxCapacity) {
                    console.log('State system at capacity, pausing intake');
                    return;
                }

                // Get converted data
                const convertedData = await this.environmentDB.getConvertedBytes();
                
                console.log('Current converted data:', {
                    total: convertedData.length,
                    bytes: convertedData.filter(d => d.type === 'byte').length,
                    entropy: convertedData.filter(d => d.type === 'entropy').length
                });

                if (!convertedData.length) {
                    console.log('No converted data available');
                    return;
                }

                // Calculate how many symbols to process this cycle
                const cycleTime = 1; // Process per second
                const symbolsToProcess = Math.max(1, Math.floor(this.stateRates.sd * cycleTime));
                
                // Apply distribution percentages
                const bytesToProcess = Math.max(1, Math.floor(symbolsToProcess * (this.stateRates.sb / 100)));
                const entropyToProcess = Math.max(1, Math.floor(symbolsToProcess * (this.stateRates.se / 100)));

                // Process bytes
                const byteSymbols = convertedData
                    .filter(d => d.type === 'byte')
                    .slice(0, bytesToProcess);

                for (const symbol of byteSymbols) {
                    // Assign subsystem based on symbol value
                    const subsystem = this.mapSymbolToSubsystem(symbol.symbol);
                    console.log(`Assigning byte symbol ${symbol.symbol} to subsystem ${subsystem}`);

                    await this.environmentDB.storeStateIntakeSymbol({
                        symbol: symbol.symbol,
                        type: 'byte',
                        subsystem: subsystem
                    });
                    await this.environmentDB.deleteConvertedByte(symbol.id);
                }

                // Process entropy
                const entropySymbols = convertedData
                    .filter(d => d.type === 'entropy')
                    .slice(0, entropyToProcess);

                for (const symbol of entropySymbols) {
                    // Assign subsystem based on symbol value
                    const subsystem = this.mapSymbolToSubsystem(symbol.symbol);
                    console.log(`Assigning entropy symbol ${symbol.symbol} to subsystem ${subsystem}`);

                    await this.environmentDB.storeStateIntakeSymbol({
                        symbol: symbol.symbol,
                        type: 'entropy',
                        subsystem: subsystem
                    });
                    await this.environmentDB.deleteConvertedByte(symbol.id);
                }

                // Update displays
                await this.updateStateDisplays();

            } catch (error) {
                console.error('Error in intake cycle:', error, error.stack);
            }
        }, 1000);
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
            
            // Calculate totals from current state
            const totalSymbols = stateIntakeSymbols.length;
            const byteSymbols = stateIntakeSymbols.filter(s => s.type === 'byte').length;
            const entropySymbols = stateIntakeSymbols.filter(s => s.type === 'entropy').length;

            // Update displays with current state
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
            throw error;
        }
    }

    initializeStateControls() {
        // SD Rate control
        const sdRateInput = document.getElementById('sd-rate');
        if (sdRateInput) {
            sdRateInput.addEventListener('change', (e) => {
                const newRate = parseInt(e.target.value);
                if (!isNaN(newRate) && newRate >= 0) {
                    this.stateRates.sd = newRate;
                    console.log(`State data intake rate updated to: ${newRate} symbols/sec`);
                }
            });
        }

        // Update displays for current byte/entropy counts
        this.updateStateDisplays();
    }

    initializeDistributionControls() {
        // SB percentage control
        const sbPercentInput = document.getElementById('sb-percent');
        if (sbPercentInput) {
            sbPercentInput.value = this.stateRates.sb; // Set initial value
            sbPercentInput.addEventListener('input', (e) => {  // Changed from 'change' to 'input'
                const newPercent = parseInt(e.target.value);
                if (!isNaN(newPercent) && newPercent >= 0 && newPercent <= 100) {
                    this.stateRates.sb = newPercent;
                    this.stateRates.se = 100 - newPercent; // Update SE to complement
                    
                    // Update SE input to reflect change
                    const seInput = document.getElementById('se-percent');
                    if (seInput) {
                        seInput.value = this.stateRates.se;
                    }
                    
                    // Update the distribution in the state system
                    this.updateDistributionRates();
                    
                    console.log('Distribution updated:', {
                        bytes: this.stateRates.sb,
                        entropy: this.stateRates.se
                    });
                }
            });
        }

        // SE percentage control
        const sePercentInput = document.getElementById('se-percent');
        if (sePercentInput) {
            sePercentInput.value = this.stateRates.se; // Set initial value
            sePercentInput.addEventListener('input', (e) => {  // Changed from 'change' to 'input'
                const newPercent = parseInt(e.target.value);
                if (!isNaN(newPercent) && newPercent >= 0 && newPercent <= 100) {
                    this.stateRates.se = newPercent;
                    this.stateRates.sb = 100 - newPercent; // Update SB to complement
                    
                    // Update SB input to reflect change
                    const sbInput = document.getElementById('sb-percent');
                    if (sbInput) {
                        sbInput.value = this.stateRates.sb;
                    }
                    
                    // Update the distribution in the state system
                    this.updateDistributionRates();
                    
                    console.log('Distribution updated:', {
                        entropy: this.stateRates.se,
                        bytes: this.stateRates.sb
                    });
                }
            });
        }
    }

    // Add this new method to handle distribution rate updates
    updateDistributionRates() {
        // Update the actual data flow based on the new distribution rates
        this.stateData.byteRate = Math.floor((this.stateRates.sb / 100) * this.stateData.totalRate);
        this.stateData.entropyRate = Math.floor((this.stateRates.se / 100) * this.stateData.totalRate);
        
        // Trigger an update of the displays
        this.updateStateDisplays();
    }

    async initializeStateDisplays() {
        const maxRetries = 3;
        let retries = 0;
        
        const tryUpdate = async () => {
            try {
                await this.environmentDB.ready; // Wait for DB initialization
                await this.updateStateDisplays();
            } catch (error) {
                console.warn(`State display initialization attempt ${retries + 1} failed:`, error);
                if (retries < maxRetries) {
                    retries++;
                    setTimeout(tryUpdate, 500 * retries); // Exponential backoff
                } else {
                    console.error('Failed to initialize state displays after retries');
                }
            }
        };
        
        await tryUpdate();
    }

    setupStateMonitoring() {
        // Monitor state intake store every 100ms
        setInterval(async () => {
            try {
                await this.updateStateDisplays();
            } catch (error) {
                console.error('Error in state monitoring:', error);
            }
        }, 100);
    }

    setupUpdateButton() {
        const updateButton = document.getElementById('stateUpdateButton');
        if (updateButton) {
            updateButton.addEventListener('click', async () => {
                if (this.updateInterval) {
                    updateButton.classList.remove('active');
                    this.stopUpdate();
                    // Update displays one final time when stopping
                    await this.updateNCDisplays();
                } else {
                    updateButton.classList.add('active');
                    this.startUpdate();
                }
            });
        }
    }

    async startUpdate() {
        if (this.updateInterval) return;

        console.log('Starting state update process');
        this.updateInterval = setInterval(async () => {
            try {
                // Get all symbols from stateIntake
                const stateIntakeSymbols = await this.environmentDB.getStateIntakeSymbols();
                
                console.log('State Intake Symbols:', {
                    total: stateIntakeSymbols.length,
                    bySubsystem: {
                        1: stateIntakeSymbols.filter(s => s.subsystem === 1).length,
                        2: stateIntakeSymbols.filter(s => s.subsystem === 2).length,
                        3: stateIntakeSymbols.filter(s => s.subsystem === 3).length
                    },
                    byType: {
                        bytes: stateIntakeSymbols.filter(s => s.type === 'byte').length,
                        entropy: stateIntakeSymbols.filter(s => s.type === 'entropy').length
                    }
                });
                
                // Process symbols for each NC
                for (let ncNum = 1; ncNum <= 3; ncNum++) {
                    // Get symbols for this NC based on subsystem
                    const ncSymbols = stateIntakeSymbols.filter(s => s.subsystem === ncNum);
                    
                    console.log(`Processing NC${ncNum}:`, {
                        available: ncSymbols.length,
                        bytes: ncSymbols.filter(s => s.type === 'byte').length,
                        entropy: ncSymbols.filter(s => s.type === 'entropy').length
                    });

                    // Calculate how many symbols to process this cycle
                    const cycleTime = 1; // Process per second
                    const symbolsToProcess = Math.max(1, Math.floor(this.ncRates[`nc${ncNum}`].rate * cycleTime));
                    
                    // Apply distribution percentages
                    const bytesToProcess = Math.max(1, Math.floor(symbolsToProcess * (this.ncRates[`nc${ncNum}`].bytePercent / 100)));
                    const entropyToProcess = Math.max(1, Math.floor(symbolsToProcess * (this.ncRates[`nc${ncNum}`].entropyPercent / 100)));

                    console.log(`NC${ncNum} Processing amounts:`, {
                        symbolsToProcess,
                        bytesToProcess,
                        entropyToProcess,
                        lossRate: this.ncLossRates[`nc${ncNum}`]
                    });

                    // Process bytes with loss rate
                    const byteSymbols = ncSymbols
                        .filter(s => s.type === 'byte')
                        .slice(0, bytesToProcess);

                    for (const symbol of byteSymbols) {
                        // Apply loss rate - convert some bytes to entropy
                        const isLost = Math.random() * 100 < this.ncLossRates[`nc${ncNum}`];
                        const type = isLost ? 'entropy' : 'byte';
                        
                        console.log(`Processing byte symbol for NC${ncNum}:`, {
                            symbol: symbol.symbol,
                            type,
                            isLost
                        });

                        await this.environmentDB.storeStateUpdateNC(ncNum, {
                            symbol: symbol.symbol,
                            type,
                            subsystem: ncNum
                        });
                        
                        await this.environmentDB.deleteStateIntakeSymbol(symbol.id);
                    }

                    // Process entropy symbols
                    const entropySymbols = ncSymbols
                        .filter(s => s.type === 'entropy')
                        .slice(0, entropyToProcess);

                    for (const symbol of entropySymbols) {
                        console.log(`Processing entropy symbol for NC${ncNum}:`, {
                            symbol: symbol.symbol
                        });

                        await this.environmentDB.storeStateUpdateNC(ncNum, {
                            symbol: symbol.symbol,
                            type: 'entropy',
                            subsystem: ncNum
                        });
                        
                        await this.environmentDB.deleteStateIntakeSymbol(symbol.id);
                    }
                }

                // Update NC displays
                await this.updateNCDisplays();

            } catch (error) {
                console.error('Error in update cycle:', error, error.stack);
            }
        }, 1000);
    }

    stopUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('State update stopped');
        }
    }

    async updateNCDisplays() {
        try {
            for (let ncNum = 1; ncNum <= 3; ncNum++) {
                await this.updateNCDisplay(ncNum);
            }
        } catch (error) {
            console.error('Error updating NC displays:', error);
            throw error;
        }
    }

    initializeNCControls() {
        // Initialize for each NC
        for (let ncNum = 1; ncNum <= 3; ncNum++) {
            // Rate control
            const rateInput = document.getElementById(`nc${ncNum}-rate`);
            if (rateInput) {
                rateInput.addEventListener('change', (e) => {
                    const newRate = parseInt(e.target.value);
                    if (!isNaN(newRate) && newRate >= 0) {
                        this.ncRates[`nc${ncNum}`].rate = newRate;
                    }
                });
            }

            // Byte percentage control
            const bytePercentInput = document.getElementById(`nc${ncNum}b-percent`);
            if (bytePercentInput) {
                bytePercentInput.addEventListener('change', (e) => {
                    const newPercent = parseInt(e.target.value);
                    if (!isNaN(newPercent) && newPercent >= 0 && newPercent <= 100) {
                        this.ncRates[`nc${ncNum}`].bytePercent = newPercent;
                        this.ncRates[`nc${ncNum}`].entropyPercent = 100 - newPercent;
                        
                        // Update entropy input
                        const entropyInput = document.getElementById(`nc${ncNum}e-percent`);
                        if (entropyInput) {
                            entropyInput.value = this.ncRates[`nc${ncNum}`].entropyPercent;
                        }
                    }
                });
            }

            // Loss rate control
            const lossRateInput = document.getElementById(`nc${ncNum}-loss-rate`);
            if (lossRateInput) {
                lossRateInput.addEventListener('change', (e) => {
                    const newRate = parseInt(e.target.value);
                    if (!isNaN(newRate) && newRate >= 0 && newRate <= 100) {
                        this.ncLossRates[`nc${ncNum}`] = newRate;
                    }
                });
            }
        }
    }

    // Initialize all NC displays
    async initializeNCDisplays() {
        try {
            await this.environmentDB.ready;
            for (let ncNum = 1; ncNum <= 3; ncNum++) {
                await this.updateNCDisplay(ncNum);
            }
        } catch (error) {
            console.error('Error initializing NC displays:', error);
        }
    }

    // Update a single NC display
    async updateNCDisplay(ncNum) {
        try {
            const symbols = await this.environmentDB.getStateUpdateNCSymbols(ncNum);
            
            const totalSymbols = symbols.length;
            const byteSymbols = symbols.filter(s => s.type === 'byte').length;
            const entropySymbols = symbols.filter(s => s.type === 'entropy').length;

            console.log(`NC${ncNum} Display Update:`, {
                total: totalSymbols,
                bytes: byteSymbols,
                entropy: entropySymbols
            });

            // Update displays
            const totalDisplay = document.getElementById(`nc${ncNum}-d`);
            const byteDisplay = document.getElementById(`nc${ncNum}-b`);
            const entropyDisplay = document.getElementById(`nc${ncNum}-e`);

            if (totalDisplay) totalDisplay.value = totalSymbols;
            if (byteDisplay) byteDisplay.value = byteSymbols;
            if (entropyDisplay) entropyDisplay.value = entropySymbols;

        } catch (error) {
            console.error(`Error updating NC${ncNum} display:`, error);
            throw error;
        }
    }

    // Add new method to handle NC updates
    setupNCUpdateListeners() {
        // Listen for stateUpdateNC store changes
        window.addEventListener('stateUpdateNCUpdated', async (event) => {
            const { nc, action, data } = event.detail;
            try {
                if (action === 'add') {
                    // Update NC length based on symbol type
                    const delta = data.type === 'byte' ? -1 : 1;  // -1 for byte, +1 for entropy
                    await this.updateNCLength(nc, delta);
                }
            } catch (error) {
                console.error('Error handling NC update:', error);
            }
        });
    }

    // Method to update NC length
    async updateNCLength(ncNumber, delta) {
        try {
            // Get current length from dashboard
            const currentLength = parseFloat(document.getElementById(`channel-${ncNumber}`).value);
            
            // Calculate new length
            const newLength = Math.max(1, currentLength + delta); // Prevent length < 1
            
            console.log(`Updating NC${ncNumber}:`, {
                current: currentLength,
                delta: delta,
                new: newLength
            });

            // Update triangle system with new length
            await this.triangleSystem.updateNCLength(ncNumber, newLength);
            
        } catch (error) {
            console.error(`Error updating NC${ncNumber} length:`, error);
            throw error;
        }
    }

    setupRunButton() {
        const runButton = document.getElementById('stateRunButton');
        const resetButton = document.getElementById('resetRunButton');
        
        if (runButton) {
            runButton.addEventListener('click', async () => {
                if (this.runInterval) {
                    runButton.classList.remove('active');
                    this.stopRun();
                } else {
                    runButton.classList.add('active');
                    await this.startRun();
                }
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetRunCounts();
            });
        }
    }

    resetRunCounts() {
        // Reset counters
        this.runCounts = {
            nc1: 0,
            nc2: 0,
            nc3: 0
        };

        // Update displays
        for (let ncNum = 1; ncNum <= 3; ncNum++) {
            const countDisplay = document.getElementById(`nc${ncNum}-run-count`);
            if (countDisplay) countDisplay.value = '0';
        }
    }

    updateRunCount(ncNum) {
        this.runCounts[`nc${ncNum}`]++;
        const countDisplay = document.getElementById(`nc${ncNum}-run-count`);
        if (countDisplay) {
            countDisplay.value = this.runCounts[`nc${ncNum}`].toString();
        }
    }

    async startRun() {
        if (this.runInterval) return;

        console.log('Starting state run process');
        await this.logNCState('Initial'); // Log initial state
        let lastProcessTime = Date.now();

        this.runInterval = setInterval(async () => {
            try {
                const currentTime = Date.now();
                const elapsedTime = (currentTime - lastProcessTime) / 1000;
                lastProcessTime = currentTime;

                let allEmpty = true;

                // Process each NC
                for (let ncNum = 1; ncNum <= 3; ncNum++) {
                    // Skip if rate is 0
                    if (this.runRates[`nc${ncNum}`] === 0) {
                        console.log(`NC${ncNum} skipped - rate is 0`);
                        continue;
                    }

                    // Get symbols for this NC
                    const symbols = await this.environmentDB.getStateUpdateNCSymbols(ncNum);
                    if (symbols.length > 0) allEmpty = false;

                    // Calculate how many symbols to process this cycle
                    const symbolsToProcess = Math.floor(this.runRates[`nc${ncNum}`] * elapsedTime);

                    if (symbolsToProcess < 1) {
                        console.log(`NC${ncNum} skipped - symbolsToProcess < 1`);
                        continue;
                    }

                    // Process symbols
                    for (let i = 0; i < Math.min(symbolsToProcess, symbols.length); i++) {
                        const symbol = symbols[i];
                        const delta = symbol.type === 'byte' ? -1 : 1;
                        
                        console.log(`Processing symbol for NC${ncNum}:`, {
                            type: symbol.type,
                            delta,
                            symbolIndex: i
                        });

                        // Log state before update
                        await this.logNCState(`Before NC${ncNum} Update`);

                        // Update NC length
                        await this.updateNCLength(ncNum, delta);
                        await this.environmentDB.deleteStateUpdateNCSymbol(ncNum, symbol.id);
                        this.updateRunCount(ncNum);

                        // Log state after update
                        await this.logNCState(`After NC${ncNum} Update`);
                    }
                }

                // If all NCs are empty, stop the run
                if (allEmpty) {
                    console.log('All NC stores empty, stopping run');
                    await this.logNCState('Final'); // Log final state
                    this.stopRun();
                    document.getElementById('stateRunButton').classList.remove('active');
                }

            } catch (error) {
                console.error('Error in run cycle:', error);
            }
        }, 1000);
    }

    stopRun() {
        if (this.runInterval) {
            clearInterval(this.runInterval);
            this.runInterval = null;
            console.log('State run stopped');
        }
    }

    initializeRunControls() {
        // Main run rate control
        const runRateInput = document.getElementById('run-rate');
        if (runRateInput) {
            runRateInput.addEventListener('change', (e) => {
                const newRate = parseInt(e.target.value);
                if (!isNaN(newRate) && newRate >= 0) {
                    // Update all NC run rates to match main rate
                    this.runRates.nc1 = newRate;
                    this.runRates.nc2 = newRate;
                    this.runRates.nc3 = newRate;
                    
                    // Update NC run rate inputs
                    for (let ncNum = 1; ncNum <= 3; ncNum++) {
                        const input = document.getElementById(`nc${ncNum}-run-rate`);
                        if (input) input.value = newRate;
                    }
                }
            });
        }

        // Individual NC run rate controls
        for (let ncNum = 1; ncNum <= 3; ncNum++) {
            const input = document.getElementById(`nc${ncNum}-run-rate`);
            if (input) {
                input.addEventListener('change', (e) => {
                    const newRate = parseInt(e.target.value);
                    if (!isNaN(newRate) && newRate >= 0) {
                        this.runRates[`nc${ncNum}`] = newRate;
                    }
                });
            }
        }
    }

    async logNCState(context = 'Current') {
        try {
            // Get current NC lengths from the dashboard
            const nc1Length = document.getElementById('channel-1').value;
            const nc2Length = document.getElementById('channel-2').value;
            const nc3Length = document.getElementById('channel-3').value;

            // Get available symbols for each NC
            const nc1Symbols = await this.environmentDB.getStateUpdateNCSymbols(1);
            const nc2Symbols = await this.environmentDB.getStateUpdateNCSymbols(2);
            const nc3Symbols = await this.environmentDB.getStateUpdateNCSymbols(3);

            console.log(`${context} NC State:`, {
                nc1: {
                    length: nc1Length,
                    availableSymbols: {
                        total: nc1Symbols.length,
                        bytes: nc1Symbols.filter(s => s.type === 'byte').length,
                        entropy: nc1Symbols.filter(s => s.type === 'entropy').length
                    }
                },
                nc2: {
                    length: nc2Length,
                    availableSymbols: {
                        total: nc2Symbols.length,
                        bytes: nc2Symbols.filter(s => s.type === 'byte').length,
                        entropy: nc2Symbols.filter(s => s.type === 'entropy').length
                    }
                },
                nc3: {
                    length: nc3Length,
                    availableSymbols: {
                        total: nc3Symbols.length,
                        bytes: nc3Symbols.filter(s => s.type === 'byte').length,
                        entropy: nc3Symbols.filter(s => s.type === 'entropy').length
                    }
                }
            });
        } catch (error) {
            console.error('Error logging NC state:', error);
        }
    }
} 