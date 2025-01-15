// Singleton instance
let instance = null;

export class EnvironmentDatabase {
    #db = null;  // Private field for database
    stores = [
        'environment',
        'uptake', 
        'processing', 
        'converted', 
        'stateIntake',
        'stateUpdateNC1',
        'stateUpdateNC2',
        'stateUpdateNC3'
    ];
    debugLogging = false;

    constructor() {
        if (EnvironmentDatabase.instance) {
            return EnvironmentDatabase.instance;
        }

        this.dbName = 'EnvironmentDB';
        this.version = 7;  // Incremented version
        this.ready = this.initializeDatabase();
        this.initializeZeroButton();
        this.initializeZeroStateButton();

        EnvironmentDatabase.instance = this;
    }

    async initializeDatabase() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create/maintain environment store
                    if (!db.objectStoreNames.contains('environment')) {
                        db.createObjectStore('environment', { keyPath: 'id', autoIncrement: true });
                    }
                    
                    // Create other stores if they don't exist
                    const stores = {
                        'uptake': { keyPath: 'id', autoIncrement: true },
                        'processingPool': { keyPath: 'symbol' },
                        'convertedBytes': { keyPath: 'id', autoIncrement: true },
                        'filteredNoise': { keyPath: 'id', autoIncrement: true },
                        'stateIntake': { keyPath: 'id', autoIncrement: true },
                        'stateUpdateNC1': { keyPath: 'id', autoIncrement: true },
                        'stateUpdateNC2': { keyPath: 'id', autoIncrement: true },
                        'stateUpdateNC3': { keyPath: 'id', autoIncrement: true }
                    };

