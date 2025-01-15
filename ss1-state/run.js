import { LossFunction, NodeChannelEntropy } from '../ss2-processing/data-processing.js';
import { environmentDB } from '../shared/ui/database.js';
import { StateCapacity } from './state-capacity.js';

export class Run {
    constructor(environmentDB, triangleSystem) {
        this.environmentDB = environmentDB;
        this.triangleSystem = triangleSystem;
        this.runInterval = null;
        this.isRunning = false;

        // Run rates for each NC
        this.runRates = {
            nc1: 10,
            nc2: 10,
            nc3: 10
        };

        // Run counts
        this.runCounts = {
            nc1: 0,
            nc2: 0,
            nc3: 0
        };

        this.initializeControls();
    }

    initializeControls() {
        this.setupRunButton();
        this.initializeRunControls();
    }

    setupRunButton() {
        const runButton = document.getElementById('stateRunButton');
        if (runButton) {
            // Remove any existing listeners
            const newButton = runButton.cloneNode(true);
            runButton.parentNode.replaceChild(newButton, runButton);
            
            // Add new click listener with debounce
            let isProcessing = false;
            newButton.addEventListener('click', async () => {
                if (isProcessing) return;
                
                try {
                    isProcessing = true;
                    this.isRunning = !this.isRunning;

                    if (this.isRunning) {
                        newButton.classList.add('active');
                        await this.startRun();
                    } else {
                        newButton.classList.remove('active');
                        this.stopRun();
                    }
                } catch (error) {
                    console.error('Error in run button click:', error);
                    this.isRunning = false;
                    newButton.classList.remove('active');
                    this.stopRun();
                } finally {
                    isProcessing = false;
                }
            });
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

    async startRun() {
        if (this.runInterval) return;

        console.log('Starting state run process');
        await this.logNCState('Initial');
        let lastProcessTime = Date.now();

        // Reset run counts when starting new run
        this.runCounts = {
            nc1: 0,
            nc2: 0,
            nc3: 0
        };

        // Update displays
        for (let ncNum = 1; ncNum <= 3; ncNum++) {
            const countDisplay = document.getElementById(`nc${ncNum}-run-count`);
            if (countDisplay) {
                countDisplay.value = '0';
            }
        }

        this.runInterval = setInterval(async () => {
            try {
                const currentTime = Date.now();
                const elapsedTime = (currentTime - lastProcessTime) / 1000;
                lastProcessTime = currentTime;

                let allProcessed = true;

                // Process each NC
                for (let ncNum = 1; ncNum <= 3; ncNum++) {
                    if (this.runRates[`nc${ncNum}`] === 0) {
                        console.log(`NC${ncNum} skipped - rate is 0`);
                        continue;
                    }

                    const symbols = await this.environmentDB.getStateUpdateNCSymbols(ncNum);
                    const ncDisplay = document.getElementById(`nc${ncNum}-d`);
                    const totalSymbols = parseInt(ncDisplay?.value || '0');
                    const processedSymbols = this.runCounts[`nc${ncNum}`];

                    // Check if this NC still has symbols to process
                    if (processedSymbols < totalSymbols) {
                        allProcessed = false;

                        const symbolsToProcess = Math.floor(this.runRates[`nc${ncNum}`] * elapsedTime);
                        if (symbolsToProcess < 1) {
                            console.log(`NC${ncNum} skipped - symbolsToProcess < 1`);
                            continue;
                        }

                        // Process up to symbolsToProcess symbols or remaining symbols
                        const remainingSymbols = totalSymbols - processedSymbols;
                        const toProcess = Math.min(symbolsToProcess, remainingSymbols);

                        for (let i = 0; i < toProcess && i < symbols.length; i++) {
                            const symbol = symbols[i];
                            const delta = symbol.type === 'byte' ? -1 : 1;
                            
                            console.log(`Processing symbol for NC${ncNum}:`, {
                                type: symbol.type,
                                delta,
                                symbolIndex: i,
                                processed: processedSymbols + i + 1,
                                total: totalSymbols
                            });

                            await this.logNCState(`Before NC${ncNum} Update`);
                            await this.updateNCLength(ncNum, delta);
                            this.updateRunCount(ncNum);
                            await this.logNCState(`After NC${ncNum} Update`);
                        }
                    }
                }

                if (allProcessed) {
                    console.log('All symbols processed, stopping run');
                    await this.logNCState('Final');
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

    updateRunCount(ncNum) {
        this.runCounts[`nc${ncNum}`]++;
        const countDisplay = document.getElementById(`nc${ncNum}-run-count`);
        if (countDisplay) {
            countDisplay.value = this.runCounts[`nc${ncNum}`].toString();
        }
    }

    async updateNCLength(ncNumber, delta) {
        try {
            const currentLength = parseFloat(document.getElementById(`channel-${ncNumber}`).value);
            const newLength = Math.max(1, currentLength + delta);
            
            console.log(`Updating NC${ncNumber}:`, {
                current: currentLength,
                delta: delta,
                new: newLength
            });

            await this.triangleSystem.updateNCLength(ncNumber, newLength);
            
        } catch (error) {
            console.error(`Error updating NC${ncNumber} length:`, error);
            throw error;
        }
    }

    async logNCState(context = 'Current') {
        try {
            const nc1Length = document.getElementById('channel-1').value;
            const nc2Length = document.getElementById('channel-2').value;
            const nc3Length = document.getElementById('channel-3').value;

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