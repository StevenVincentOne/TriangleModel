// Singleton instance
let instance = null;

export class EnvironmentDatabase {
    #db = null;  // Private field for database
    stores = ['environment', 'processing', 'converted'];
    debugLogging = false;

    constructor() {
        if (EnvironmentDatabase.instance) {
            
            return EnvironmentDatabase.instance;
        }

        
        this.dbName = 'EnvironmentDB';
        this.version = 5;
        this.ready = this.initializeDatabase();
        this.initializeZeroButton();

        EnvironmentDatabase.instance = this;
    }

    async initializeDatabase() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('EnvironmentDB', 5);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create/maintain environment store
                    if (!db.objectStoreNames.contains('environment')) {
                        db.createObjectStore('environment', { keyPath: 'id', autoIncrement: true });
                    }
                    
                    // Rename 'processing' to 'uptake'
                    if (db.objectStoreNames.contains('processing')) {
                        const processingData = [];
                        const transaction = event.target.transaction;
                        
                        // Get all data from processing store
                        const processingStore = transaction.objectStore('processing');
                        processingStore.getAll().onsuccess = (e) => {
                            processingData.push(...e.target.result);
                        };
                        
                        db.deleteObjectStore('processing');
                        const uptakeStore = db.createObjectStore('uptake', { keyPath: 'id', autoIncrement: true });
                        
                        // Restore data to new store
                        processingData.forEach(item => {
                            uptakeStore.add(item);
                        });
                    } else if (!db.objectStoreNames.contains('uptake')) {
                        db.createObjectStore('uptake', { keyPath: 'id', autoIncrement: true });
                    }
                    
                    // Rename 'convertPool' to 'processingPool'
                    if (db.objectStoreNames.contains('convertPool')) {
                        const poolData = [];
                        const transaction = event.target.transaction;
                        
                        // Get all data from convertPool store
                        const convertPoolStore = transaction.objectStore('convertPool');
                        convertPoolStore.getAll().onsuccess = (e) => {
                            poolData.push(...e.target.result);
                        };
                        
                        db.deleteObjectStore('convertPool');
                        const processingPoolStore = db.createObjectStore('processingPool', { keyPath: 'symbol' });
                        
                        // Restore data to new store
                        poolData.forEach(item => {
                            processingPoolStore.add(item);
                        });
                    } else if (!db.objectStoreNames.contains('processingPool')) {
                        db.createObjectStore('processingPool', { keyPath: 'symbol' });
                    }
                    
                    if (!db.objectStoreNames.contains('convertedBytes')) {
                        db.createObjectStore('convertedBytes', { keyPath: 'id', autoIncrement: true });
                    }
                    
