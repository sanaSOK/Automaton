/**
 * Simulator class for automata with extended functionality
 */
class AutomatonSimulator {
    constructor(visualizer) {
        this.automaton = null;
        this.visualizer = visualizer;
        this.input = '';
        this.step = 0;
        this.simulationState = null;
        this.isRunning = false;
        this.animationSpeed = 500; // ms between steps
    }

    /**
     * Set the automaton to simulate
     * @param {Automaton} automaton 
     */
    setAutomaton(automaton) {
        this.automaton = automaton;
        this.reset();
    }

    /**
     * Reset the simulation to the beginning
     */
    reset() {
        this.step = 0;
        this.simulationState = null;
        this.isRunning = false;
        this.updateVisualization();
    }

    /**
     * Set the input string to simulate
     * @param {string} input 
     */
    setInput(input) {
        this.input = input;
        this.reset();
    }

    /**
     * Perform one step of the simulation
     * @returns {object} Current simulation state
     */
    performStep() {
        if (!this.automaton) return null;
        
        // Get the simulation state for the current step
        this.simulationState = this.automaton.simulateStep(this.input, this.step);
        
        // Update the visualization
        this.updateVisualization();
        
        // Increment step for next time
        if (!this.simulationState.complete && !this.simulationState.error) {
            this.step++;
        }
        
        return this.simulationState;
    }

    /**
     * Run the simulation to completion
     */
    runToCompletion() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.reset(); // Reset to start from the beginning
        
        // Run the simulation step by step with animation
        this._runNextStep();
    }

    /**
     * Run the next step with animation
     * @private
     */
    _runNextStep() {
        if (!this.isRunning) return;
        
        const state = this.performStep();
        
        if (state.complete || state.error) {
            this.isRunning = false;
            return;
        }
        
        // Schedule next step
        setTimeout(() => this._runNextStep(), this.animationSpeed);
    }

    /**
     * Update the visualization with the current state
     */
    updateVisualization() {
        // Check if visualizer exists
        if (!this.visualizer) {
            return; // Skip visualization if no visualizer is available
        }
        
        if (!this.simulationState) {
            // Reset the visualization to default state
            this.visualizer.resetHighlights();
            return;
        }
        
        const state = this.simulationState;
        
        // Highlight the current state(s)
        if (this.automaton.type === 'DFA') {
            this.visualizer.highlightStates(state.state, state.complete ? state.accepted : null);
        } else {
            this.visualizer.highlightStates(state.states, state.complete ? state.accepted : null);
        }
        
        // If we just made a transition, highlight it
        if (this.visualizer && this.step > 0 && !state.error) {
            const symbol = this.input[this.step - 1];
            const prevState = this.automaton.simulateStep(this.input, this.step - 1);
            
            if (this.automaton.type === 'DFA') {
                this.visualizer.highlightTransition(prevState.state, state.state, symbol);
            } else {
                // For NFA, this is more complex - we'd need to highlight multiple transitions
                // This is simplified for now
                if (prevState.states && prevState.states.length > 0 && 
                    state.states && state.states.length > 0) {
                    this.visualizer.highlightTransition(prevState.states[0], state.states[0], symbol);
                }
            }
        }
    }

    /**
     * Get the current simulation state for display
     * @returns {object} Display-ready simulation state
     */
    getDisplayState() {
        if (!this.simulationState) {
            return {
                currentState: '-',
                remainingInput: this.input,
                result: '-',
                complete: false,
                error: null
            };
        }
        
        const state = this.simulationState;
        
        return {
            currentState: this.automaton.type === 'DFA' ? 
                state.state : 
                (state.states ? `{${state.states.join(', ')}}` : '-'),
            remainingInput: state.remainingInput,
            result: state.complete ? 
                (state.accepted ? 'Accepted' : 'Rejected') : 
                'In progress',
            complete: state.complete,
            error: state.error
        };
    }

    /**
     * Check if the automaton is deterministic or non-deterministic
     * @returns {boolean} True if the automaton is deterministic, false otherwise
     */
    isDeterministic() {
        if (!this.automaton) return false;
        
        // If no states or alphabet, consider it deterministic (empty automaton)
        if (this.automaton.states.size === 0 || this.automaton.alphabet.size === 0) {
            return true;
        }
        
        // Check for epsilon transitions
        for (const fromState in this.automaton.transitions) {
            if (this.automaton.transitions[fromState] && 
                this.automaton.transitions[fromState]['ε']) {
                return false;
            }
        }
        
        // Check for multiple transitions on the same symbol or missing transitions
        for (const state of this.automaton.states) {
            const stateTransitions = this.automaton.transitions[state] || {};
            
            // For each symbol in the alphabet, there must be exactly one transition
            for (const symbol of this.automaton.alphabet) {
                // For new automata, missing transitions are ok initially
                if (this.automaton.states.size <= 1) {
                    continue;
                }
                
                // If it's stored as NFA, check for transitions with multiple target states
                if (this.automaton.type === 'NFA') {
                    if (stateTransitions[symbol] && stateTransitions[symbol].size > 1) {
                        return false; // Multiple transitions found
                    }
                }
            }
        }
        
        // If we got here, the automaton is deterministic or empty
        return true;
    }

    /**
     * Test if a string is accepted by the automaton
     * @param {string} input - The input string to test
     * @returns {object} Result object with accepted property
     */
    testString(input) {
        if (!this.automaton) return { accepted: false, error: 'No automaton defined' };
        return this.automaton.simulate(input);
    }

    /**
     * Convert current NFA to equivalent DFA
     * @returns {Automaton} The equivalent DFA
     */
    convertToDFA() {
        if (!this.automaton) return null;
        if (this.automaton.type === 'DFA') return this.automaton.clone();
        
        const dfa = this.automaton.convertToDFA();
        return dfa;
    }

    /**
     * Minimize the current DFA
     * @returns {Automaton} The minimized DFA
     */
    minimizeDFA() {
        if (!this.automaton) return null;
        
        // If it's an NFA, convert it to DFA first
        let dfa = this.automaton;
        if (this.automaton.type === 'NFA') {
            dfa = this.automaton.convertToDFA();
        }
        
        return dfa.minimize();
    }
}
