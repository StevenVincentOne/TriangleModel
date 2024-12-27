import { EnvironmentDatabase } from '../shared/ui/database.js';

export class CapacityModule {
    constructor(circleMetrics) {
        this.metrics = circleMetrics;
        this.symbolPool = {
            bits: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
                'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '/', '+', '&', '∅'],
            noise: ['α', 'β', 'χ', 'δ', 'ε', 'φ', 'γ', 'η', 'ι', 'ξ',
                'κ', 'λ', 'μ', 'ν', 'ο', 'π', 'ψ', 'ρ', 'σ',
                'τ', 'υ', 'ϑ', 'ω', 'χ', 'ψ', 'ζ', 'ς', 'Σ', 'Ω', 'θ']
        };
        this.environmentDB = new EnvironmentDatabase();
    }

    generateSymbols(type, count) {
        const symbols = this.symbolPool[type];
        if (!symbols) {
            console.error(`Invalid symbol type: ${type}`);
            return [];
        }

        const result = [];
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * symbols.length);
            result.push(symbols[randomIndex]);
        }
        return result;
    }

    async initializeSystemData() {
        try {
            // Get the latest metrics
            const metrics = this.metrics.calculateExternalRegions();
            if (!metrics) {
                throw new Error('No metrics available');
            }

            // Calculate total capacity based on circumcircle metrics
            const totalCapacity = metrics.totalExternal || 0;
            
            // Generate random utilization percentages (50-90%)
            const ccuTotal = Math.random() * 40 + 50;
            const ccu1 = Math.random() * 40 + 50;
            const ccu2 = Math.random() * 40 + 50;
            const ccu3 = Math.random() * 40 + 50;

            // Calculate actual capacities
            const usedCapacity = totalCapacity * (ccuTotal / 100);
            const cc1Capacity = metrics.cc1 * (ccu1 / 100);
            const cc2Capacity = metrics.cc2 * (ccu2 / 100);
            const cc3Capacity = metrics.cc3 * (ccu3 / 100);

            // Generate random B/N ratio (30-70% bits)
            const bitsRatio = Math.random() * 40 + 30;
            
            // Calculate pool sizes
            const totalBits = Math.floor(usedCapacity * (bitsRatio / 100));
            const totalNoise = Math.floor(usedCapacity * ((100 - bitsRatio) / 100));

            // Generate symbol pools
            const bitsPool = this.generateSymbols('bits', totalBits);
            const noisePool = this.generateSymbols('noise', totalNoise);

            const calculatedMetrics = {
                ccuTotal,
                ccu1,
                ccu2,
                ccu3,
                totalCapacity,
                usedCapacity,
                cc1Capacity,
                cc2Capacity,
                cc3Capacity,
                ed: usedCapacity,
                eb: totalBits,
                en: totalNoise
            };

            // Log detailed initialization report
            console.log('=== System Initialization Report ===');
            console.log('Capacity Metrics:', {
                totalCapacity: calculatedMetrics.totalCapacity.toFixed(2),
                ccuTotal: calculatedMetrics.ccuTotal.toFixed(2) + '%',
                usedCapacity: calculatedMetrics.usedCapacity.toFixed(2),
                cc1: {
                    capacity: calculatedMetrics.cc1Capacity.toFixed(2),
                    utilization: calculatedMetrics.ccu1.toFixed(2) + '%'
                },
                cc2: {
                    capacity: calculatedMetrics.cc2Capacity.toFixed(2),
                    utilization: calculatedMetrics.ccu2.toFixed(2) + '%'
                },
                cc3: {
                    capacity: calculatedMetrics.cc3Capacity.toFixed(2),
                    utilization: calculatedMetrics.ccu3.toFixed(2) + '%'
                }
            });

            console.log('Symbol Distribution:', {
                bitsRatio: bitsRatio.toFixed(2) + '%',
                totalBits,
                totalNoise,
                totalSymbols: totalBits + totalNoise
            });

            console.log('Generated Pools:', {
                bitsPoolSize: bitsPool.length,
                noisePoolSize: noisePool.length,
                bitsSample: bitsPool.slice(0, 10).join(''),
                noiseSample: noisePool.slice(0, 10).join('')
            });

            // Store the initialized data in IndexedDB
            await this.environmentDB.storeEnvironmentalPool({
                bits: bitsPool,
                noise: noisePool,
                metrics: calculatedMetrics
            });

            console.log('Environmental pool stored in database');

            return {
                bits: bitsPool,
                noise: noisePool,
                metrics: calculatedMetrics
            };

        } catch (error) {
            console.error('Error in initializeSystemData:', error);
            throw error;
        }
    }
} 