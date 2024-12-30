import { environmentDB } from '../shared/ui/database.js';

export class DataConversion {
    constructor(environmentDB, intelligenceModule) {
        this.environmentDB = environmentDB;
        this.intelligenceModule = intelligenceModule;
        this.isConverting = false;
        this.conversionInterval = null;
        
        this.initializeControls();
    }

    initializeControls() {
        // Get the Convert Data button (previously letterFlowToggle)
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
    }

    async startConversion() {
        if (this.isConverting) return;
        console.log('Starting data conversion from Processing Pool...');
        this.isConverting = true;
        
        this.conversionInterval = setInterval(async () => {
            try {
                const processedSymbols = await this.environmentDB.getProcessedSymbols();
                console.log('Retrieved symbols from Processing Pool:', processedSymbols);

                if (processedSymbols && processedSymbols.length > 0) {
                    console.log('Processing symbols:', processedSymbols.length);
                    
                    // Process each symbol
                    for (const symbolData of processedSymbols) {
                        console.log('Converting symbol:', symbolData);
                        
                        // Process through intelligence module
                        await this.intelligenceModule.processLetter(symbolData.symbol);
                        
                        // Store in converted store
                        try {
                            const convertedData = {
                                symbol: symbolData.symbol,
                                type: symbolData.type,
                                timestamp: Date.now()
                            };
                            console.log('Attempting to store converted symbol:', convertedData);
                            await this.environmentDB.storeConvertedSymbol(convertedData);
                            console.log('Successfully stored converted symbol');
                        } catch (error) {
                            console.error('Error storing converted symbol:', error);
                        }
                    }

                    // Verify storage
                    const convertedSymbols = await this.environmentDB.getConvertedSymbols();
                    console.log('Current converted symbols in store:', convertedSymbols);
                } else {
                    console.log('No symbols found in Processing Pool');
                }
            } catch (error) {
                console.error('Error in conversion process:', error);
            }
        }, 1000);
    }

    stopConversion() {
        this.isConverting = false;
        if (this.conversionInterval) {
            clearInterval(this.conversionInterval);
            this.conversionInterval = null;
        }
    }
}
