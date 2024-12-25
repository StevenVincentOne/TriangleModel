export class PresetManager {
    constructor(triangleSystem) {
        // Wait for RulesModule to be available
        if (!triangleSystem || !triangleSystem.rulesModule) {
            console.warn('Waiting for RulesModule to be available...');
            setTimeout(() => this.initialize(triangleSystem), 100);
            return;
        }

        this.initialize(triangleSystem);
    }

    initialize(triangleSystem) {
        if (!triangleSystem || !triangleSystem.rulesModule) {
            console.warn('RulesModule still not available, retrying...');
            setTimeout(() => this.initialize(triangleSystem), 100);
            return;
        }

        console.log('RulesModule found, initializing PresetManager');
        this.triangleSystem = triangleSystem;
        this.isAnimating = false;
        this.animationLoop = null;
        
        // Initialize dropdowns with more specific selectors
        this.userPresetsDropdown = document.querySelector('button#userPresetsDropdown');
        this.presetsList = document.querySelector('ul#userPresetsList');
        this.animationsDropdown = document.querySelector('button#animationsDropdown');
        this.animationsList = document.querySelector('ul#animationsList');
        
        // Add debug logging
        console.log('Dropdown elements:', {
            userPresetsDropdown: this.userPresetsDropdown,
            presetsList: this.presetsList,
            animationsDropdown: this.animationsDropdown,
            animationsList: this.animationsList
        });

        this.initializePresetsDropdown();
        this.initializeAnimationsDropdown();
        this.setupSavePresetButton();
        // Removed custom setupEventListeners to rely on Bootstrap's handling
    }

    initializePresetsDropdown() {
        if (!this.presetsList) {
            console.error('Presets list element not found');
            return;
        }

        try {
            // Clear existing items
            this.presetsList.innerHTML = '';
            
            // Get presets from localStorage
            const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
            console.log('Loading presets from storage:', presets);
            
            const sortedNames = Object.keys(presets).sort();
            console.log('Sorted preset names:', sortedNames);
            
            sortedNames.forEach(name => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                a.href = '#';
                a.textContent = name;
                
                a.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.loadPreset(name, presets[name]);
                };
                
                li.appendChild(a);
                this.presetsList.appendChild(li);
            });

            console.log('Presets dropdown populated with items:', this.presetsList.children.length);
        } catch (error) {
            console.error('Error initializing presets dropdown:', error);
        }
    }

    initializeAnimationsDropdown() {
        if (!this.animationsList) {
            console.error('Animations list element not found');
            return;
        }

        try {
            // Clear existing items
            this.animationsList.innerHTML = '';
            
            // Get animations from localStorage
            const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
            console.log('Loading animations from storage:', animations);
            
            const sortedNames = Object.keys(animations).sort();
            console.log('Sorted animation names:', sortedNames);
            
            sortedNames.forEach(name => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                a.href = '#';
                a.textContent = name;
                
                a.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.loadAnimationPreset(name, animations[name]);
                };
                
                li.appendChild(a);
                this.animationsList.appendChild(li);
            });

            console.log('Animations dropdown populated with items:', this.animationsList.children.length);
        } catch (error) {
            console.error('Error initializing animations dropdown:', error);
        }
    }

    // ... Other methods like loadPreset, loadAnimationPreset, editPreset, deletePreset, etc.

    // Example loadPreset method
    loadPreset(name, preset) {
        console.log(`Loading preset: ${name}`, preset);
        // Implement the logic to apply the preset
    }

    // Example loadAnimationPreset method
    loadAnimationPreset(name, animation) {
        console.log(`Loading animation preset: ${name}`, animation);
        
        try {
            // Populate start values
            document.getElementById('animation-nc1-start').value = animation.start.nc1;
            document.getElementById('animation-nc2-start').value = animation.start.nc2;
            document.getElementById('animation-nc3-start').value = animation.start.nc3;
            
            // Populate end values
            document.getElementById('animation-nc1-end').value = animation.end.nc1;
            document.getElementById('animation-nc2-end').value = animation.end.nc2;
            document.getElementById('animation-nc3-end').value = animation.end.nc3;
            
            console.log('Animation preset values populated successfully');
        } catch (error) {
            console.error('Error populating animation input fields:', error);
        }
    }

    setupEventListeners() {
        if (!this.userPresetsDropdown || !this.presetsList || 
            !this.animationsDropdown || !this.animationsList) {
            console.error('Required dropdown elements not found');
            return;
        }

        // Initialize Bootstrap dropdowns
        const userPresetsBS = new bootstrap.Dropdown(this.userPresetsDropdown);
        const animationsBS = new bootstrap.Dropdown(this.animationsDropdown);

        this.userPresetsDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Toggle presets dropdown');
            userPresetsBS.toggle();
            animationsBS.hide(); // Close other dropdown
        });

        this.animationsDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Toggle animations dropdown');
            animationsBS.toggle();
            userPresetsBS.hide(); // Close other dropdown
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.userPresetsDropdown.contains(e.target) && 
                !this.presetsList.contains(e.target)) {
                userPresetsBS.hide();
            }
            if (!this.animationsDropdown.contains(e.target) && 
                !this.animationsList.contains(e.target)) {
                animationsBS.hide();
            }
        });
    }

    loadPreset(name, values) {
        try {
            console.log('Loading preset:', name, values);
            
            // Update vertex positions directly
            if (this.triangleSystem) {
                // Update the system's vertices
                this.triangleSystem.system = {
                    ...this.triangleSystem.system,
                    n1: { 
                        x: parseFloat(values.n1?.x) || 0, 
                        y: parseFloat(values.n1?.y) || 0 
                    },
                    n2: { 
                        x: parseFloat(values.n2?.x) || 0, 
                        y: parseFloat(values.n2?.y) || 0 
                    },
                    n3: { 
                        x: parseFloat(values.n3?.x) || 0, 
                        y: parseFloat(values.n3?.y) || 0 
                    },
                    intelligence: { x: 0, y: 0 }  // Reset intelligence point
                };
                
                // Recalculate derived points
                this.triangleSystem.updateDerivedPoints();
                
                // Update display
                this.triangleSystem.drawSystem();
                this.triangleSystem.updateDashboard();
                
                console.log('Triangle system updated directly');
            } else {
                console.error('Triangle system reference not found');
            }

            // Close the dropdown
            this.presetsList.classList.remove('show');

            console.log('Preset loaded and applied successfully');
        } catch (error) {
            console.error('Error loading preset:', error);
        }
    }

    startAnimation() {
        console.log('startAnimation called, current state:', { 
            isAnimating: this.isAnimating, 
            hasLoop: !!this.animationLoop 
        });

        // If already animating, stop the animation
        if (this.isAnimating) {
            console.log('Stopping existing animation');
            this.stopAnimation();
            return;
        }

        try {
            const { startState, endState } = this.getAnimationStates();
            console.log('Animation values:', { startState, endState });

            // Reset to start position
            this.triangleSystem.updateTriangleFromEdges(startState.nc1, startState.nc2, startState.nc3);
            
            // Animation parameters
            const duration = 4000;
            let startTime = null;
            let forward = true;
            this.isAnimating = true;

            const animate = (currentTime) => {
                if (!this.isAnimating) {
                    console.log('Animation stopped');
                    return;
                }

                if (startTime === null) {
                    startTime = currentTime;
                }

                const elapsed = currentTime - startTime;
                let progress = (elapsed % duration) / duration;
                const loopCheckbox = document.getElementById('animation-loop');
                const isLooping = loopCheckbox?.checked;

                if (!isLooping && elapsed >= duration) {
                    console.log('Animation complete');
                    this.triangleSystem.updateTriangleFromEdges(endState.nc1, endState.nc2, endState.nc3);
                    this.stopAnimation();
                    return;
                } else if (isLooping && elapsed >= duration) {
                    forward = !forward;
                    startTime = currentTime;
                    progress = 0;
                }

                const effectiveProgress = forward ? progress : 1 - progress;
                const current = {
                    nc1: startState.nc1 + (endState.nc1 - startState.nc1) * effectiveProgress,
                    nc2: startState.nc2 + (endState.nc2 - startState.nc2) * effectiveProgress,
                    nc3: startState.nc3 + (endState.nc3 - startState.nc3) * effectiveProgress
                };

                this.triangleSystem.updateTriangleFromEdges(current.nc1, current.nc2, current.nc3);
                this.animationLoop = requestAnimationFrame(animate);
            };

            this.animationLoop = requestAnimationFrame(animate);
            console.log('Animation started');

        } catch (error) {
            console.error('Error in startAnimation:', error);
            this.stopAnimation();
        }
    }

    stopAnimation() {
        this.isAnimating = false;
        if (this.animationLoop) {
            cancelAnimationFrame(this.animationLoop);
            this.animationLoop = null;
        }
    }

    // Keep existing playAnimation method
    playAnimation(name, config) {
        console.log('Playing animation:', name, config);
        if (this.triangleSystem) {
            // Populate start values
            const startNc1Input = document.getElementById('animation-nc1-start');
            const startNc2Input = document.getElementById('animation-nc2-start');
            const startNc3Input = document.getElementById('animation-nc3-start');

            if (startNc1Input && startNc2Input && startNc3Input) {
                startNc1Input.value = config.start.nc1;
                startNc2Input.value = config.start.nc2;
                startNc3Input.value = config.start.nc3;
                console.log('Updated start fields:', config.start);
            } else {
                console.error('Some animation start input fields not found');
            }

            // Populate end values
            const endNc1Input = document.getElementById('animation-nc1-end');
            const endNc2Input = document.getElementById('animation-nc2-end');
            const endNc3Input = document.getElementById('animation-nc3-end');

            if (endNc1Input && endNc2Input && endNc3Input) {
                endNc1Input.value = config.end.nc1;
                endNc2Input.value = config.end.nc2;
                endNc3Input.value = config.end.nc3;
                console.log('Updated end fields:', config.end);
            } else {
                console.error('Some animation end input fields not found');
            }

            // Optional: Update the current triangle to match start position
            this.triangleSystem.system = {
                ...this.triangleSystem.system,
                nc1: config.start.nc1,
                nc2: config.start.nc2,
                nc3: config.start.nc3
            };
            this.triangleSystem.drawSystem();
        }
    }

    editPreset(name, values) {
        const newName = prompt('Enter new name for preset:', name);
        if (newName && newName !== name) {
            try {
                // Get current presets
                const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
                
                // Delete old name and add with new name
                delete presets[name];
                presets[newName] = values;
                
                // Save back to storage
                localStorage.setItem('userPresets', JSON.stringify(presets));
                
                // Refresh dropdown
                this.initializePresetsDropdown();
                
                console.log('Preset renamed:', name, 'to', newName);
            } catch (error) {
                console.error('Error editing preset:', error);
                alert('Error editing preset. Please try again.');
            }
        }
    }

    deletePreset(name) {
        if (confirm(`Are you sure you want to delete the preset "${name}"?`)) {
            try {
                // Get current presets
                const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
                
                // Delete the preset
                delete presets[name];
                
                // Save back to storage
                localStorage.setItem('userPresets', JSON.stringify(presets));
                
                // Refresh dropdown
                this.initializePresetsDropdown();
                
                console.log('Preset deleted:', name);
            } catch (error) {
                console.error('Error deleting preset:', error);
                alert('Error deleting preset. Please try again.');
            }
        }
    }

    saveCurrentConfig(system) {
        // Get current NC values
        const nc1 = document.getElementById('manual-nc1')?.value;
        const nc2 = document.getElementById('manual-nc2')?.value;
        const nc3 = document.getElementById('manual-nc3')?.value;
        
        // Validate values
        if (!nc1 || !nc2 || !nc3) {
            alert('Please enter all NC values before saving a preset.');
            return;
        }

        // Get current triangle configuration
        const config = {
            n1: { x: system.n1.x, y: system.n1.y },
            n2: { x: system.n2.x, y: system.n2.y },
            n3: { x: system.n3.x, y: system.n3.y },
            nc1: parseFloat(nc1),
            nc2: parseFloat(nc2),
            nc3: parseFloat(nc3),
            timestamp: Date.now()
        };

        // Single prompt for preset name
        const name = prompt('Enter a name for this preset:');
        
        if (name) {
            try {
                // Get existing presets
                const existingPresets = JSON.parse(localStorage.getItem('userPresets') || '{}');
                
                // Add new preset
                existingPresets[name] = config;
                
                // Save to localStorage
                localStorage.setItem('userPresets', JSON.stringify(existingPresets));
                
                // Update dropdown immediately
                this.updatePresetsDropdown();
                
                alert('Preset saved successfully!');
            } catch (error) {
                console.error('Error saving preset:', error);
                alert('Error saving preset. Please try again.');
            }
        }
    }

    setupSavePresetButton() {
        // Try both possible button IDs
        const savePresetButton = document.getElementById('save-preset') || document.getElementById('savePreset');
        if (savePresetButton) {
            console.log('Found save preset button');
            // Remove any existing listeners
            const newButton = savePresetButton.cloneNode(true);
            savePresetButton.parentNode.replaceChild(newButton, savePresetButton);
            
            newButton.addEventListener('click', () => {
                console.log('Save preset button clicked');
                this.saveCurrentPreset();
            });
        } else {
            console.error('Save preset button not found');
        }
    }

    saveCurrentPreset() {
        try {
            console.log('Saving current preset...');
            const name = prompt('Enter a name for this preset:');
            if (!name) return;

            // Get current triangle state
            const currentState = {
                n1: { ...this.triangleSystem.system.n1 },
                n2: { ...this.triangleSystem.system.n2 },
                n3: { ...this.triangleSystem.system.n3 }
            };
            console.log('Current state to save:', currentState);

            // Get existing presets
            const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
            
            // Save new preset
            presets[name] = currentState;
            localStorage.setItem('userPresets', JSON.stringify(presets));

            // Update dropdown
            this.initializePresetsDropdown();

            console.log('Successfully saved preset:', name);
        } catch (error) {
            console.error('Error saving preset:', error);
            alert('Error saving preset. Please try again.');
        }
    }

    deletePreset(name) {
        if (confirm(`Delete preset "${name}"?`)) {
            try {
                const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
                delete presets[name];
                localStorage.setItem('userPresets', JSON.stringify(presets));
                this.initializePresetsDropdown();
            } catch (error) {
                console.error('Error deleting preset:', error);
                alert('Error deleting preset');
            }
        }
    }

    

    startAnimation() {
        if (this.isAnimating) {
            console.log('Animation is already running');
            return;
        }
        this.isAnimating = true;
        console.log('Animation started');
        // Implement the logic to start the animation
    }

    pauseAnimation() {
        if (!this.isAnimating) {
            console.log('No animation is running');
            return;
        }
        this.isAnimating = false;
        console.log('Animation paused');
        // Implement the logic to pause the animation
    }

    stopAnimation() {
        if (!this.isAnimating) {
            console.log('No animation to stop');
            return;
        }
        this.isAnimating = false;
        console.log('Animation stopped');
        // Implement the logic to stop the animation
    }

    setupAnimationControls() {
        // Animation button
        const animateButton = document.getElementById('animate-button-end');
        if (animateButton) {
            animateButton.addEventListener('click', () => {
                console.log('Animate button clicked');
                
                // Create animation object with coordinates for each point
                const animation = {
                    start: {
                        nc1: { x: parseFloat(document.getElementById('animation-nc1-start').value), y: 0 },
                        nc2: { x: parseFloat(document.getElementById('animation-nc2-start').value), y: 0 },
                        nc3: { x: parseFloat(document.getElementById('animation-nc3-start').value), y: 0 }
                    },
                    end: {
                        nc1: { x: parseFloat(document.getElementById('animation-nc1-end').value), y: 0 },
                        nc2: { x: parseFloat(document.getElementById('animation-nc2-end').value), y: 0 },
                        nc3: { x: parseFloat(document.getElementById('animation-nc3-end').value), y: 0 }
                    },
                    loop: document.getElementById('animation-loop').checked
                };
                
                console.log('Starting animation with values:', animation);
                if (this.triangleSystem && typeof this.triangleSystem.applyAnimation === 'function') {
                    this.triangleSystem.applyAnimation(animation);
                } else {
                    console.error('triangleSystem or applyAnimation method not found');
                }
            });
        }

        // Save animation button
        const saveButton = document.getElementById('save-animation-end');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                console.log('Save Animation button clicked');
                
                // Create animation object to save
                const animation = {
                    start: {
                        nc1: document.getElementById('animation-nc1-start').value,
                        nc2: document.getElementById('animation-nc2-start').value,
                        nc3: document.getElementById('animation-nc3-start').value
                    },
                    end: {
                        nc1: document.getElementById('animation-nc1-end').value,
                        nc2: document.getElementById('animation-nc2-end').value,
                        nc3: document.getElementById('animation-nc3-end').value
                    },
                    loop: document.getElementById('animation-loop').checked
                };

                const name = prompt('Enter a name for this animation preset:');
                if (name) {
                    try {
                        const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
                        animations[name] = animation;
                        localStorage.setItem('userAnimations', JSON.stringify(animations));
                        console.log(`Animation preset "${name}" saved successfully`);
                        this.initializeAnimationsDropdown(); // Refresh the animations list
                    } catch (error) {
                        console.error('Error saving animation preset:', error);
                    }
                }
            });
        }
    }
}

