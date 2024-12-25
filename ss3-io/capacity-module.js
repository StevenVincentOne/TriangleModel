export class CapacityModule {
    constructor(circumcircleMetrics) {
        this.metrics = circumcircleMetrics;

        // Capacity parameters
        this.capacityUtilization = 50;
        this.dataAvailability = 7;
        this.totalDataBalance = 0.5;
        this.nodeChannelBalance = {
            cc1: 0.5,
            cc2: 0.5,
            cc3: 0.5
        };

        // Single unified symbol pool instead of region-specific groups
        this.symbolPool = {
            bits: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
                'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
                'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '/', '+', '&', '∅'],
            noise: ['α', 'β', 'χ', 'δ', 'ε', 'φ', 'γ', 'η', 'ι', 'ξ',
                'κ', 'λ', 'μ', 'ν', 'ο', 'π', 'ψ', 'ρ', 'σ',
                'τ', 'υ', 'ϑ', 'ω', 'χ', 'ψ', 'ζ', 'ς', 'Σ', 'Ω', 'θ']
        };
    }

    calculateUtilization(totalCapacity) {
        // Calculate actual data content as percentage of capacity
        const actualData = this.getCurrentDataCount();
        return (actualData / totalCapacity) * 100 * this.capacityUtilization;
    }

    calculateRegionUtilization(region, capacity) {
        // Calculate actual data content in specific region
        const regionData = this.getCurrentRegionDataCount(region);
        return (regionData / capacity) * 100 * this.nodeChannelBalance[region];
    }

    getCurrentDataCount() {
        // Count total bits and noise currently in the environment
        let totalCount = 0;
        for (const region of ['cc1', 'cc2', 'cc3']) {
            const data = this.generateEnvironmentalData(region);
            totalCount += data.bits.length + data.noise.length;
        }
        return totalCount;
    }

    getCurrentRegionDataCount(region) {
        // Count bits and noise in specific region
        const data = this.generateEnvironmentalData(region);
        return data.bits.length + data.noise.length;
    }

    calculateAvailableCapacity(region) {
        const metrics = this.metrics.calculateExternalRegions();
        if (!metrics) return 0;

        const totalCapacity = metrics[region] * (this.capacityUtilization / 100);
        return totalCapacity * (this.dataAvailability / 10);
    }

    generateEnvironmentalData(region) {
        const capacity = this.calculateAvailableCapacity(region);
        const balance = this.nodeChannelBalance[region];

        const bitsCount = Math.floor(capacity * balance);
        const noiseCount = Math.floor(capacity * (1 - balance));

        return {
            bits: this.generateSymbols('bits', bitsCount),
            noise: this.generateSymbols('noise', noiseCount)
        };
    }

    generateSymbols(type, count) {
        const symbols = this.symbolPool[type];
        const result = [];

        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * symbols.length);
            result.push(symbols[randomIndex]);
        }

        return result;
    }

    introduceDisturbance(params = {}) {
        const {
            duration = 5000,  // Duration in milliseconds
            intensity = 0.5,  // 0-1 scale
            type = 'random'   // 'random', 'bits-surge', 'noise-surge', 'capacity-drop'
        } = params;

        const originalState = {
            capacityUtilization: this.capacityUtilization,
            dataAvailability: this.dataAvailability,
            totalDataBalance: this.totalDataBalance,
            nodeChannelBalance: { ...this.nodeChannelBalance }
        };

        switch (type) {
            case 'bits-surge':
                this.totalDataBalance = Math.min(1, this.totalDataBalance + intensity * 0.5);
                break;
            case 'noise-surge':
                this.totalDataBalance = Math.max(0, this.totalDataBalance - intensity * 0.5);
                break;
            case 'capacity-drop':
                this.capacityUtilization *= (1 - intensity);
                this.dataAvailability *= (1 - intensity);
                break;
            case 'random':
                this.introduceRandomDisturbance(intensity);
                break;
        }

        // Restore original state after duration
        setTimeout(() => {
            Object.assign(this, originalState);
        }, duration);
    }

    introduceRandomDisturbance(intensity) {
        const factor = intensity * 0.5;
        this.capacityUtilization = Math.max(10, Math.min(100, this.capacityUtilization + (Math.random() - 0.5) * 20 * factor));
        this.dataAvailability = Math.max(1, Math.min(10, this.dataAvailability + (Math.random() - 0.5) * 2 * factor));
        this.totalDataBalance = Math.max(0, Math.min(1, this.totalDataBalance + (Math.random() - 0.5) * factor));
    }
} 