                    Object.entries(stores).forEach(([storeName, config]) => {
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.createObjectStore(storeName, config);
                            console.log(`Created store: ${storeName}`);
                        }
                    });
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
            
            // Get existing count for this symbol AND type combination
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = async () => {
                    const records = request.result;
                    const existingRecord = records.find(r => 
                        r.symbol === symbol.symbol && r.type === symbol.type
                    );
                    
                    if (existingRecord) {
                        // Update existing count only if symbol AND type match
                        existingRecord.count++;
                        const updateRequest = store.put(existingRecord);
                        
                        updateRequest.onsuccess = () => {
                            console.log(`Updated count for symbol ${symbol.symbol} (${symbol.type}) to ${existingRecord.count}`);
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
                            console.log(`Created new count for symbol ${symbol.symbol} (${symbol.type})`);
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

    async storeConvertedBytes(symbolData) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('convertedBytes', 'readwrite');
            const store = transaction.objectStore('convertedBytes');
            
            // Verify the data structure
            console.log('Storing converted bytes:', {
                symbol: symbolData.symbol,
                type: symbolData.type, // Should be 'byte' or 'entropy'
                count: symbolData.count,
                timestamp: symbolData.timestamp
            });

            return new Promise((resolve, reject) => {
                const request = store.add(symbolData);
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { store: 'convertedBytes', action: 'add', data: symbolData }
                    }));
                    resolve(request.result);
                };
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
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { 
                            store: 'environment', 
                            action: 'add', 
                            data: symbolData 
                        }
                    }));
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

            // First clear the existing data
            await new Promise((resolve, reject) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = () => resolve();
                clearRequest.onerror = () => reject(clearRequest.error);
            });

            // Then store the new data
            if (Array.isArray(poolData)) {
                for (const item of poolData) {
                    await new Promise((resolve, reject) => {
                        const request = store.add(item);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }
            } else {
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
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { 
                            store: 'environment', 
                            action: 'delete', 
                            id: id 
                        }
                    }));
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

    async storeFilteredNoise(symbolData) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('filteredNoise', 'readwrite');
            const store = transaction.objectStore('filteredNoise');
            
            return new Promise((resolve, reject) => {
                const request = store.add(symbolData);
                
                request.onsuccess = () => {
                    // Dispatch event with the correct store name
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { 
                            store: 'filteredNoise',
                            action: 'add',
                            data: symbolData 
                        }
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
                    window.dispatchEvent(new CustomEvent('convertedBytesUpdated', { 
                        detail: { action: 'delete', id }
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

    async monitorStore(storeName, callback) {
        try {
            // Initial check of store data
            const initialData = await this.getAllFromStore(storeName);
            callback({
                type: 'initial',
                store: storeName,
                data: initialData,
                isEmpty: initialData.length === 0
            });

            // Set up ongoing monitoring
            const handleStoreChange = (event) => {
                if (event.detail.store === storeName) {
                    callback({
                        type: event.detail.action,
                        store: storeName,
                        data: event.detail.data,
                        id: event.detail.id
                    });
                }
            };

            // Add listener and store reference for cleanup
            window.addEventListener('storeChanged', handleStoreChange);
            
            // Return cleanup function
            return () => {
                window.removeEventListener('storeChanged', handleStoreChange);
            };
        } catch (error) {
            console.error(`Error monitoring store ${storeName}:`, error);
            throw error;
        }
    }

    async connectStores(sourceStore, targetStore, processor) {
        try {
            let isProcessing = false;
            let cleanup = null;

            const processData = async (data) => {
                if (isProcessing || !data) return;
                
                try {
                    isProcessing = true;
                    if (this.debugLogging) {
                        console.log(`Processing data from ${sourceStore} to ${targetStore}`, {
                            dataSize: Array.isArray(data) ? data.length : 1,
                            timestamp: new Date().toISOString()
                        });
                    }

                    await processor(data);

                    // Dispatch an event about successful processing
                    window.dispatchEvent(new CustomEvent('storeProcessing', { 
                        detail: { 
                            source: sourceStore,
                            target: targetStore,
                            status: 'success',
                            timestamp: Date.now()
                        }
                    }));
                } catch (error) {
                    console.error(`Error processing data between ${sourceStore} and ${targetStore}:`, error);
                    // Dispatch an event about failed processing
                    window.dispatchEvent(new CustomEvent('storeProcessing', { 
                        detail: { 
                            source: sourceStore,
                            target: targetStore,
                            status: 'error',
                            error: error.message,
                            timestamp: Date.now()
                        }
                    }));
                } finally {
                    isProcessing = false;
                }
            };

            // Set up the monitoring connection
            cleanup = await this.monitorStore(sourceStore, async ({ type, data, isEmpty }) => {
                if (this.debugLogging) {
                    console.log(`Store monitor event: ${sourceStore} -> ${targetStore}`, {
                        type,
                        isEmpty,
                        timestamp: new Date().toISOString()
                    });
                }

                if (type === 'initial' && !isEmpty) {
                    // Process existing data
                    const sourceData = await this.getAllFromStore(sourceStore);
                    await processData(sourceData);
                } else if (type === 'add' && data) {
                    // Process new data
                    await processData(data);
                } else if (isEmpty) {
                    // Notify about empty source store
                    window.dispatchEvent(new CustomEvent('storeEmpty', { 
                        detail: { 
                            store: sourceStore,
                            target: targetStore,
                            timestamp: Date.now()
                        }
                    }));
                }
            });

            // Return cleanup function
            return () => {
                if (cleanup) cleanup();
            };
        } catch (error) {
            console.error(`Error connecting stores ${sourceStore} to ${targetStore}:`, error);
            throw error;
        }
    }

    async setupProcessingPoolConnections() {
        // Connect processingPool to convertedBytes for 'bit'
        const poolToBytes = await this.connectStores(
            'processingPool',
            'convertedBytes',
            async (data) => {
                if (Array.isArray(data)) {
                    const bitRecords = data.filter(record => record.type === 'bit');
                    console.log('Processing bits:', bitRecords); // Logging
                    for (const record of bitRecords) {
                        if (record.count > 0) {
                            await this.storeConvertedBytes({
                                symbol: record.symbol,
                                count: record.count,
                                type: 'bit'
                            });
                        }
                    }
                } else if (data.type === 'bit' && data.count > 0) {
                    console.log('Processing single bit:', data); // Logging
                    await this.storeConvertedBytes({
                        symbol: data.symbol,
                        count: data.count,
                        type: 'bit'
                    });
                }
            }
        );

        // Connect processingPool to convertedBytes for 'entropy'
        const poolToEntropy = await this.connectStores(
            'processingPool',
            'convertedBytes',
            async (data) => {
                if (Array.isArray(data)) {
                    const entropyRecords = data.filter(record => record.type === 'noise');
                    console.log('Processing entropy:', entropyRecords); // Logging
                    for (const record of entropyRecords) {
                        if (record.count > 0) {
                            await this.storeConvertedBytes({
                                symbol: record.symbol,
                                count: record.count,
                                type: 'entropy'  // Store as entropy in convertedBytes
                            });
                        }
                    }
                } else if (data.type === 'noise' && data.count > 0) {
                    console.log('Processing single entropy:', data); // Logging
                    await this.storeConvertedBytes({
                        symbol: data.symbol,
                        count: data.count,
                        type: 'entropy'  // Store as entropy in convertedBytes
                    });
                }
            }
        );

        // Return cleanup functions
        return () => {
            poolToBytes();
            poolToEntropy();
        };
    }

    async storeStateIntakeSymbol(symbolData) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('stateIntake', 'readwrite');
            const store = transaction.objectStore('stateIntake');
            
            return new Promise((resolve, reject) => {
                const request = store.add({
                    ...symbolData,
                    timestamp: Date.now()
                });
                
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('stateIntakeUpdated', { 
                        detail: { action: 'add', data: symbolData }
                    }));
                    resolve(request.result);
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error storing state intake symbol:', error);
            throw error;
        }
    }

    async getStateIntakeSymbols() {
        return this.getAllFromStore('stateIntake');
    }

    async deleteStateIntakeSymbol(id) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('stateIntake', 'readwrite');
            const store = transaction.objectStore('stateIntake');
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('stateIntakeUpdated', { 
                        detail: { action: 'delete', id }
                    }));
                    resolve();
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error deleting state intake symbol:', error);
            throw error;
        }
    }

    async clearAllStores() {
        const stores = ['environment', 'processing', 'uptake', 'processingPool', 'convertedBytes', 'filteredNoise', 'stateIntake', 'stateUpdateNC1', 'stateUpdateNC2', 'stateUpdateNC3'];
        for (const storeName of stores) {
            try {
                await this.clearStore(storeName);
                console.log(`Cleared store: ${storeName}`);
                
                // Dispatch update events for NC stores
                if (storeName.startsWith('stateUpdateNC')) {
                    const ncNumber = parseInt(storeName.slice(-1));
                    window.dispatchEvent(new CustomEvent('stateUpdateNCUpdated', {
                        detail: {
                            nc: ncNumber,
                            action: 'clear'
                        }
                    }));
                }
            } catch (error) {
                console.error(`Error clearing store ${storeName}:`, error);
            }
        }
    }

    // Add methods for the new stores
    async storeStateUpdateNC(ncNumber, symbolData) {
        const storeName = `stateUpdateNC${ncNumber}`;
        try {
            await this.ready;
            const transaction = this.#db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.add({
                    ...symbolData,
                    timestamp: Date.now()
                });
                
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('stateUpdateNCUpdated', { 
                        detail: { 
                            nc: ncNumber,
                            action: 'add', 
                            data: symbolData 
                        }
                    }));
                    resolve(request.result);
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Error storing state update NC${ncNumber} symbol:`, error);
            throw error;
        }
    }

    async getStateUpdateNCSymbols(ncNumber) {
        return this.getAllFromStore(`stateUpdateNC${ncNumber}`);
    }

    async deleteStateUpdateNCSymbol(ncNumber, id) {
        const storeName = `stateUpdateNC${ncNumber}`;
        try {
            await this.ready;
            const transaction = this.#db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('stateUpdateNCUpdated', { 
                        detail: { 
                            nc: ncNumber,
                            action: 'delete', 
                            id 
                        }
                    }));
                    resolve();
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Error deleting state update NC${ncNumber} symbol:`, error);
            throw error;
        }
    }

    async getFilteredNoiseCount() {
        try {
            await this.ready;
            const transaction = this.#db.transaction('filteredNoise', 'readonly');
            const store = transaction.objectStore('filteredNoise');
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const allRecords = request.result;
                    const totalCount = allRecords.reduce((sum, record) => sum + (record.count || 0), 0);
                    resolve(totalCount);
                };
                request.onerror = () => {
                    console.error('Error fetching filteredNoise records:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Database: Error in getFilteredNoiseCount:', error);
            throw error;
        }
    }

    async storeStateIntake(symbolData) {
        try {
            await this.ready;
            const transaction = this.#db.transaction('stateIntake', 'readwrite');
            const store = transaction.objectStore('stateIntake');
            
            // Verify the data structure
            console.log('Storing state intake:', {
                symbol: symbolData.symbol,
                type: symbolData.type, // Should be 'byte' or 'entropy'
                count: symbolData.count,
                timestamp: symbolData.timestamp
            });

            return new Promise((resolve, reject) => {
                const request = store.add(symbolData);
                request.onsuccess = () => {
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { store: 'stateIntake', action: 'add', data: symbolData }
                    }));
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error storing state intake:', error);
            throw error;
        }
    }

    initializeZeroStateButton() {
        const zeroStateButton = document.getElementById('zeroStateButton');
        if (zeroStateButton) {
            zeroStateButton.addEventListener('click', async () => {
                try {
                    // Get checkbox states
                    const intakeChecked = document.getElementById('zero-intake')?.checked || false;
                    const ncChecked = document.getElementById('zero-nc')?.checked || false;

                    console.log('Zeroing selected state stores:', {
                        intake: intakeChecked,
                        nc: ncChecked
                    });

                    // Clear stores based on checkbox states
                    if (intakeChecked) {
                        await this.clearStore('stateIntake');
                        window.dispatchEvent(new CustomEvent('stateIntakeUpdated', { 
                            detail: { action: 'clear' }
                        }));
                    }

                    if (ncChecked) {
                        // Clear all NC stores
                        await this.clearStore('stateUpdateNC1');
                        await this.clearStore('stateUpdateNC2');
                        await this.clearStore('stateUpdateNC3');
                        
                        // Dispatch events for each NC store
                        [1, 2, 3].forEach(ncNum => {
                            window.dispatchEvent(new CustomEvent('stateUpdateNCUpdated', { 
                                detail: { 
                                    nc: ncNum,
                                    action: 'clear'
                                }
                            }));
                        });
                    }

                    // Dispatch general store changed event
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { store: 'state', action: 'zero' }
                    }));

                } catch (error) {
                    console.error('Error zeroing state stores:', error);
                }
            });
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