                    // Add filteredNoise store
                    if (!db.objectStoreNames.contains('filteredNoise')) {
                        db.createObjectStore('filteredNoise', { 
                            keyPath: 'id', 
                            autoIncrement: true 
                        });
                    }
                };

                request.onsuccess = (event) => {
                    this.#db = event.target.result;
                    console.log('Database initialized successfully');
                    resolve();
                };

                request.onerror = () => {
                    console.error('Error opening database:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    // Generic store operations
    async addToStore(storeName, data) {
        try {
            await this.ready;
            const transaction = this.#db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.add(data);
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`Error adding to ${storeName}:`, error);
            throw error;
        }
    }

    async getAllFromStore(storeName) {
        try {
            await this.ready;
            const transaction = this.#db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`Error getting all from ${storeName}:`, error);
            throw error;
        }
    }

    // Specific store methods
    async storeUptakeSymbol(symbol) {
        return this.addToStore('uptake', symbol);
    }

    async getUptakeSymbols() {
        return this.getAllFromStore('uptake');
    }

    async deleteUptakeSymbol(id) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('uptake', 'readwrite');
            const store = transaction.objectStore('uptake');
            return store.delete(id);
        } catch (error) {
            console.error('Error deleting uptake symbol:', error);
            throw error;
        }
    }

    async storeProcessingPoolSymbol(symbol) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('processingPool', 'readwrite');
            const store = transaction.objectStore('processingPool');
            
            // Get existing count for this symbol
            const request = store.get(symbol.symbol);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = async () => {
                    const existingRecord = request.result;
                    
                    if (existingRecord) {
                        // Update existing count
                        existingRecord.count++;
                        const updateRequest = store.put(existingRecord);
                        
                        updateRequest.onsuccess = () => {
                            console.log(`Updated count for symbol ${symbol.symbol} to ${existingRecord.count}`);
                            resolve(updateRequest.result);
                        };
                        
                        updateRequest.onerror = () => reject(updateRequest.error);
                    } else {
                        // Create new record
                        const newRecord = {
                            symbol: symbol.symbol,
                            type: symbol.type,
                            count: 1,
                            timestamp: Date.now()
                        };
                        
                        const addRequest = store.put(newRecord);
                        
                        addRequest.onsuccess = () => {
                            console.log(`Created new count for symbol ${symbol.symbol}`);
                            resolve(addRequest.result);
                        };
                        
                        addRequest.onerror = () => reject(addRequest.error);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error storing processing pool symbol:', error);
            throw error;
        }
    }

    async getProcessingPoolSymbols() {
        return this.getAllFromStore('processingPool');
    }

    async getProcessingPoolCounts() {
        try {
            const symbols = await this.getAllFromStore('processingPool');
            const counts = {
                bits: {},
                totalBits: 0,
                noise: 0
            };
            
            symbols.forEach(record => {
                if (record.type === 'bit') {
                    counts.bits[record.symbol] = record.count;
                    counts.totalBits += record.count;
                } else if (record.type === 'noise') {
                    counts.noise += record.count;
                }
            });
            
            return counts;
        } catch (error) {
            console.error('Error getting processing pool counts:', error);
            throw error;
        }
    }

    async decrementProcessingPoolSymbol(symbol, amount) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('processingPool', 'readwrite');
            const store = transaction.objectStore('processingPool');
            
            return new Promise((resolve, reject) => {
                const request = store.get(symbol);
                
                request.onsuccess = async () => {
                    const record = request.result;
                    if (record) {
                        record.count -= amount;
                        
                        if (record.count <= 0) {
                            // Remove record if count reaches 0
                            store.delete(symbol);
                        } else {
                            // Update with new count
                            store.put(record);
                        }
                        resolve();
                    } else {
                        reject(new Error(`Symbol ${symbol} not found in processing pool`));
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error decrementing processing pool symbol:', error);
            throw error;
        }
    }

    async storeConvertedByte(byte) {
        return this.addToStore('convertedBytes', byte);
    }

    async getConvertedBytes() {
        return this.getAllFromStore('convertedBytes');
    }

    async deleteProcessedSymbol(id) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('processing', 'readwrite');
            const store = transaction.objectStore('processing');
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    resolve();
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error deleting processed symbol:', error);
            throw error;
        }
    }

    async getProcessedSymbols() {
        return this.getAllFromStore('processing');
    }

    async getEnvironmentalPool() {
        return this.getAllFromStore('environment');
    }

    async storeEnvironmentSymbol(symbolData) {
        try {
            if (!this.#db) {
                await this.ready;
            }

            const transaction = this.#db.transaction('environment', 'readwrite');
            const store = transaction.objectStore('environment');
            const request = store.add(symbolData);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (this.debugLogging) {
                        console.log('Stored environment symbol:', symbolData);
                    }
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error('Error storing environment symbol:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in storeEnvironmentSymbol:', error);
            throw error;
        }
    }

    async storeProcessedSymbol(symbolData) {
        try {
            if (!this.#db) {
                await this.ready;
            }

            const transaction = this.#db.transaction('processing', 'readwrite');
            const store = transaction.objectStore('processing');
            const request = store.add(symbolData);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (this.debugLogging) {
                        console.log('Stored processed symbol:', symbolData);
                    }
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error('Error storing processed symbol:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in storeProcessedSymbol:', error);
            throw error;
        }
    }

    async storeEnvironmentalPool(poolData) {
        try {
            if (!this.#db) {
                await this.ready;
            }

            const transaction = this.#db.transaction('environment', 'readwrite');
            const store = transaction.objectStore('environment');

            // If poolData is an array, store each item
            if (Array.isArray(poolData)) {
                for (const item of poolData) {
                    await new Promise((resolve, reject) => {
                        const request = store.add(item);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }
            } else {
                // If poolData is a single item
                const request = store.add(poolData);
                await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }

            if (this.debugLogging) {
                console.log('Stored environmental pool data');
            }
        } catch (error) {
            console.error('Error in storeEnvironmentalPool:', error);
            throw error;
        }
    }

    async deleteEnvironmentSymbol(id) {
        try {
            if (!id) {
                throw new Error('No ID provided for deletion');
            }
            
            await this.ready;
            const transaction = this.#db.transaction('environment', 'readwrite');
            const store = transaction.objectStore('environment');
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    console.log('Successfully deleted symbol with ID:', id);
                    resolve();
                };
        
                request.onerror = () => {
                    console.error('Error deleting symbol with ID:', id);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in deleteEnvironmentSymbol:', error);
            throw error;
        }
    }

    async clearStore(storeName) {
        try {
            await this.ready;
            const transaction = this.#db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.clear();
                
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { store: storeName, action: 'clear' }
                    }));
                    resolve();
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Error clearing store ${storeName}:`, error);
            throw error;
        }
    }

    async storeProcessedSymbol(symbol) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('processing', 'readwrite');
            const store = transaction.objectStore('processing');
            await store.add(symbol);
            
            // Emit store change event
            window.dispatchEvent(new CustomEvent('storeChanged', { 
                detail: { store: 'processing', action: 'add', data: symbol }
            }));
        } catch (error) {
            console.error('Error storing processed symbol:', error);
            throw error;
        }
    }

    initializeZeroButton() {
        const zeroDataButton = document.getElementById('zeroDataButton');
        if (zeroDataButton) {
            zeroDataButton.addEventListener('click', async () => {
                try {
                    // Get checkbox states, with null checks
                    const envChecked = document.getElementById('zero-environment')?.checked || false;
                    const uptakeChecked = document.getElementById('zero-processing')?.checked || false;
                    const convChecked = document.getElementById('zero-converted')?.checked || false;
                    const convBytesChecked = document.getElementById('zero-conv-bytes')?.checked || false;

                    console.log('Zeroing selected stores:', {
                        environment: envChecked,
                        uptake: uptakeChecked,
                        processingPool: convChecked,
                        convertedBytes: convBytesChecked
                    });

                    if (envChecked) await this.clearStore('environment');
                    if (uptakeChecked) await this.clearStore('uptake');
                    if (convChecked) await this.clearStore('processingPool');
                    if (convBytesChecked) {
                        // Clear both convertedBytes and filteredNoise when C is checked
                        await this.clearStore('convertedBytes');
                        await this.clearStore('filteredNoise');
                    }

                    // Dispatch event after clearing
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { store: 'all', action: 'zero' }
                    }));

                } catch (error) {
                    console.error('Error zeroing stores:', error);
                }
            });
        }
    }

    async updateEnvironmentalPool(id, data) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('environment', 'readwrite');
            const store = transaction.objectStore('environment');
            
            return new Promise((resolve, reject) => {
                const request = store.get(id);
                
                request.onsuccess = () => {
                    const record = request.result;
                    if (record) {
                        record.bits = data.bits;
                        record.noise = data.noise;
                        
                        const updateRequest = store.put(record);
                        updateRequest.onsuccess = () => {
                            console.log('Updated environmental pool');
                            resolve();
                        };
                        updateRequest.onerror = () => {
                            reject(updateRequest.error);
                        };
                    } else {
                        reject(new Error('Record not found'));
                    }
                };
                
                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error updating environmental pool:', error);
            throw error;
        }
    }

    async decrementProcessingPoolBits(symbol, amount) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('processingPool', 'readwrite');
            const store = transaction.objectStore('processingPool');
            
            return new Promise((resolve, reject) => {
                const request = store.get(symbol);
                
                request.onsuccess = async () => {
                    const record = request.result;
                    if (record && record.type === 'bit' && record.count >= amount) {
                        record.count -= amount;
                        
                        if (record.count <= 0) {
                            // Remove record if count reaches 0
                            store.delete(symbol);
                        } else {
                            // Update with new count
                            store.put(record);
                        }
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error decrementing processing pool bits:', error);
            throw error;
        }
    }

    async storeConvertedBytes(byteData) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('convertedBytes', 'readwrite');
            const store = transaction.objectStore('convertedBytes');
            
            return new Promise((resolve, reject) => {
                const request = store.add({
                    ...byteData,
                    timestamp: Date.now()
                });
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error storing converted bytes:', error);
            throw error;
        }
    }

    async getConvertedBytes() {
        try {
            await this.ready;
            const transaction = this.#db.transaction('convertedBytes', 'readonly');
            const store = transaction.objectStore('convertedBytes');
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error getting converted bytes:', error);
            throw error;
        }
    }

    async getProcessingPool() {
        try {
            await this.ready;
            const transaction = this.#db.transaction('processingPool', 'readonly');
            const store = transaction.objectStore('processingPool');
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    console.error('Error getting processing pool:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error accessing processing pool:', error);
            throw error;
        }
    }

    async decrementProcessingPoolNoise(symbol, amount) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('processingPool', 'readwrite');
            const store = transaction.objectStore('processingPool');
            
            return new Promise((resolve, reject) => {
                const request = store.get(symbol);
                
                request.onsuccess = async () => {
                    const record = request.result;
                    if (record && record.type === 'noise' && record.count >= amount) {
                        record.count -= amount;
                        
                        if (record.count <= 0) {
                            // Remove record if count reaches 0
                            store.delete(symbol);
                        } else {
                            // Update with new count
                            store.put(record);
                        }
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error decrementing processing pool noise:', error);
            throw error;
        }
    }

    async storeFilteredNoise(noiseData) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('filteredNoise', 'readwrite');
            const store = transaction.objectStore('filteredNoise');
            
            return new Promise((resolve, reject) => {
                const request = store.add({
                    ...noiseData,
                    timestamp: Date.now()
                });
                
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { store: 'filteredNoise', action: 'add', data: noiseData }
                    }));
                    resolve(request.result);
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error storing filtered noise:', error);
            throw error;
        }
    }

    async getFilteredNoise() {
        return this.getAllFromStore('filteredNoise');
    }

    async deleteFilteredNoise(id) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('filteredNoise', 'readwrite');
            const store = transaction.objectStore('filteredNoise');
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { store: 'filteredNoise', action: 'delete', id: id }
                    }));
                    resolve();
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error deleting filtered noise:', error);
            throw error;
        }
    }

    async deleteConvertedByte(id) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('convertedBytes', 'readwrite');
            const store = transaction.objectStore('convertedBytes');
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { store: 'convertedBytes', action: 'delete', id }
                    }));
                    resolve();
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error deleting converted byte:', error);
            throw error;
        }
    }
}

// Add this right after the existing EnvironmentDatabase class code
console.log('Database module loaded');

// Create and export a single instance
export const environmentDB = new EnvironmentDatabase();
console.log('Database instance created');

// Prevent creation of new instances
Object.freeze(environmentDB);
console.log('Database instance frozen');