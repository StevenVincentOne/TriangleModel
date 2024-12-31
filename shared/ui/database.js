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

        
        this.dbName = 'UnifiedTriangleDB';
        this.version = 2;
        this.ready = this.initDatabase();
        this.initializeZeroButton();

        EnvironmentDatabase.instance = this;
    }

    async initDatabase() {
        if (this.#db) {
            console.log('Database already initialized');
            return this.#db;
        }

        return new Promise((resolve, reject) => {
            console.log('Initializing unified database...');
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                console.log('Creating/upgrading database schema');
                const db = event.target.result;

                // Create stores if they don't exist
                if (!db.objectStoreNames.contains('environment')) {
                    const envStore = db.createObjectStore('environment', { keyPath: 'id', autoIncrement: true });
                    envStore.createIndex('type', 'type', { unique: false });
                    envStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('processing')) {
                    const procStore = db.createObjectStore('processing', { keyPath: 'id', autoIncrement: true });
                    procStore.createIndex('type', 'type', { unique: false });
                    procStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('converted')) {
                    const convStore = db.createObjectStore('converted', { keyPath: 'id', autoIncrement: true });
                    convStore.createIndex('type', 'type', { unique: false });
                    convStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('Database schema created with stores:', Array.from(db.objectStoreNames));
            };

            request.onsuccess = (event) => {
                this.#db = event.target.result;
                console.log('Database connection established');
                resolve(this.#db);
            };
        });
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

    async getEnvironmentalPool() {
        try {
            await this.ready;
            const transaction = this.#db.transaction('environment', 'readonly');
            const store = transaction.objectStore('environment');
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    
                    resolve(event.target.result);
                };
                request.onerror = (event) => {
                    console.error('Error getting environmental pool:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('Error in getEnvironmentalPool:', error);
            return [];
        }
    }

    async getEnvironmentSymbols() {
        return this.getEnvironmentalPool(); // Alias for compatibility
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

    async getProcessedSymbols() {
        try {
            if (!this.#db) {
                await this.ready;
            }

            const transaction = this.#db.transaction('processing', 'readonly');
            const store = transaction.objectStore('processing');
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (this.debugLogging) {
                        console.log('Retrieved processed symbols:', request.result.length);
                    }
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error('Error getting processed symbols:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in getProcessedSymbols:', error);
            return [];
        }
    }

    async deleteProcessedSymbol(id) {
        try {
            if (!this.#db) {
                await this.ready;
            }

            const transaction = this.#db.transaction('processing', 'readwrite');
            const store = transaction.objectStore('processing');
            const request = store.delete(id);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (this.debugLogging) {
                        console.log('Deleted processed symbol with id:', id);
                    }
                    resolve();
                };

                request.onerror = () => {
                    console.error('Error deleting processed symbol:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in deleteProcessedSymbol:', error);
            throw error;
        }
    }

    async storeConvertedSymbol(symbolData) {
        try {
            if (!this.#db) {
                await this.ready;
            }

            const transaction = this.#db.transaction('converted', 'readwrite');
            const store = transaction.objectStore('converted');
            const request = store.add(symbolData);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (this.debugLogging) {
                        console.log('Stored converted symbol:', symbolData);
                    }
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error('Error storing converted symbol:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in storeConvertedSymbol:', error);
            throw error;
        }
    }

    async getConvertedSymbols() {
        try {
            if (!this.#db) {
                await this.ready;
            }

            const transaction = this.#db.transaction('converted', 'readonly');
            const store = transaction.objectStore('converted');
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    if (this.debugLogging) {
                        console.log('Retrieved converted symbols:', request.result.length);
                    }
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error('Error getting converted symbols:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Error in getConvertedSymbols:', error);
            return [];
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
            if (!this.#db) {
                await this.ready;
            }

            const transaction = this.#db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log(`Cleared ${storeName} store`);
                    // Dispatch custom event
                    window.dispatchEvent(new CustomEvent('storeChanged', { 
                        detail: { store: storeName, action: 'clear' }
                    }));
                    console.log(`Dispatched 'storeChanged' event for store: ${storeName}`);
                    resolve();
                };
                
                request.onerror = () => {
                    console.error(`Error clearing ${storeName} store:`, request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error(`Error in clearStore(${storeName}):`, error);
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
                const envChecked = document.getElementById('zero-environment').checked;
                const procChecked = document.getElementById('zero-processing').checked;
                const convChecked = document.getElementById('zero-converted').checked;

                console.log('Zeroing selected stores:', {
                    environment: envChecked,
                    processing: procChecked,
                    converted: convChecked
                });

                if (envChecked) await this.clearStore('environment');
                if (procChecked) await this.clearStore('processing');
                if (convChecked) await this.clearStore('converted');
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
}

// Add this right after the existing EnvironmentDatabase class code
console.log('Database module loaded');

// Create and export a single instance
export const environmentDB = new EnvironmentDatabase();
console.log('Database instance created');

// Prevent creation of new instances
Object.freeze(environmentDB);
console.log('Database instance frozen');