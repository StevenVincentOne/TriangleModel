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

        // Add event listener for EB percent changes
        const ebPercentInput = document.getElementById('eb-percent');
        const enPercentInput = document.getElementById('en-percent');
        
        if (ebPercentInput && enPercentInput) {
            ebPercentInput.addEventListener('input', () => {
                const ebPercent = Math.min(Math.max(parseInt(ebPercentInput.value) || 0, 0), 100);
                ebPercentInput.value = ebPercent;
                enPercentInput.value = 100 - ebPercent;
                this.updateBitsNoiseDistribution();
            });

            enPercentInput.addEventListener('input', () => {
                const enPercent = Math.min(Math.max(parseInt(enPercentInput.value) || 0, 0), 100);
                enPercentInput.value = enPercent;
                ebPercentInput.value = 100 - enPercent;
                this.updateBitsNoiseDistribution();
            });
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
        // Handle EB percentage changes
        document.getElementById('eb-percent')?.addEventListener('input', (e) => {
            const ebPercent = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
            const enPercent = 100 - ebPercent;
            
            // Update EN percentage input
            const enInput = document.getElementById('en-percent');
            if (enInput) {
                enInput.value = enPercent;
            }
            
            // If we have current ED value, update EB/EN values
            this.updateBitsNoiseDistribution();
        });
    }

    updateBitsNoiseDistribution() {
        const edInput = document.getElementById('system-ed');
        const ebInput = document.getElementById('system-eb');
        const enInput = document.getElementById('system-en');
        const ebPercentInput = document.getElementById('eb-percent');
        
        if (edInput && ebInput && enInput && ebPercentInput) {
            const edValue = parseFloat(edInput.value) || 0;
            const ebPercent = parseInt(ebPercentInput.value) || 0;
            
            const ebValue = Math.round(edValue * (ebPercent / 100));
            const enValue = Math.round(edValue * ((100 - ebPercent) / 100));
            
            ebInput.value = ebValue;
            enInput.value = enValue;
        }
    }

    generateSymbols(type, count) {
        const symbols = this.symbolPool[type];
        if (!symbols) {
            console.error(`Invalid symbol type: ${type}`);
            return [];
        }

        const result = [];
        const randomize = document.getElementById('randomize-data')?.checked ?? true;

        if (randomize) {
            // Random distribution
            for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * symbols.length);
                result.push(symbols[randomIndex]);
            }
        } else {
            // Uniform distribution
            const symbolCount = Math.floor(count / symbols.length);
            const remainder = count % symbols.length;
            
            // Add equal amounts of each symbol
            symbols.forEach(symbol => {
                for (let i = 0; i < symbolCount; i++) {
                    result.push(symbol);
                }
            });
            
            // Add remaining symbols to reach exact count
            for (let i = 0; i < remainder; i++) {
                result.push(symbols[i]);
            }
        }

        return result;
    }

    async initializeSystemData() {
        try {
            console.log('Starting system data initialization');
            
            // Wait for database to be ready
            await this.environmentDB.ready;
            console.log('Database ready for initialization');

            const metrics = this.metrics.calculateExternalRegions();
            if (!metrics) {
                throw new Error('No metrics available');
            }

            // Get ED percentage from input
            const edPercentInput = document.getElementById('ed-percent');
            const edPercent = edPercentInput ? (parseInt(edPercentInput.value) || 50) : 50;
            
            // Calculate total capacity and used capacity based on ED%
            const totalCapacity = metrics.totalExternal;
            const usedCapacity = totalCapacity * (edPercent / 100);

            // Get EB/EN distribution percentages
            const ebPercentInput = document.getElementById('eb-percent');
            const ebPercent = ebPercentInput ? (parseInt(ebPercentInput.value) || 50) : 50;
            
            // Calculate counts for bits and noise
            const bitsCount = Math.floor(usedCapacity * (ebPercent / 100));
            const noiseCount = Math.floor(usedCapacity * ((100 - ebPercent) / 100));

            const dashboardData = {
                edPercent,
                ebPercent,
                totalCapacity,
                usedCapacity,
                bitsCount,
                noiseCount,
                cc1: metrics.cc1,
                cc2: metrics.cc2,
                cc3: metrics.cc3
            };

            // Store dashboard data in instance variable
            this.currentDashboardData = dashboardData;

            // Update UI with calculated values
            this.updateDashboard(dashboardData);

            console.log('Generating symbol pools with counts:', { bitsCount, noiseCount });

            // Generate actual symbol arrays
            const bitsPool = Array.from({ length: bitsCount }, () => 
                this.symbolPool.bits[Math.floor(Math.random() * this.symbolPool.bits.length)]);
            
            const noisePool = Array.from({ length: noiseCount }, () => 
                this.symbolPool.noise[Math.floor(Math.random() * this.symbolPool.noise.length)]);

            const poolData = {
                bits: bitsPool,
                noise: noisePool
            };

            console.log('Generated pools:', {
                bitsLength: bitsPool.length,
                noiseLength: noisePool.length,
                sampleBits: bitsPool.slice(0, 10),
                sampleNoise: noisePool.slice(0, 10)
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

    updateDashboard(data) {
        console.log('CapacityModule updating dashboard with data:', data);

        if (!data) {
            console.warn('No data provided to updateDashboard');
            return;
        }

        // Calculate utilization percentages
        const ccuPercent = (data.usedCapacity / data.totalCapacity) * 100;
        
        // Divide usedCapacity by 3 for even distribution across CC1, CC2, CC3
        const usedPerCC = data.usedCapacity / 3;
        const ccu1Percent = (usedPerCC / data.cc1) * 100;
        const ccu2Percent = (usedPerCC / data.cc2) * 100;
        const ccu3Percent = (usedPerCC / data.cc3) * 100;

        console.log('Calculated utilization percentages:', {
            ccuPercent,
            ccu1Percent,
            ccu2Percent,
            ccu3Percent,
            usedPerCC
        });

        // Update CCU values with percentages
        const ccuElement = document.getElementById('circumcircle-utilization');
        if (ccuElement) {
            ccuElement.value = `${Math.round(ccuPercent)}%`;
        }

        // Update CCU1, CCU2, CCU3 with percentages
        const ccu1Element = document.getElementById('cc1-utilization');
        if (ccu1Element) {
            ccu1Element.value = `${Math.round(ccu1Percent)}%`;
        }

        const ccu2Element = document.getElementById('cc2-utilization');
        if (ccu2Element) {
            ccu2Element.value = `${Math.round(ccu2Percent)}%`;
        }

        const ccu3Element = document.getElementById('cc3-utilization');
        if (ccu3Element) {
            ccu3Element.value = `${Math.round(ccu3Percent)}%`;
        }

        // Update ED%
        const edPercentElement = document.getElementById('ed-percent');
        if (edPercentElement) {
            edPercentElement.value = data.edPercent;
            console.log(`ED% (Environmental Data %): ${data.edPercent}%`);
        }

        // Update ED value
        const edElement = document.getElementById('system-ed');
        if (edElement) {
            edElement.value = Math.round(data.usedCapacity);
            console.log(`ED (System Environmental Data): ${Math.round(data.usedCapacity)}`);
        }

        // Update EB%
        const ebPercentElement = document.getElementById('eb-percent');
        if (ebPercentElement) {
            ebPercentElement.value = data.ebPercent;
            console.log(`EB% (Environmental Bits %): ${data.ebPercent}%`);
        }

        // Update EB value
        const ebElement = document.getElementById('system-eb');
        if (ebElement) {
            ebElement.value = data.bitsCount;
            console.log(`EB (System Environmental Bits): ${data.bitsCount}`);
        }

        // Update EN value
        const enElement = document.getElementById('system-en');
        if (enElement) {
            enElement.value = data.noiseCount;
            console.log(`EN (System Environmental Noise): ${data.noiseCount}`);
        }

        console.log('CapacityModule dashboard update complete');
    }

    // Add method to get current dashboard data
    getCurrentDashboardData() {
        return this.currentDashboardData;
    }

    // Add method to prevent dashboard reset
    setupDashboardListeners() {
        const edPercentElement = document.getElementById('ed-percent');
        const ebPercentElement = document.getElementById('eb-percent');

        if (edPercentElement) {
            edPercentElement.addEventListener('change', (e) => {
                if (this.currentDashboardData) {
                    this.currentDashboardData.edPercent = parseInt(e.target.value) || 0;
                }
            });
        }

        if (ebPercentElement) {
            ebPercentElement.addEventListener('change', (e) => {
                if (this.currentDashboardData) {
                    this.currentDashboardData.ebPercent = parseInt(e.target.value) || 0;
                }
            });
        }
    }

    updateUtilizationPercentages(metrics) {
        console.log('CapacityModule received metrics update:', metrics);
        
        if (!metrics) {
            console.warn('No metrics provided to updateUtilizationPercentages');
            return;
        }

        // Get current ED value and ED percentage
        const edElement = document.getElementById('system-ed');
        const edPercentElement = document.getElementById('ed-percent');
        const currentED = edElement ? parseFloat(edElement.value) : 0;
        const edPercent = edPercentElement ? parseFloat(edPercentElement.value) : 50;
        
        console.log('Current values:', {
            ED: currentED,
            'ED%': edPercent,
            totalCapacity: metrics.totalExternal
        });

        // Calculate new utilization based on current ED and new capacity
        const ccuPercent = (currentED / metrics.totalExternal) * 100;
        const usedPerCC = currentED / 3; // Even distribution across CC1/2/3
        
        const ccu1Percent = (usedPerCC / metrics.cc1) * 100;
        const ccu2Percent = (usedPerCC / metrics.cc2) * 100;
        const ccu3Percent = (usedPerCC / metrics.cc3) * 100;
        
        console.log('Calculated utilization:', {
            ccuPercent,
            ccu1Percent,
            ccu2Percent,
            ccu3Percent,
            usedPerCC
        });

        // Update CCU displays
        const ccuElement = document.getElementById('circumcircle-utilization');
        if (ccuElement) {
            ccuElement.value = `${Math.round(ccuPercent)}%`;
        }

        const ccu1Element = document.getElementById('cc1-utilization');
        if (ccu1Element) {
            ccu1Element.value = `${Math.round(ccu1Percent)}%`;
        }

        const ccu2Element = document.getElementById('cc2-utilization');
        if (ccu2Element) {
            ccu2Element.value = `${Math.round(ccu2Percent)}%`;
        }

        const ccu3Element = document.getElementById('cc3-utilization');
        if (ccu3Element) {
            ccu3Element.value = `${Math.round(ccu3Percent)}%`;
        }
    }
} 