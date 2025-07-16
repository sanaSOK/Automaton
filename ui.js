/**
 * UI controller for the Automata Simulator
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize visualizer for both editing and simulation
    const visualizer = new AutomatonVisualizer('automataNetwork');
    
    // Initialize simulator with the same visualizer
    const simulator = new AutomatonSimulator(visualizer);
    
    // Create a new automaton - start as an NFA and we'll determine later if it's a DFA
    let automaton = new Automaton('NFA');
    
    // Update visualizer
    visualizer.update(automaton);
    
    // UI elements
    const automatonTypeDisplay = document.getElementById('automatonTypeDisplay');
    const alphabetInput = document.getElementById('alphabet');
    const newStateInput = document.getElementById('newState');
    const addStateBtn = document.getElementById('addState');
    const statesList = document.getElementById('statesList');
    const initialStateSelect = document.getElementById('initialState');
    const finalStatesContainer = document.getElementById('finalStates');
    const fromStateSelect = document.getElementById('fromState');
    const transitionSymbolInput = document.getElementById('transitionSymbol');
    const toStateSelect = document.getElementById('toState');
    const addTransitionBtn = document.getElementById('addTransition');
    const transitionsList = document.getElementById('transitionsList');
    const normalizeBtn = document.getElementById('normalize');
    const clearBtn = document.getElementById('clear');
    const saveFileBtn = document.getElementById('saveFile');
    const loadFileBtn = document.getElementById('loadFile');
    const fileInput = document.getElementById('fileInput');
    
    // Simulation UI elements
    const inputStringInput = document.getElementById('inputString');
    const stepBtn = document.getElementById('stepBtn');
    const resetBtn = document.getElementById('resetBtn');
    const currentStateSpan = document.getElementById('currentState');
    const remainingInputSpan = document.getElementById('remainingInput');
    const simulationResultSpan = document.getElementById('simulationResult');
    
    // Advanced operations UI elements
    const checkDeterministicBtn = document.getElementById('checkDeterministic');
    const testStringBtn = document.getElementById('testString');
    const convertToDFABtn = document.getElementById('convertToDFA');
    const minimizeDFABtn = document.getElementById('minimizeDFA');
    const operationResultDiv = document.getElementById('operationResult');
    
    // Main panel
    const mainPanel = document.getElementById('mainPanel');
    
    /**
     * Update all UI elements based on the current automaton
     */
    function updateUI() {
        // Update alphabet
        alphabetInput.value = [...automaton.alphabet].join(',');
        
        // Update states lists
        updateStatesList();
        
        // Update transitions
        updateTransitionsList();
        
        // Update automaton type display
        updateAutomatonTypeDisplay();
        
        // Update visualizer
        visualizer.update(automaton);
        
        // Update simulator
        simulator.setAutomaton(automaton.clone());
        updateSimulationView();
    }

    /**
     * Update the states list in the UI
     */
    function updateStatesList() {
        // Clear lists
        statesList.innerHTML = '';
        initialStateSelect.innerHTML = '';
        finalStatesContainer.innerHTML = '';
        fromStateSelect.innerHTML = '';
        toStateSelect.innerHTML = '';

        // Populate state lists
        for (const state of automaton.states) {
            // Add to states list
            const stateItem = document.createElement('div');
            stateItem.className = 'state-item';
            stateItem.innerHTML = `
                <span>${state}</span>
                <button class="remove-btn" data-state="${state}">×</button>
            `;
            statesList.appendChild(stateItem);
            
            // Add to initial state dropdown
            const initialOption = document.createElement('option');
            initialOption.value = state;
            initialOption.textContent = state;
            
            if (automaton.initialState === state) {
                initialOption.selected = true;
            }
            
            initialStateSelect.appendChild(initialOption);
            
            // Add to final states
            const finalCheckItem = document.createElement('div');
            finalCheckItem.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `final_${state}`;
            checkbox.value = state;
            checkbox.checked = automaton.finalStates.has(state);
            
            const label = document.createElement('label');
            label.htmlFor = `final_${state}`;
            label.textContent = state;
            
            finalCheckItem.appendChild(checkbox);
            finalCheckItem.appendChild(label);
            finalStatesContainer.appendChild(finalCheckItem);
            
            // Add to from state dropdown
            const fromOption = document.createElement('option');
            fromOption.value = state;
            fromOption.textContent = state;
            fromStateSelect.appendChild(fromOption);
            
            // Add to to state dropdown
            const toOption = document.createElement('option');
            toOption.value = state;
            toOption.textContent = state;
            toStateSelect.appendChild(toOption);
        }
        
        // Add event listeners for remove buttons
        const removeButtons = document.querySelectorAll('.remove-btn[data-state]');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const state = btn.getAttribute('data-state');
                automaton.removeState(state);
                updateUI();
            });
        });
        
        // Add event listeners for final state checkboxes
        const finalCheckboxes = document.querySelectorAll('#finalStates input[type="checkbox"]');
        finalCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                automaton.toggleFinalState(checkbox.value, checkbox.checked);
                updateUI();
            });
        });
    }

    /**
     * Update the transitions list in the UI
     */
    function updateTransitionsList() {
        transitionsList.innerHTML = '';
        
        // Populate transitions list
        for (const fromState in automaton.transitions) {
            for (const symbol in automaton.transitions[fromState]) {
                if (automaton.type === 'DFA') {
                    const toState = automaton.transitions[fromState][symbol];
                    
                    const transitionItem = document.createElement('div');
                    transitionItem.className = 'transition-item';
                    transitionItem.innerHTML = `
                        <span>${fromState} --${symbol}--> ${toState}</span>
                        <button class="remove-btn" data-from="${fromState}" data-symbol="${symbol}" data-to="${toState}">×</button>
                    `;
                    transitionsList.appendChild(transitionItem);
                } else {
                    for (const toState of automaton.transitions[fromState][symbol]) {
                        const transitionItem = document.createElement('div');
                        transitionItem.className = 'transition-item';
                        transitionItem.innerHTML = `
                            <span>${fromState} --${symbol}--> ${toState}</span>
                            <button class="remove-btn" data-from="${fromState}" data-symbol="${symbol}" data-to="${toState}">×</button>
                        `;
                        transitionsList.appendChild(transitionItem);
                    }
                }
            }
        }
        
        // Add event listeners for remove buttons
        const removeButtons = document.querySelectorAll('.remove-btn[data-from]');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const fromState = btn.getAttribute('data-from');
                const symbol = btn.getAttribute('data-symbol');
                const toState = btn.getAttribute('data-to');
                
                automaton.removeTransition(fromState, symbol, toState);
                updateUI();
            });
        });
    }

    /**
     * Update the simulation view with current state
     */
    function updateSimulationView() {
        const state = simulator.getDisplayState();
        
        currentStateSpan.textContent = state.currentState;
        remainingInputSpan.textContent = state.remainingInput || '-';
        simulationResultSpan.textContent = state.error ? `Error: ${state.error}` : state.result;
        
        if (state.complete || state.error) {
            simulationResultSpan.style.color = state.accepted ? 'green' : 'red';
        } else {
            simulationResultSpan.style.color = '';
        }
    }

    /**
     * Update the automaton type display based on the current automaton
     */
    function updateAutomatonTypeDisplay() {
        // Check if automaton has any states
        if (automaton.states.size === 0) {
            automatonTypeDisplay.textContent = 'Type: Undetermined (create an automaton first)';
            return;
        }
        
        try {
            // Create a temporary automaton object (don't modify the original)
            const tempAutomaton = automaton.clone();
            
            // Create a simulator to check if the automaton is deterministic
            const checkSimulator = new AutomatonSimulator(null); 
            checkSimulator.setAutomaton(tempAutomaton);
            
            const isDeterministic = checkSimulator.isDeterministic();
            const typeText = isDeterministic ? 'DFA (Deterministic)' : 'NFA (Non-deterministic)';
            
            automatonTypeDisplay.textContent = `Type: ${typeText}`;
        } catch (error) {
            console.error("Error checking automaton type:", error);
            automatonTypeDisplay.textContent = 'Type: Error determining type';
        }
    }

    // Event listener for alphabet input
    alphabetInput.addEventListener('blur', () => {
        const symbols = alphabetInput.value.split(',').map(s => s.trim()).filter(s => s);
        automaton.setAlphabet(symbols);
        updateUI();
    });

    // Event listener for adding states
    addStateBtn.addEventListener('click', () => {
        const stateName = newStateInput.value.trim();
        if (stateName) {
            if (automaton.states.has(stateName)) {
                alert(`State "${stateName}" already exists.`);
                return;
            }
            
            automaton.addState(stateName);
            newStateInput.value = '';
            updateUI();
        }
    });

    newStateInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addStateBtn.click();
        }
    });

    // Event listener for setting initial state
    initialStateSelect.addEventListener('change', () => {
        automaton.setInitialState(initialStateSelect.value);
        updateUI();
    });

    // Event listener for adding transitions
    addTransitionBtn.addEventListener('click', () => {
        const fromState = fromStateSelect.value;
        const symbol = transitionSymbolInput.value.trim();
        const toState = toStateSelect.value;
        
        if (!symbol) {
            alert('Please enter a transition symbol.');
            return;
        }
        
        // Check if the transition already exists for DFA
        if (automaton.type === 'DFA' && 
            automaton.transitions[fromState] && 
            automaton.transitions[fromState][symbol]) {
            alert(`A transition from ${fromState} on symbol ${symbol} already exists in the DFA.`);
            return;
        }
        
        automaton.addTransition(fromState, symbol, toState);
        transitionSymbolInput.value = '';
        updateUI();
    });

    transitionSymbolInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTransitionBtn.click();
        }
    });

    // Event listener for normalize button
    normalizeBtn.addEventListener('click', () => {
        if (confirm('Normalize the automaton? This will rename all states.')) {
            automaton = automaton.normalize();
            updateUI();
        }
    });

    // Event listener for clear button
    clearBtn.addEventListener('click', () => {
        if (confirm('Clear the entire automaton? This cannot be undone.')) {
            // Create a new automaton as NFA since we determine type automatically
            automaton = new Automaton('NFA');
            updateUI();
        }
    });

    // Event listener for save button
    saveFileBtn.addEventListener('click', () => {
        const json = automaton.toJSON();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.getElementById('downloadLink');
        downloadLink.href = url;
        downloadLink.download = 'automaton.json';
        downloadLink.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    });

    // Event listener for load button
    loadFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                automaton = Automaton.fromJSON(json);
                
                // The type will be determined automatically when updateUI is called
                updateUI();
            } catch (error) {
                alert(`Error loading file: ${error.message}`);
            }
            
            // Reset the file input
            fileInput.value = '';
        };
        
        reader.readAsText(file);
    });

    // Simulation events
    inputStringInput.addEventListener('input', () => {
        simulator.setInput(inputStringInput.value);
        updateSimulationView();
    });

    stepBtn.addEventListener('click', () => {
        simulator.performStep();
        updateSimulationView();
    });

    resetBtn.addEventListener('click', () => {
        simulator.reset();
        updateSimulationView();
    });

    // Advanced operations event handlers
    
    // Check if automaton is deterministic
    checkDeterministicBtn.addEventListener('click', () => {
        try {
            if (!simulator.automaton) {
                operationResultDiv.textContent = 'No automaton loaded.';
                return;
            }
            
            const isDeterministic = simulator.isDeterministic();
            operationResultDiv.textContent = isDeterministic ? 
                'The automaton is deterministic (DFA).' : 
                'The automaton is non-deterministic (NFA).';
            
            // Also update the display in the edit panel
            updateAutomatonTypeDisplay();
        } catch (error) {
            console.error("Error checking if deterministic:", error);
            operationResultDiv.textContent = 'Error checking automaton type.';
        }
    });
    
    // Test string acceptance
    testStringBtn.addEventListener('click', () => {
        const input = prompt('Enter string to test:', '');
        if (input === null) return; // User canceled
        
        const result = simulator.testString(input);
        
        if (result.error) {
            operationResultDiv.textContent = `Error: ${result.error}`;
        } else {
            operationResultDiv.textContent = result.accepted ? 
                `The string "${input}" is accepted.` : 
                `The string "${input}" is rejected.`;
        }
    });
    
    // Convert NFA to DFA
    convertToDFABtn.addEventListener('click', () => {
        if (simulator.automaton.type === 'DFA') {
            operationResultDiv.textContent = 'The automaton is already a DFA.';
            return;
        }
        
        const dfa = simulator.convertToDFA();
        if (dfa) {
            // Ask if user wants to replace current automaton
            if (confirm('DFA created successfully. Replace current automaton with the DFA?')) {
                automaton = dfa;
                updateUI();
                
                // Update simulator with the new DFA
                simulator.setAutomaton(automaton.clone());
                simulator.reset();
                updateSimulationView();
                
                operationResultDiv.textContent = 'NFA converted to DFA and loaded.';
            } else {
                operationResultDiv.textContent = 'DFA created but not loaded.';
            }
        } else {
            operationResultDiv.textContent = 'Failed to convert NFA to DFA.';
        }
    });
    
    // Minimize DFA
    minimizeDFABtn.addEventListener('click', () => {
        if (simulator.automaton.type !== 'DFA') {
            if (confirm('This is not a DFA. Convert to DFA first?')) {
                // Convert to DFA first
                const dfa = simulator.convertToDFA();
                if (!dfa) {
                    operationResultDiv.textContent = 'Failed to convert to DFA.';
                    return;
                }
                simulator.setAutomaton(dfa);
            } else {
                return;
            }
        }
        
        const minimizedDFA = simulator.minimizeDFA();
        if (minimizedDFA) {
            // Ask if user wants to replace current automaton
            if (confirm('DFA minimized successfully. Replace current automaton with the minimized DFA?')) {
                automaton = minimizedDFA;
                updateUI();
                
                // Update simulator with the new DFA
                simulator.setAutomaton(automaton.clone());
                simulator.reset();
                updateSimulationView();
                
                operationResultDiv.textContent = 'DFA minimized and loaded.';
            } else {
                operationResultDiv.textContent = 'Minimized DFA created but not loaded.';
            }
        } else {
            operationResultDiv.textContent = 'Failed to minimize DFA.';
        }
    });
    
    // Initialize simulator when page loads
    document.addEventListener('DOMContentLoaded', () => {
        // Set up the simulator with the initial automaton
        simulator.setAutomaton(automaton.clone());
    });
    
    // Initialize with a sample automaton
    function createSampleAutomaton() {
        const sample = new Automaton('DFA');
        
        // Add states
        sample.addState('q0');
        sample.addState('q1');
        sample.addState('q2');
        
        // Set initial and final states
        sample.setInitialState('q0');
        sample.toggleFinalState('q2', true);
        
        // Set alphabet
        sample.setAlphabet(['a', 'b']);
        
        // Add transitions
        sample.addTransition('q0', 'a', 'q1');
        sample.addTransition('q0', 'b', 'q0');
        sample.addTransition('q1', 'a', 'q1');
        sample.addTransition('q1', 'b', 'q2');
        
        return sample;
    }
    
    // Create a sample automaton
    automaton = createSampleAutomaton();
    updateUI();
});
