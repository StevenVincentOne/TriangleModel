import { environmentDB } from '../shared/ui/database.js';

export class CapacityModule {
    constructor(circleMetrics) {
        console.log('Initializing CapacityModule');
        this.metrics = circleMetrics;
        this.symbolPool = {
            bits: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
                'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '∅'],
            noise: ['α', 'β', 'ς', 'δ', 'ε', 'φ', 'γ', 'η', 'ι', 'ξ',
                'κ', 'λ', 'μ', 'ν', 'ο', 'π', 'ϱ', 'ρ', 'σ',
                'τ', 'υ', 'ϑ', 'ω', 'χ', 'ψ', 'ζ', 'θ']
        };
        this.environmentDB = environmentDB;
        this.currentDashboardData = null;
        
        // Get reference to triangle system
        this.triangleSystem = this.metrics.triangleSystem;
        
        // Initialize with current metrics
        const initialMetrics = this.metrics.calculateExternalRegions();
        if (initialMetrics) {
            this.updateUtilizationPercentages(initialMetrics);
        }

        // Ensure randomize checkbox starts checked
        const randomizeCheckbox = document.getElementById('randomize-data');
        if (randomizeCheckbox) {
            randomizeCheckbox.checked = true;
        }
    }

    async init() {
        try {
            console.log('Initializing CapacityModule database');
            await this.environmentDB.initDatabase();
            console.log('CapacityModule database initialized');
        } catch (error) {
            console.error('Error initializing CapacityModule:', error);
        }
    }

    setupPercentageControls() {
        const ebPercentInput = document.getElementById('eb-percent');
        const enPercentInput = document.getElementById('en-percent');
        
        if (ebPercentInput && enPercentInput) {
            // Initialize stored percentages if not already set
            if (!this.storedPercentages) {
                this.storedPercentages = {
                    eb: 50,
                    en: 50
                };
            }
            
            // Ensure both inputs show initial values
            ebPercentInput.value = this.storedPercentages.eb;
            enPercentInput.value = this.storedPercentages.en;
            
            const validateAndUpdatePercentages = (primaryValue, primaryInput, complementaryInput, isPrimaryEB = true) => {
                // Ensure value is between 0 and 100
                let percent = parseInt(primaryValue) || 0;
                percent = Math.min(Math.max(percent, 0), 100);
                
                const complementaryPercent = 100 - percent;
                
                // Update stored values first
                if (isPrimaryEB) {
                    this.storedPercentages.eb = percent;
                    this.storedPercentages.en = complementaryPercent;
                } else {
                    this.storedPercentages.en = percent;
                    this.storedPercentages.eb = complementaryPercent;
                }
                
                // Update input values
                primaryInput.value = percent;
                complementaryInput.value = complementaryPercent;
                
                // Update dashboard data
                if (this.currentDashboardData) {
                    this.currentDashboardData.ebPercent = this.storedPercentages.eb;
                    this.currentDashboardData.enPercent = this.storedPercentages.en;
                }
                
                this.updateBitsNoiseDistribution();
            };

            // Handle real-time input validation and updates
            ebPercentInput.addEventListener('input', (e) => {
                validateAndUpdatePercentages(e.target.value, ebPercentInput, enPercentInput, true);
            });

            enPercentInput.addEventListener('input', (e) => {
                validateAndUpdatePercentages(e.target.value, enPercentInput, ebPercentInput, false);
            });

            // Also handle blur events to ensure valid values
            ebPercentInput.addEventListener('blur', (e) => {
                validateAndUpdatePercentages(e.target.value, ebPercentInput, enPercentInput, true);
            });

            enPercentInput.addEventListener('blur', (e) => {
                validateAndUpdatePercentages(e.target.value, enPercentInput, ebPercentInput, false);
            });
        }
    }

    updateBitsNoiseDistribution(forced = false) {
        const edInput = document.getElementById('system-ed');
        const ebInput = document.getElementById('system-eb');
        const enInput = document.getElementById('system-en');
        const ebPercentInput = document.getElementById('eb-percent');
        const enPercentInput = document.getElementById('en-percent');
        
        if (edInput && ebInput && enInput && ebPercentInput && enPercentInput) {
            const edValue = parseFloat(edInput.value) || 0;
            
            // Always use stored percentages for consistency
            const ebPercent = this.storedPercentages.eb;
            const enPercent = this.storedPercentages.en;
            
            console.log('Distribution calculation:', {
                edValue,
                ebPercent,
                enPercent,
                forced,
                storedPercentages: this.storedPercentages
            });
            
            // Calculate values
            const ebValue = Math.round(edValue * (ebPercent / 100));
            const enValue = edValue - ebValue; // Ensure total equals edValue
            
            // Update displays
            ebInput.value = ebValue;
            enInput.value = enValue;
            
            // Always update percentage displays to match stored values
            ebPercentInput.value = ebPercent;
            enPercentInput.value = enPercent;

            if (this.currentDashboardData) {
                this.currentDashboardData.bitsCount = ebValue;
                this.currentDashboardData.noiseCount = enValue;
                this.currentDashboardData.ebPercent = ebPercent;
                this.currentDashboardData.enPercent = enPercent;
            }
        }
    }

