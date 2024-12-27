class TriangleDatabase {
    constructor() {
        this.initialized = false;
        this.tokenClient = null;
        this.accessToken = null;
        
        // Keep your existing configuration constants
        this.API_KEY = 'AIzaSyCQh02aAcYmvvGJVVJFwRFOQ5Ptvug8dOQ';
        this.CLIENT_ID = '66954381705-rib6tkc4qse6rdue4id2e1svmb6otm24.apps.googleusercontent.com';
        this.SPREADSHEET_ID = '1LN0wA4gUY0XFdY_v8SlHvwMeu1A4_X8t56FF2mP1l40';
        this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
        this.DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
    }

    async init() {
        try {
            // Wait for both Google API libraries to load
            await new Promise((resolve, reject) => {
                const checkGAPILoaded = () => {
                    if (window.gapi && window.google) {
                        resolve();
                    } else {
                        setTimeout(checkGAPILoaded, 100);
                    }
                };
                checkGAPILoaded();
            });

            // Initialize the tokenClient
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: '', // We'll handle this in getAccessToken
            });

            // Initialize gapi client
            await new Promise((resolve, reject) => {
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: this.API_KEY,
                            discoveryDocs: [this.DISCOVERY_DOC],
                        });
                        this.initialized = true;
                        resolve();
                    } catch (error) {
                        console.error('Error initializing Google Sheets API:', error);
                        reject(error);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to initialize Google Sheets:', error);
            throw error;
        }
    }

    async getAccessToken() {
        return new Promise((resolve, reject) => {
            try {
                this.tokenClient.callback = (response) => {
                    if (response.error !== undefined) {
                        reject(response);
                    }
                    this.accessToken = response.access_token;
                    resolve(response.access_token);
                };
                
                if (this.accessToken === null) {
                    // Request a new token
                    this.tokenClient.requestAccessToken({ prompt: 'consent' });
                } else {
                    // Use existing token
                    resolve(this.accessToken);
                }
            } catch (error) {
                console.error('Error getting access token:', error);
                reject(error);
            }
        });
    }

    /**
     * Saves the provided values to Google Sheets.
     * @param {Object} values - The data to append to the spreadsheet.
     */
    async saveToGoogleSheets(values) {
        try {
            console.log('Starting saveToGoogleSheets with values:', values);

            // Ensure we have a valid token
            await this.getAccessToken();

            // Get current headers
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: 'Sheet1!A1:ZZ1'
            });

            let currentHeaders = response.result.values?.[0] || [];
            console.log('Current headers:', currentHeaders);

            // Get all keys from the values object
            const allKeys = Object.keys(values);
            
            // Ensure State and Notes are first, ID is last
            const orderedKeys = ['State', 'Notes'];
            allKeys.forEach(key => {
                if (key !== 'State' && key !== 'Notes' && key !== 'ID') {
                    orderedKeys.push(key);
                }
            });
            orderedKeys.push('ID');

            // Update headers if needed
            if (JSON.stringify(currentHeaders) !== JSON.stringify(orderedKeys)) {
                console.log('Updating headers...');
                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: this.SPREADSHEET_ID,
                    range: `Sheet1!A1:${this.numberToColumn(orderedKeys.length)}1`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [orderedKeys]
                    }
                });
                currentHeaders = orderedKeys;
            }

            // Create row data using ordered headers
            const rowData = orderedKeys.map(header => {
                const value = values[header];
                return value === Infinity ? '∞' : (value ?? '');
            });

            // Append the row
            const appendResponse = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `Sheet1!A1:${this.numberToColumn(orderedKeys.length)}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [rowData]
                }
            });

            console.log('Save successful:', appendResponse);
            return true;

        } catch (error) {
            console.error('Error in saveToGoogleSheets:', {
                message: error.message,
                response: error.result,
                status: error.status,
                error
            });
            throw error;
        }
    }

    async addNewColumns(existingHeaders, newColumns) {
        try {
            const startCol = this.numberToColumn(existingHeaders.length + 1);
            const endCol = this.numberToColumn(existingHeaders.length + newColumns.length);

            const response = await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `Sheet1!${startCol}1:${endCol}1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [newColumns]
                }
            });

            if (response.status !== 200) {
                throw new Error(`Failed to update columns: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Error adding new columns:', {
                message: error.message,
                response: error.result,
                status: error.status,
                error
            });
            throw error;
        }
    }

    numberToColumn(num) {
        let column = '';
        while (num > 0) {
            const modulo = (num - 1) % 26;
            column = String.fromCharCode(65 + modulo) + column;
            num = Math.floor((num - modulo) / 26);
        }
        return column;
    }

    async saveState() {
        try {
            // Make sure we're initialized and have a valid token
            if (!this.initialized) {
                await this.init();
            }
            
            // Get a fresh access token
            await this.getAccessToken();

            // Prompt user for State name and Notes
            const { stateName, notes, cancelled } = await this.promptStateDetails();
            if (cancelled) {
                return false;  // Exit early without showing success message
            }

            // Get next available ID
            const nextId = await this.getNextStateId();
            
            console.log('Starting data collection...');
            const collectedData = {
                // Add State and Notes first
                'State': stateName,
                'Notes': notes || '',
                
                // System - Nodes
                'N1 Angle': document.getElementById('node-n1-angle')?.value || '',
                'N2 Angle': document.getElementById('node-n2-angle')?.value || '',
                'N3 Angle': document.getElementById('node-n3-angle')?.value || '',
                'N1 (xy)': document.getElementById('node1-coords')?.value || '',
                'N2 (xy)': document.getElementById('node2-coords')?.value || '',
                'N3 (xy)': document.getElementById('node3-coords')?.value || '',

                // Node Channels
                'NC1': document.getElementById('channel-1')?.value || '',
                'NC2': document.getElementById('channel-2')?.value || '',
                'NC3': document.getElementById('channel-3')?.value || '',

                // I-Channels
                'IC1': document.getElementById('ic-1')?.value || '',
                'IC2': document.getElementById('ic-2')?.value || '',
                'IC3': document.getElementById('ic-3')?.value || '',

                // Medians
                'M1 (xy)': document.getElementById('mid1-coords')?.value || '',
                'M2 (xy)': document.getElementById('mid2-coords')?.value || '',
                'M3 (xy)': document.getElementById('mid3-coords')?.value || '',
                'ml1': document.getElementById('median1-length')?.value || '',
                'ml2': document.getElementById('median2-length')?.value || '',
                'ml3': document.getElementById('median3-length')?.value || '',

                // Altitudes
                'Af1 (xy)': document.getElementById('altitude1-coords')?.value || '',
                'Af2 (xy)': document.getElementById('altitude2-coords')?.value || '',
                'Af3 (xy)': document.getElementById('altitude3-coords')?.value || '',
                'Al1': document.getElementById('altitude1-length')?.value || '',
                'Al2': document.getElementById('altitude2-length')?.value || '',
                'Al3': document.getElementById('altitude3-length')?.value || '',

                // System Entropy and Capacity
                'H': document.getElementById('system-h')?.value || '',
                'C': document.getElementById('system-c')?.value || '',
                'HP': document.getElementById('system-sph')?.value || '',
                'HIC': document.getElementById('system-mch')?.value || '',
                'HP/HIC': document.getElementById('hp-hic-ratio')?.value || '',
                'HIC/HP': document.getElementById('hic-hp-ratio')?.value || '',
                'HP/H': document.getElementById('hp-h-ratio')?.value || '',
                'H/HP': document.getElementById('h-hp-ratio')?.value || '',
                'HIC/H': document.getElementById('hic-h-ratio')?.value || '',
                'H/HIC': document.getElementById('h-hic-ratio')?.value || '',

                // Subsystems
                'ss∠1': document.getElementById('subsystem-1-angle')?.value || '',
                'ssh1': document.getElementById('subsystem-1-perimeter')?.value || '',
                'ssc1': document.getElementById('subsystem-1-area')?.value || '',
                'ssh/ssc1': document.getElementById('subsystem-1-ratio')?.value || '',
                'ssc/ssh1': document.getElementById('subsystem-1-inverse-ratio')?.value || '',
                'ssh/H1': document.getElementById('subsystem-1-system-ratio')?.value || '',
                'H/ssh1': document.getElementById('subsystem-1-entropy-ratio')?.value || '',

                'ss∠2': document.getElementById('subsystem-2-angle')?.value || '',
                'ssh2': document.getElementById('subsystem-2-perimeter')?.value || '',
                'ssc2': document.getElementById('subsystem-2-area')?.value || '',
                'ssh/ssc2': document.getElementById('subsystem-2-ratio')?.value || '',
                'ssc/ssh2': document.getElementById('subsystem-2-inverse-ratio')?.value || '',
                'ssh/H2': document.getElementById('subsystem-2-system-ratio')?.value || '',
                'H/ssh2': document.getElementById('subsystem-2-entropy-ratio')?.value || '',

                'ss∠3': document.getElementById('subsystem-3-angle')?.value || '',
                'ssh3': document.getElementById('subsystem-3-perimeter')?.value || '',
                'ssc3': document.getElementById('subsystem-3-area')?.value || '',
                'ssh/ssc3': document.getElementById('subsystem-3-ratio')?.value || '',
                'ssc/ssh3': document.getElementById('subsystem-3-inverse-ratio')?.value || '',
                'ssh/H3': document.getElementById('subsystem-3-system-ratio')?.value || '',
                'H/ssh3': document.getElementById('subsystem-3-entropy-ratio')?.value || '',

                // Euler Line
                'O (xy)': document.getElementById('circumcenter-coords')?.value || '',
                'I (xy)': document.getElementById('centroid-coords')?.value || '',
                'SP (xy)': document.getElementById('subcenter-coords')?.value || '',
                'NP (xy)': document.getElementById('nine-point-coords')?.value || '',
                'HO (xy)': document.getElementById('orthocenter-coords')?.value || '',
                'EL': document.getElementById('euler-line-length')?.value || '',
                'mEL': document.getElementById('euler-line-slope')?.value || '',
                'θEL': document.getElementById('euler-line-angle')?.value || '',
                'O-I/EL': document.getElementById('o-i-ratio')?.value || '',
                'I-SP/EL': document.getElementById('i-sp-ratio')?.value || '',
                'SP-NP/EL': document.getElementById('sp-np-ratio')?.value || '',
                'NP-HO/EL': document.getElementById('np-ho-ratio')?.value || '',
                'NC1 θa': document.getElementById('nc1-acute')?.value || '',
                'NC1 θo': document.getElementById('nc1-obtuse')?.value || '',
                'NC2 θa': document.getElementById('nc2-acute')?.value || '',
                'NC2 θo': document.getElementById('nc2-obtuse')?.value || '',
                'NC3 θa': document.getElementById('nc3-acute')?.value || '',
                'NC3 θo': document.getElementById('nc3-obtuse')?.value || '',

                // Incircle Panel
                'IN (xy)': document.getElementById('incenter-coords')?.value || '',
                'T1 (xy)': document.getElementById('tan1-coords')?.value || '',
                'T2 (xy)': document.getElementById('tan2-coords')?.value || '',
                'T3 (xy)': document.getElementById('tan3-coords')?.value || '',
                'd(I,IN)': document.getElementById('d-i-in')?.value || '',
                'd(IN,ssi1)': document.getElementById('d-in-ssi1')?.value || '',
                'd(IN,ssi2)': document.getElementById('d-in-ssi2')?.value || '',
                'd(IN,ssi3)': document.getElementById('d-in-ssi3')?.value || '',
                'rIN': document.getElementById('inradius')?.value || '',
                'CIN': document.getElementById('incircle-capacity')?.value || '',
                'HIN': document.getElementById('incircle-entropy')?.value || '',
                'CIN/HIN': document.getElementById('cin-hin-ratio')?.value || '',
                'HIN/CIN': document.getElementById('hin-cin-ratio')?.value || '',
                'CIN/C': document.getElementById('cin-c-ratio')?.value || '',
                'HIN/H': document.getElementById('hin-h-ratio')?.value || '',
                'd(M,T)1': document.getElementById('d-m-t-n1')?.value || '',
                'd(M,T)2': document.getElementById('d-m-t-n2')?.value || '',
                'd(M,T)3': document.getElementById('d-m-t-n3')?.value || '',
                'r(M,T)1': document.getElementById('r-m-t-n1')?.value || '',
                'r(M,T)2': document.getElementById('r-m-t-n2')?.value || '',
                'r(M,T)3': document.getElementById('r-m-t-n3')?.value || '',
                'rNC(M,T)1': document.getElementById('r-m-t-nc1')?.value || '',
                'rNC(M,T)2': document.getElementById('r-m-t-nc2')?.value || '',
                'rNC(M,T)3': document.getElementById('r-m-t-nc3')?.value || '',

                // ID must be last
                'ID': nextId
            };

            console.log('Final collected data:', collectedData);
            
            // Save to Google Sheets
            await this.saveToGoogleSheets(collectedData);
            return true;  // Only return true if save was successful

        } catch (error) {
            console.error('Error in saveState:', {
                message: error.message,
                stack: error.stack,
                error
            });
            // Improve error message
            throw new Error(error.result?.error?.message || 'Failed to save state');
        }
    }

    async promptStateDetails() {
        return new Promise((resolve) => {
            // Create modal div
            const modalDiv = document.createElement('div');
            modalDiv.className = 'modal-overlay save-state-dialog';
            modalDiv.innerHTML = `
                <div class="modal-content">
                    <h2>Save State Details</h2>
                    <div class="form-group">
                        <label for="stateName">State Name *</label>
                        <input type="text" id="stateName" required>
                    </div>
                    <div class="form-group">
                        <label for="stateNotes">Notes (optional)</label>
                        <textarea id="stateNotes" rows="3"></textarea>
                    </div>
                    <div class="button-container">
                        <button type="button" class="cancel">Cancel</button>
                        <button type="button" class="save">Save</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modalDiv);

            // Get input elements
            const stateNameInput = modalDiv.querySelector('#stateName');
            const stateNotesInput = modalDiv.querySelector('#stateNotes');

            // Handle save button click
            const handleSave = () => {
                const stateName = stateNameInput.value.trim();
                const notes = stateNotesInput.value.trim();

                if (!stateName) {
                    alert('Please enter a state name');
                    return;
                }

                modalDiv.remove();
                console.log('Resolving with:', { stateName, notes, cancelled: false });
                resolve({ stateName, notes, cancelled: false });
            };

            // Handle cancel
            const handleCancel = () => {
                modalDiv.remove();
                console.log('Resolving with cancelled: true');
                resolve({ stateName: null, notes: null, cancelled: true });
            };

            // Add event listeners
            modalDiv.querySelector('.save').addEventListener('click', handleSave);
            modalDiv.querySelector('.cancel').addEventListener('click', handleCancel);

            // Add enter key support
            stateNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSave();
                }
            });

            // Focus the input field
            stateNameInput.focus();
        });
    }

    async getNextStateId() {
        try {
            // Get all values from the sheet
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: 'Sheet1'  // Get all data
            });

            const values = response.result.values || [];
            if (values.length === 0) return 1;  // Empty sheet

            // Find the ID column index (should be last column)
            const headers = values[0];
            const idColumnIndex = headers.indexOf('ID');
            
            if (idColumnIndex === -1) return 1;  // No ID column yet

            // Get all IDs, skipping header row
            const ids = values.slice(1)
                .map(row => row[idColumnIndex])
                .filter(id => id && !isNaN(id))
                .map(Number);

            // Return max + 1, or 1 if no valid IDs
            return ids.length > 0 ? Math.max(...ids) + 1 : 1;

        } catch (error) {
            console.error('Error getting next state ID:', {
                message: error.message,
                response: error.result,
                status: error.status,
                error
            });
            // Return 1 if there's an error
            return 1;
        }
    }

    exportToCSV() {
        console.log('Exporting data');
        
        // Initialize CSV content with headers
        let csvContent = "data:text/csv;charset=utf-8,Section,Label,Value\n";

        // Function to process a panel's data
        const processPanel = (panel, sectionName) => {
            console.log(`Processing section: ${sectionName}`);
            // Get all label-value pairs
            const labelValuePairs = panel.querySelectorAll('.label-value-pair');
            console.log(`Found ${labelValuePairs.length} label-value pairs`);
            labelValuePairs.forEach(pair => {
                const label = pair.querySelector('label')?.textContent.trim() || '';
                const value = pair.querySelector('input')?.value || '';
                console.log(`Found pair - Label: ${label}, Value: ${value}`);
                csvContent += `"${sectionName}","${label}","${value}"\n`;
            });

            // Special handling for subsystems table if it exists
            const subsystemsTable = panel.querySelector('.subsystems-table');
            if (subsystemsTable) {
                const headers = Array.from(subsystemsTable.querySelectorAll('thead th'))
                    .map(th => th.textContent.trim())
                    .filter(text => text !== '');
                
                const rows = subsystemsTable.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const rowHeader = row.querySelector('th').textContent.trim();
                    const inputs = row.querySelectorAll('input');
                    inputs.forEach((input, index) => {
                        const label = `${rowHeader} ${headers[index]}`;
                        csvContent += `"${sectionName}","${label}","${input.value}"\n`;
                    });
                });
            }
        };

        // Process each panel
        const panels = document.querySelectorAll('.panel');
        panels.forEach(panel => {
            const title = panel.querySelector('.panel-title')?.textContent.trim() || 'Untitled Section';
            processPanel(panel, title);
        });

        console.log('Export complete');

        // Create and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'triangle_state.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export class EnvironmentDatabase {
    constructor() {
        this.dbName = 'TriangleSystemDB';
        this.version = 1;
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        try {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('environmentalPool')) {
                    const environmentalStore = db.createObjectStore('environmentalPool', { keyPath: 'id' });
                    environmentalStore.createIndex('type', 'type', { unique: false });
                }

                if (!db.objectStoreNames.contains('triangleSystemPool')) {
                    const triangleStore = db.createObjectStore('triangleSystemPool', { keyPath: 'id' });
                    triangleStore.createIndex('type', 'type', { unique: false });
                }

                if (!db.objectStoreNames.contains('simulationStates')) {
                    const statesStore = db.createObjectStore('simulationStates', { keyPath: 'timestamp' });
                    statesStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('flowMetrics')) {
                    const metricsStore = db.createObjectStore('flowMetrics', { keyPath: 'timestamp' });
                    metricsStore.createIndex('type', 'type', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Environment Database initialized successfully');
            };
        } catch (error) {
            console.error('Error initializing environment database:', error);
        }
    }

    // Store environmental data pool
    async storeEnvironmentalPool(data) {
        try {
            const transaction = this.db.transaction(['environmentalPool'], 'readwrite');
            const store = transaction.objectStore('environmentalPool');
            
            await store.put({
                id: 'currentPool',
                type: 'environmental',
                bits: data.bits,
                noise: data.noise,
                metrics: data.metrics,
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            console.error('Error storing environmental pool:', error);
            return false;
        }
    }

    // Retrieve environmental data pool
    async getEnvironmentalPool() {
        try {
            const transaction = this.db.transaction(['environmentalPool'], 'readonly');
            const store = transaction.objectStore('environmentalPool');
            const request = store.get('currentPool');

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error retrieving environmental pool:', error);
            return null;
        }
    }

    // Store simulation state
    async saveSimulationState(state, name = 'default') {
        try {
            const transaction = this.db.transaction(['simulationStates'], 'readwrite');
            const store = transaction.objectStore('simulationStates');
            
            await store.put({
                timestamp: Date.now(),
                name,
                environmentalPool: state.environmentalPool,
                triangleSystemPool: state.triangleSystemPool,
                metrics: state.metrics
            });

            return true;
        } catch (error) {
            console.error('Error saving simulation state:', error);
            return false;
        }
    }

    // Load simulation state
    async loadSimulationState(timestamp) {
        try {
            const transaction = this.db.transaction(['simulationStates'], 'readonly');
            const store = transaction.objectStore('simulationStates');
            const request = store.get(timestamp);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error loading simulation state:', error);
            return null;
        }
    }
}

// Export the class
export { TriangleDatabase };