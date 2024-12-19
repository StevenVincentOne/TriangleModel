export class CapacityManager {
    constructor(triangleSystem) {
        this.triangleSystem = triangleSystem;
        this.currentCapacity = 0;
        this.maxCapacity = 0;
        this.threshold = null;
        
        // Enhanced data storage with subsystem tracking
        this.dataStore = {
            bits: {
                ss1: [], // NC1 subsystem
                ss2: [], // NC2 subsystem
                ss3: []  // NC3 subsystem
            },
            noise: {
                ss1: [],
                ss2: [],
                ss3: []
            },
            data: {
                ss1: [],
                ss2: [],
                ss3: []
            },
            processed: {
                ss1: [],
                ss2: [],
                ss3: []
            }
        };
        
        // Event tracking
        this.capacityEvents = [];
        
        // Initialize capacity based on triangle area
        this.updateMaxCapacity();
        
        // Set up capacity warning thresholds
        this.warningThresholds = {
            high: 0.9,   // 90% capacity
            medium: 0.7, // 70% capacity
            low: 0.5    // 50% capacity
        };
    }

    updateMaxCapacity() {
        const area = this.triangleSystem.calculateArea();
        this.maxCapacity = this.threshold || area;
        this.checkCapacityThresholds();
        return this.maxCapacity;
    }

    getCurrentUsage() {
        return Object.values(this.dataStore)
            .reduce((totalByType, subsystems) => 
                totalByType + Object.values(subsystems)
                    .reduce((totalBySubsystem, array) => 
                        totalBySubsystem + array.length, 0), 0);
    }

    getSubsystemUsage(subsystem) {
        return Object.values(this.dataStore)
            .reduce((total, types) => 
                total + (types[subsystem]?.length || 0), 0);
    }

    getTypeUsage(type) {
        return Object.values(this.dataStore[type])
            .reduce((total, array) => total + array.length, 0);
    }

    getCapacityPercentage() {
        return (this.getCurrentUsage() / this.maxCapacity) * 100;
    }

    hasCapacity(amount = 1) {
        return (this.getCurrentUsage() + amount) <= this.maxCapacity;
    }

    addData(type, subsystem, amount = 1, metadata = {}) {
        if (!this.hasCapacity(amount)) {
            this.logCapacityEvent('capacity_full', {
                attempted_type: type,
                attempted_subsystem: subsystem,
                attempted_amount: amount
            });
            throw new Error(`System at capacity (${this.getCapacityPercentage()}%) - cannot add more ${type}`);
        }

        if (!this.dataStore[type]?.[subsystem]) {
            throw new Error(`Invalid type "${type}" or subsystem "${subsystem}"`);
        }

        const dataEntry = {
            timestamp: Date.now(),
            value: 1,
            subsystem,
            ...metadata
        };

        for (let i = 0; i < amount; i++) {
            this.dataStore[type][subsystem].push(dataEntry);
        }

        this.logCapacityEvent('data_added', {
            type,
            subsystem,
            amount,
            metadata
        });

        this.checkCapacityThresholds();
        return true;
    }

    // Convenience methods for adding specific types of data
    addBit(subsystem, metadata = {}) {
        return this.addData('bits', subsystem, 1, metadata);
    }

    addNoise(subsystem, metadata = {}) {
        return this.addData('noise', subsystem, 1, metadata);
    }

    addRawData(subsystem, metadata = {}) {
        return this.addData('data', subsystem, 1, metadata);
    }

    addProcessedData(subsystem, metadata = {}) {
        return this.addData('processed', subsystem, 1, metadata);
    }

    removeData(type, subsystem, amount = 1, reason = '') {
        if (!this.dataStore[type]?.[subsystem]) {
            throw new Error(`Invalid type "${type}" or subsystem "${subsystem}"`);
        }

        if (this.dataStore[type][subsystem].length < amount) {
            throw new Error(`Not enough ${type} in ${subsystem} to remove`);
        }

        const removedData = this.dataStore[type][subsystem]
            .splice(-amount)
            .map(entry => ({ ...entry, removalReason: reason }));

        this.logCapacityEvent('data_removed', {
            type,
            subsystem,
            amount,
            reason,
            removedData
        });

        this.checkCapacityThresholds();
        return removedData;
    }

    setThreshold(value) {
        if (value < 0) {
            throw new Error('Threshold cannot be negative');
        }
        if (value < this.getCurrentUsage()) {
            throw new Error('Cannot set threshold below current usage');
        }
        
        this.threshold = value;
        this.updateMaxCapacity();
        this.logCapacityEvent('threshold_set', { value });
    }

    clearThreshold() {
        this.threshold = null;
        this.updateMaxCapacity();
        this.logCapacityEvent('threshold_cleared');
    }

    checkCapacityThresholds() {
        const percentage = this.getCapacityPercentage();
        let warning = null;

        if (percentage >= this.warningThresholds.high * 100) {
            warning = 'high';
        } else if (percentage >= this.warningThresholds.medium * 100) {
            warning = 'medium';
        } else if (percentage >= this.warningThresholds.low * 100) {
            warning = 'low';
        }

        if (warning) {
            this.logCapacityEvent('capacity_warning', {
                level: warning,
                percentage: percentage
            });
        }

        return warning;
    }

    logCapacityEvent(type, details = {}) {
        const event = {
            type,
            timestamp: Date.now(),
            capacity: this.getCurrentUsage(),
            maxCapacity: this.maxCapacity,
            percentage: this.getCapacityPercentage(),
            ...details
        };

        this.capacityEvents.push(event);
        console.log('Capacity Event:', event);
        
        // Optionally dispatch custom event
        const customEvent = new CustomEvent('capacityUpdate', { detail: event });
        document.dispatchEvent(customEvent);
    }

    getSubsystemStats(subsystem) {
        return {
            bits: this.dataStore.bits[subsystem].length,
            noise: this.dataStore.noise[subsystem].length,
            data: this.dataStore.data[subsystem].length,
            processed: this.dataStore.processed[subsystem].length,
            total: this.getSubsystemUsage(subsystem)
        };
    }

    getStats() {
        return {
            totalCapacity: this.maxCapacity,
            usedCapacity: this.getCurrentUsage(),
            remainingCapacity: this.maxCapacity - this.getCurrentUsage(),
            percentageUsed: this.getCapacityPercentage(),
            subsystems: {
                ss1: this.getSubsystemStats('ss1'),
                ss2: this.getSubsystemStats('ss2'),
                ss3: this.getSubsystemStats('ss3')
            },
            dataCount: {
                bits: this.getTypeUsage('bits'),
                noise: this.getTypeUsage('noise'),
                data: this.getTypeUsage('data'),
                processed: this.getTypeUsage('processed')
            },
            hasCustomThreshold: this.threshold !== null,
            warningLevel: this.checkCapacityThresholds(),
            lastEvent: this.capacityEvents[this.capacityEvents.length - 1]
        };
    }

    reset() {
        this.dataStore = {
            bits: { ss1: [], ss2: [], ss3: [] },
            noise: { ss1: [], ss2: [], ss3: [] },
            data: { ss1: [], ss2: [], ss3: [] },
            processed: { ss1: [], ss2: [], ss3: [] }
        };
        this.capacityEvents = [];
        this.clearThreshold();
        this.logCapacityEvent('system_reset');
    }
}