    generateSymbols(type, count) {
        const symbols = this.symbolPool[type];
        if (!symbols) {
            console.error(`Invalid symbol type: ${type}`);
            return [];
        }

        const result = [];
        // Fix the default value to true and properly get checkbox state
        const randomizeCheckbox = document.getElementById('randomize-data');
        const randomize = randomizeCheckbox ? randomizeCheckbox.checked : true;

        console.log('Generating symbols:', {
            type,
            count,
            randomize,
            availableSymbols: symbols
        });

        if (randomize) {
            // Random distribution
            for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * symbols.length);
                result.push(symbols[randomIndex]);
            }
        } else {
            // Uniform/alphabetical distribution
            let currentIndex = 0;
            for (let i = 0; i < count; i++) {
                result.push(symbols[currentIndex]);
                currentIndex = (currentIndex + 1) % symbols.length; // Wrap around to start
            }
        }

        console.log('Generated symbols:', {
            requestedCount: count,
            actualCount: result.length,
            sample: result.slice(0, 10),
            distribution: randomize ? 'random' : 'uniform'
        });

        return result;
    }

    async initializeSystemData() {
        try {
            console.log('Starting system data initialization');
            
            await this.environmentDB.ready;
            console.log('Database ready for initialization');

            const metrics = this.metrics.calculateExternalRegions();
            if (!metrics) {
                throw new Error('No metrics available');
            }

            // Get and preserve current percentages
            const edPercentInput = document.getElementById('ed-percent');
            const ebPercentInput = document.getElementById('eb-percent');
            const enPercentInput = document.getElementById('en-percent');
            
            // Get current percentages, preserving existing values
            const edPercent = edPercentInput ? parseInt(edPercentInput.value) : 50;
            const ebPercent = ebPercentInput ? parseInt(ebPercentInput.value) : 50;
            const enPercent = enPercentInput ? parseInt(enPercentInput.value) : 50;
            
            console.log('Using percentages:', { edPercent, ebPercent, enPercent });
            
            // Calculate capacities
            const totalCapacity = metrics.totalExternal;
            const usedCapacity = Math.floor(totalCapacity * (edPercent / 100));

            // Calculate counts using preserved percentages
            const bitsCount = Math.floor(usedCapacity * (ebPercent / 100));
            const noiseCount = usedCapacity - bitsCount; // Ensure total equals usedCapacity

            const dashboardData = {
                edPercent,
                ebPercent,
                enPercent,
                totalCapacity,
                usedCapacity,
                bitsCount,
                noiseCount,
                cc1: metrics.cc1,
                cc2: metrics.cc2,
                cc3: metrics.cc3
            };

            // Store dashboard data
            this.currentDashboardData = dashboardData;
            
            // Update UI without overwriting percentages
            this.updateDashboard(dashboardData, true);

            console.log('Generating symbol pools with counts:', { bitsCount, noiseCount });

            // Use generateSymbols method instead of direct random generation
            const bitsPool = this.generateSymbols('bits', bitsCount);
            const noisePool = this.generateSymbols('noise', noiseCount);

            const poolData = {
                bits: bitsPool,
                noise: noisePool
            };

            console.log('Generated pools:', {
                bitsLength: bitsPool.length,
                noiseLength: noisePool.length,
                sampleBits: bitsPool.slice(0, 10),
                sampleNoise: noisePool.slice(0, 10),
                randomized: document.getElementById('randomize-data')?.checked
            });

            // Store in database
            console.log('Storing pools in database');
            await this.environmentDB.storeEnvironmentalPool(poolData);
            console.log('Pools stored successfully');

            return {
                bits: bitsPool,
                noise: noisePool,
                metrics: dashboardData
            };

        } catch (error) {
            console.error('Error in initializeSystemData:', error);
            throw error;
        }
    }

    updateDashboard(data, preservePercentages = false) {
        if (!data) return;

        // Update ED value
        const edElement = document.getElementById('system-ed');
        if (edElement) {
            edElement.value = Math.round(data.usedCapacity || 0);
        }

        // Update EB value
        const ebElement = document.getElementById('system-eb');
        if (ebElement) {
            ebElement.value = Math.round(data.bitsCount || 0);
        }

        // Update EN value
        const enElement = document.getElementById('system-en');
        if (enElement) {
            enElement.value = Math.round(data.noiseCount || 0);
        }

        // Update percentages only if not preserving current values
        if (!preservePercentages) {
            const ebPercentElement = document.getElementById('eb-percent');
            const enPercentElement = document.getElementById('en-percent');
            
            if (ebPercentElement && enPercentElement) {
                // Use stored percentages instead of data values
                ebPercentElement.value = this.storedPercentages?.eb || data.ebPercent || 0;
                enPercentElement.value = this.storedPercentages?.en || data.enPercent || 0;
            }
        }
    }

    // Add method to get current dashboard data
    getCurrentDashboardData() {
        return this.currentDashboardData;
    }


    updateUtilizationPercentages(metrics) {
        
        
        if (!metrics) {
            
            return;
        }

        // Get current ED value
        const edElement = document.getElementById('system-ed');
        const currentED = edElement ? parseFloat(edElement.value) : 0;
        
        

        if (metrics.totalExternal === 0) {
            console.warn('CapacityModule: totalExternal is 0, cannot calculate utilization.');
            return;
        }

        // Calculate new utilization based on current ED and capacity
        const ccuPercent = (currentED / metrics.totalExternal) * 100;
        const usedPerCC = currentED / 3; // Even distribution across CC1/2/3
        
        const ccu1Percent = (usedPerCC / metrics.cc1) * 100;
        const ccu2Percent = (usedPerCC / metrics.cc2) * 100;
        const ccu3Percent = (usedPerCC / metrics.cc3) * 100;

        

        // Update CCU displays with null checks and 2 decimal places
        const updateUtilization = (elementId, value) => {
            const element = document.getElementById(elementId);
            if (element) {
                const formattedValue = value.toFixed(2); // Ensure two decimal places
                
                element.value = `${formattedValue}%`;
                
            } else {
                
            }
        };

        updateUtilization('circumcircle-utilization', ccuPercent);
        updateUtilization('cc1-utilization', ccu1Percent);
        updateUtilization('cc2-utilization', ccu2Percent);
        updateUtilization('cc3-utilization', ccu3Percent);

        
    }
} 