export class ImportManager {
    constructor(triangleSystem) {
        this.triangleSystem = triangleSystem;
        this.initializeImportButton();
    }

    initializeImportButton() {
        const importButton = document.getElementById('importButton');
        const fileInput = document.getElementById('importFile');

        if (!importButton || !fileInput) {
            console.error('Import button or file input not found');
            return;
        }

        // Handle import button click
        importButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });

        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importPresets(file);
                fileInput.value = ''; // Reset file input
            }
        });
    }

    importPresets(file) {
        console.log('Starting import process for file:', file.name);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                console.log('File contents loaded, first 100 chars:', text.substring(0, 100));

                // Get existing presets first
                const existingPresets = JSON.parse(localStorage.getItem('userPresets') || '{}');
                console.log('Existing presets:', Object.keys(existingPresets).length);

                // Parse and process the CSV data
                const newPresets = this.parseCSVToPresets(text);
                const newPresetCount = Object.keys(newPresets).length;
                console.log('New presets created:', newPresetCount);

                if (newPresetCount === 0) {
                    throw new Error('No valid presets found in file');
                }

                // Merge presets
                const mergedPresets = { ...existingPresets, ...newPresets };
                
                // Save to localStorage
                localStorage.setItem('userPresets', JSON.stringify(mergedPresets));
                console.log('Saved merged presets:', Object.keys(mergedPresets).length);

                // Notify user
                alert(`Successfully imported ${newPresetCount} presets`);

                // Only update the presets dropdown, not animations
                if (this.triangleSystem.initializePresets) {
                    this.triangleSystem.initializePresets();
                }

            } catch (error) {
                console.error('Error during import:', error);
                alert('Error importing presets. Please check the console for details.');
            }
        };

        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            alert('Error reading file. Please try again.');
        };

        reader.readAsText(file);
    }

    parseCSVToPresets(csvText) {
        const presets = {};
        
        // Split into rows and filter out empty ones
        const rows = csvText.split('\n')
            .map(row => row.trim())
            .filter(row => row.length > 0);

        console.log('First few rows:', rows.slice(0, 3));

        // Skip header row
        for (let i = 1; i < rows.length; i++) {
            try {
                const row = rows[i];
                console.log(`Processing row ${i}:`, row);

                // Split by comma but preserve commas within quotes
                const columns = this.parseCSVRow(row);
                console.log('Parsed columns:', columns);

                if (columns.length >= 4) {
                    const name = columns[0];
                    // Handle the coordinate pairs which might be in "x,y" format
                    const n1Coords = this.parseCoordinates(columns[1]);
                    const n2Coords = this.parseCoordinates(columns[2]);
                    const n3Coords = this.parseCoordinates(columns[3]);

                    console.log('Parsed coordinates:', {
                        name,
                        n1: n1Coords,
                        n2: n2Coords,
                        n3: n3Coords
                    });

                    if (n1Coords && n2Coords && n3Coords) {
                        presets[name] = {
                            n1: { x: n1Coords[0], y: n1Coords[1] },
                            n2: { x: n2Coords[0], y: n2Coords[1] },
                            n3: { x: n3Coords[0], y: n3Coords[1] },
                            timestamp: Date.now()
                        };
                        console.log('Successfully added preset:', name);
                    } else {
                        console.warn(`Invalid coordinates for row ${i}`);
                    }
                } else {
                    console.warn(`Not enough columns in row ${i}:`, columns);
                }
            } catch (rowError) {
                console.error(`Error processing row ${i}:`, rowError);
            }
        }

        return presets;
    }

    parseCSVRow(row) {
        const result = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Push the last value
        result.push(currentValue.trim());
        
        // Clean up quotes
        return result.map(val => val.replace(/^"|"$/g, '').trim());
    }

    parseCoordinates(coordString) {
        try {
            // Remove any quotes and extra whitespace
            coordString = coordString.replace(/"/g, '').trim();
            
            // Split on comma and parse as floats
            const [x, y] = coordString.split(',').map(v => {
                const parsed = parseFloat(v.trim());
                if (isNaN(parsed)) {
                    throw new Error(`Invalid coordinate value: ${v}`);
                }
                return parsed;
            });

            return [x, y];
        } catch (error) {
            console.warn('Error parsing coordinates:', coordString, error);
            return null;
        }
    }
}