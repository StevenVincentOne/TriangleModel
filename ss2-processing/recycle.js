export class RecycleModule {
    constructor(environmentDB) {
        this.environmentDB = environmentDB;
        this.recycleInterval = null;
        this.isRecycling = false;
        this.setupRecyclingControls();
        
        // Add store change listener
        window.addEventListener('storeChanged', async (event) => {
            if (event.detail.store === 'filteredNoise' || 
                event.detail.store === 'environmentalPool') {
                await this.updateDisplays();
            }
        });
    }

    setupRecyclingControls() {
        const recycleButton = document.getElementById('recycleNoiseButton');
        if (recycleButton) {
            recycleButton.addEventListener('click', () => this.handleRecycleButtonClick());
        }

        // Improve rate input listener
        const rateInput = document.getElementById('noise-recycle-rate');
        if (rateInput) {
            rateInput.addEventListener('input', () => {
                const newRate = parseInt(rateInput.value) || 10;
                console.log('Recycle rate changed:', newRate);
                
                // Restart recycling if active
                if (this.isRecycling) {
                    this.stopRecycling();
                    this.startRecycling();
                }
            });
        }
    }

    async handleRecycleButtonClick() {
        console.log('Recycle button clicked, current state:', this.isRecycling);
        if (this.isRecycling) {
            this.stopRecycling();
        } else {
            this.startRecycling();
        }
    }

    async updateDisplays() {
        try {
            // Update CN (filtered noise) display
            const filteredNoiseCount = await this.environmentDB.getFilteredNoiseCount();
            const cnInput = document.getElementById('convert-step-n');
            if (cnInput) {
                cnInput.value = filteredNoiseCount;
            }

            // Update ED/EN (environmental) displays
            const envPool = await this.environmentDB.getEnvironmentalPool();
            if (envPool && envPool[0]) {
                const edInput = document.getElementById('environment-d');
                const enInput = document.getElementById('environment-n');
                if (edInput) {
                    edInput.value = envPool[0].bits.length;
                }
                if (enInput) {
                    enInput.value = envPool[0].noise.length;
                }
            }
        } catch (error) {
            console.error('Error updating displays:', error);
        }
    }

    async startRecycling() {
        if (this.isRecycling) return;
        
        console.log('Starting recycling process');
        this.isRecycling = true;
        
        // Update button state
        const recycleButton = document.getElementById('recycleNoiseButton');
        if (recycleButton) {
            recycleButton.classList.add('active');
        }

        const recycleRateInput = document.getElementById('noise-recycle-rate');
        const symbolsPerSecond = parseInt(recycleRateInput?.value) || 10;
        const intervalMs = 1000 / symbolsPerSecond;

        this.recycleInterval = setInterval(async () => {
            try {
                // Get filtered noise symbols
                const filteredNoise = await this.environmentDB.getFilteredNoise();
                
                if (!filteredNoise || filteredNoise.length === 0) {
                    return; // No noise to recycle
                }

                // Get current environmental pool first
                const envPool = await this.environmentDB.getEnvironmentalPool();
                let currentPool = envPool[0] || { bits: [], noise: [] };

                // Process one symbol at a time based on rate
                const noiseSymbol = filteredNoise[0];
                if (noiseSymbol && noiseSymbol.count > 0) {
                    // Add noise symbol back to environmental pool
                currentPool.noise.push(noiseSymbol.symbol);

                // Update environmental pool
                if (envPool[0]) {
                    await this.environmentDB.updateEnvironmentalPool(currentPool.id, currentPool);
                } else {
                    await this.environmentDB.storeEnvironmentalPool(currentPool);
                }

                    // Remove from filtered noise
                await this.environmentDB.deleteFilteredNoise(noiseSymbol.id);

                console.log('Recycled noise symbol:', {
                    symbol: noiseSymbol.symbol,
                        count: noiseSymbol.count,
                        envNoiseCount: currentPool.noise.length
                });

                // Trigger store updates
                window.dispatchEvent(new CustomEvent('storeChanged', { 
                    detail: { 
                            store: 'environmentalPool',
                            action: 'update'
                    }
                }));
                }

            } catch (error) {
                console.error('Error in recycling process:', error);
            }
        }, intervalMs);
    }

    stopRecycling() {
        console.log('Stopping recycling process');
        if (this.recycleInterval) {
            clearInterval(this.recycleInterval);
            this.recycleInterval = null;
        }
        this.isRecycling = false;
        
        // Update button state
        const recycleButton = document.getElementById('recycleNoiseButton');
        if (recycleButton) {
            recycleButton.classList.remove('active');
        }
    }
}
