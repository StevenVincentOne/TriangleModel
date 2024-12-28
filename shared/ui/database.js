// Singleton instance
let instance = null;

export class EnvironmentDatabase {
    #db = null;  // Private field for database

    constructor() {
        if (instance) {
            console.log('Returning existing database instance');
            return instance;
        }
        
        console.log('Creating new unified database instance');
        this.dbName = 'UnifiedTriangleDB';
        this.version = 1;
        this.ready = this.initDatabase();
        
        instance = this;
        return this;
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
                console.log('Creating database schema');
                const db = event.target.result;

                // Create environmental store
                if (!db.objectStoreNames.contains('environmental')) {
                    console.log('Creating environmental store');
                    const envStore = db.createObjectStore('environmental', { 
                        keyPath: 'id' 
                    });
                    envStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create processing store
                if (!db.objectStoreNames.contains('processing')) {
                    console.log('Creating processing store');
                    const procStore = db.createObjectStore('processing', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    procStore.createIndex('timestamp', 'timestamp', { unique: false });
                    procStore.createIndex('type', 'type', { unique: false });
                }

                console.log('Database schema created with stores:', 
                    Array.from(db.objectStoreNames));
            };

            request.onsuccess = (event) => {
                this.#db = event.target.result;
                console.log('Database connection established');
                console.log('Available stores:', Array.from(this.#db.objectStoreNames));
                resolve(this.#db);
            };
        });
    }

    async storeEnvironmentalPool(data) {
        try {
            await this.ready;
            console.log('Starting environmental pool storage with data:', {
                bitsLength: data.bits?.length || 0,
                noiseLength: data.noise?.length || 0,
                sampleBits: data.bits?.slice(0, 5),
                sampleNoise: data.noise?.slice(0, 5)
            });

            const transaction = this.#db.transaction(['environmental'], 'readwrite');
            const store = transaction.objectStore('environmental');

            return new Promise((resolve, reject) => {
                const request = store.put({
                    id: 'currentPool',
                    bits: data.bits || [],
                    noise: data.noise || [],
                    timestamp: Date.now()
                });

                request.onsuccess = () => {
                    console.log('Store request completed successfully');
                };

                transaction.oncomplete = () => {
                    console.log('Environmental pool stored successfully. Verifying...');
                    
                    // Verify the data was stored
                    const verifyTx = this.#db.transaction(['environmental'], 'readonly');
                    const verifyStore = verifyTx.objectStore('environmental');
                    const verifyRequest = verifyStore.get('currentPool');
                    
                    verifyRequest.onsuccess = () => {
                        const storedData = verifyRequest.result;
                        console.log('Verification read:', {
                            bitsLength: storedData?.bits?.length || 0,
                            noiseLength: storedData?.noise?.length || 0,
                            sampleBits: storedData?.bits?.slice(0, 5),
                            sampleNoise: storedData?.noise?.slice(0, 5)
                        });
                    };
                    
                    resolve(true);
                };

                transaction.onerror = (error) => {
                    console.error('Error storing environmental pool:', error);
                    reject(error);
                };
            });
        } catch (error) {
            console.error('Error in storeEnvironmentalPool:', error);
            throw error;
        }
    }

    async getEnvironmentalPool() {
        try {
            await this.ready;
            console.log('Getting environmental pool...');

            const transaction = this.#db.transaction(['environmental'], 'readonly');
            const store = transaction.objectStore('environmental');

            return new Promise((resolve, reject) => {
                const request = store.get('currentPool');

                request.onsuccess = () => {
                    const result = request.result;
                    console.log('Retrieved environmental pool:', {
                        bitsLength: result?.bits?.length || 0,
                        noiseLength: result?.noise?.length || 0,
                        sampleBits: result?.bits?.slice(0, 5),
                        sampleNoise: result?.noise?.slice(0, 5)
                    });
                    resolve(result);
                };

                request.onerror = (error) => {
                    console.error('Error retrieving environmental pool:', error);
                    reject(error);
                };
            });
        } catch (error) {
            console.error('Error in getEnvironmentalPool:', error);
            throw error;
        }
    }

    async storeProcessedSymbol(data) {
        try {
            await this.ready;
            console.log('Storing processed symbol:', data);

            const transaction = this.#db.transaction(['processing'], 'readwrite');
            const store = transaction.objectStore('processing');

            return new Promise((resolve, reject) => {
                const request = store.add({
                    ...data,
                    timestamp: Date.now()
                });

                request.onsuccess = () => {
                    console.log('Processed symbol stored successfully');
                    resolve(true);
                };

                request.onerror = (error) => {
                    console.error('Error storing processed symbol:', error);
                    reject(error);
                };
            });
        } catch (error) {
            console.error('Error in storeProcessedSymbol:', error);
            throw error;
        }
    }

    async getProcessedSymbols() {
        try {
            await this.ready;
            const transaction = this.#db.transaction(['processing'], 'readonly');
            const store = transaction.objectStore('processing');

            return new Promise((resolve, reject) => {
                const request = store.getAll();

                request.onsuccess = () => {
                    const result = request.result;
                    console.log('Retrieved processed symbols:', result.length);
                    resolve(result);
                };

                request.onerror = (error) => {
                    console.error('Error retrieving processed symbols:', error);
                    reject(error);
                };
            });
        } catch (error) {
            console.error('Error in getProcessedSymbols:', error);
            throw error;
        }
    }
}

// Create and export a single instance
export const environmentDB = new EnvironmentDatabase();

// Prevent creation of new instances
Object.freeze(environmentDB);