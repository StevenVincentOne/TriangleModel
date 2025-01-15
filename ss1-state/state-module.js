import { LossFunction, NodeChannelEntropy } from '../ss2-processing/data-processing.js';
import { environmentDB } from '../shared/ui/database.js';
import { StateCapacity } from './state-capacity.js';
import { Intake } from './intake.js';
import { Run } from './run.js';

export class StateModule {
    constructor(triangleSystem) {
        this.triangleSystem = triangleSystem;
        
        this.stateCapacity = new StateCapacity(triangleSystem);
        
        // Add reference to environmentDB
        this.environmentDB = environmentDB;
        
        // Initialize Intake system
        this.intake = new Intake(this.environmentDB, this.stateCapacity);

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

        // Add NC rates and distributions
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

        // Initialize NC controls and displays
        this.initializeNCControls();
        this.initializeNCDisplays();

        // Initialize update interval
        this.updateInterval = null;

        // Set up update button
        this.setupUpdateButton();

        // Initial state display update with retry
        this.initializeStateDisplays();

        // Set up NC update listeners
        this.setupNCUpdateListeners();

        // Initialize Run system
        this.run = new Run(this.environmentDB, triangleSystem);
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

    async initializeStateDisplays() {
        const maxRetries = 3;
        let retries = 0;
        
        const tryUpdate = async () => {
            try {
                await this.environmentDB.ready; // Wait for DB initialization
                await this.intake.updateStateDisplays();
                this.setupStateMonitoring(); // Set up continuous monitoring after initial display
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
                await this.intake.updateStateDisplays();
            } catch (error) {
                console.error('Error in state monitoring:', error);
            }
        }, 100);
    }

    setupUpdateButton() {
        const updateButton = document.getElementById('stateUpdateButton');
        console.log('Setting up Update button:', {
            buttonFound: !!updateButton,
            buttonElement: updateButton
        });
        
        if (updateButton) {
            updateButton.addEventListener('click', async () => {
                console.log('Update button clicked, current state:', {
                    hasInterval: !!this.updateInterval
                });
                
                if (this.updateInterval) {
                    console.log('Stopping update process');
                    updateButton.classList.remove('active');
                    this.stopUpdate();
                    // Update displays one final time when stopping
                    await this.updateNCDisplays();
                } else {
                    console.log('Starting update process');
                    updateButton.classList.add('active');
                    await this.startUpdate();
                }
            });
        } else {
            console.warn('Update button not found in DOM');
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
                        ss1: stateIntakeSymbols.filter(s => s.subsystem === 'ss1').length,
                        ss2: stateIntakeSymbols.filter(s => s.subsystem === 'ss2').length,
                        ss3: stateIntakeSymbols.filter(s => s.subsystem === 'ss3').length
                    },
                    byType: {
                        bytes: stateIntakeSymbols.filter(s => s.type === 'byte').length,
                        entropy: stateIntakeSymbols.filter(s => s.type === 'entropy').length
                    }
                });
                
                // Process symbols for each NC
                for (let ncNum = 1; ncNum <= 3; ncNum++) {
                    const subsystem = `ss${ncNum}`;
                    // Get symbols for this NC based on subsystem
                    const ncSymbols = stateIntakeSymbols.filter(s => s.subsystem === subsystem);
                    
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
                            subsystem: `ss${ncNum}`
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
                            subsystem: `ss${ncNum}`
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
            
            // Remove active class from update button
            const updateButton = document.getElementById('stateUpdateButton');
            if (updateButton) {
                updateButton.classList.remove('active');
            }
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
                    // Only update displays during Update workflow
                    await this.updateNCDisplay(nc);
                } else if (action === 'clear' || action === 'delete') {
                    // Update displays when stores are cleared or symbols are removed
                    await this.updateNCDisplay(nc);
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
}