/**
 * Automaton class representing both DFA and NFA
 */
class Automaton {
    constructor(type = 'DFA') {
        this.type = type; // 'DFA' or 'NFA'
        this.states = new Set();
        this.alphabet = new Set();
        this.transitions = {};
        this.initialState = null;
        this.finalStates = new Set();
    }

    /**
     * Add a state to the automaton
     * @param {string} state - State name
     */
    addState(state) {
        this.states.add(state);
    }

    /**
     * Remove a state from the automaton
     * @param {string} state - State name
     */
    removeState(state) {
        this.states.delete(state);
        
        // Remove as initial state if needed
        if (this.initialState === state) {
            this.initialState = null;
        }
        
        // Remove from final states if needed
        this.finalStates.delete(state);
        
        // Remove transitions involving this state
        for (const fromState in this.transitions) {
            if (fromState === state) {
                delete this.transitions[fromState];
            } else {
                for (const symbol in this.transitions[fromState]) {
                    if (this.type === 'DFA') {
                        if (this.transitions[fromState][symbol] === state) {
                            delete this.transitions[fromState][symbol];
                        }
                    } else {
                        // For NFA, remove state from the set of target states
                        if (this.transitions[fromState][symbol]) {
                            this.transitions[fromState][symbol].delete(state);
                            // If the set is empty, remove the entire symbol entry
                            if (this.transitions[fromState][symbol].size === 0) {
                                delete this.transitions[fromState][symbol];
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Set the alphabet for the automaton
     * @param {Array|Set} alphabet - Set of symbols
     */
    setAlphabet(alphabet) {
        this.alphabet = new Set(alphabet);
    }

    /**
     * Set initial state
     * @param {string} state - State name
     */
    setInitialState(state) {
        if (this.states.has(state)) {
            this.initialState = state;
        }
    }

    /**
     * Toggle a state as final
     * @param {string} state - State name
     * @param {boolean} isFinal - Whether the state is final
     */
    toggleFinalState(state, isFinal) {
        if (this.states.has(state)) {
            if (isFinal) {
                this.finalStates.add(state);
            } else {
                this.finalStates.delete(state);
            }
        }
    }

    /**
     * Add a transition to the automaton
     * @param {string} fromState - Source state
     * @param {string} symbol - Transition symbol
     * @param {string} toState - Target state
     */
    addTransition(fromState, symbol, toState) {
        if (!this.states.has(fromState) || !this.states.has(toState)) {
            return false;
        }
        
        // Add the symbol to alphabet
        if (symbol !== 'ε') {
            this.alphabet.add(symbol);
        }
        
        if (!this.transitions[fromState]) {
            this.transitions[fromState] = {};
        }
        
        if (this.type === 'DFA') {
            // For DFA, each state-symbol pair has exactly one target state
            this.transitions[fromState][symbol] = toState;
        } else {
            // For NFA, each state-symbol pair has a set of target states
            if (!this.transitions[fromState][symbol]) {
                this.transitions[fromState][symbol] = new Set();
            }
            this.transitions[fromState][symbol].add(toState);
        }
        
        return true;
    }

    /**
     * Remove a transition
     * @param {string} fromState 
     * @param {string} symbol 
     * @param {string} toState 
     */
    removeTransition(fromState, symbol, toState) {
        if (!this.transitions[fromState] || !this.transitions[fromState][symbol]) {
            return false;
        }
        
        if (this.type === 'DFA') {
            delete this.transitions[fromState][symbol];
        } else {
            this.transitions[fromState][symbol].delete(toState);
            if (this.transitions[fromState][symbol].size === 0) {
                delete this.transitions[fromState][symbol];
            }
        }

        // Check if the symbol is still used in any transition
        let symbolInUse = false;
        for (const state in this.transitions) {
            if (this.transitions[state][symbol]) {
                symbolInUse = true;
                break;
            }
        }
        
        // If the symbol is no longer used, remove it from the alphabet
        if (!symbolInUse && symbol !== 'ε') {
            this.alphabet.delete(symbol);
        }
        
        return true;
    }

    /**
     * Convert NFA to DFA using subset construction
     * @returns {Automaton} New DFA
     */
    convertToDFA() {
        if (this.type === 'DFA') {
            return this.clone();
        }

        const dfa = new Automaton('DFA');
        
        // Get epsilon closure for all states
        const epsilonClosures = {};
        for (const state of this.states) {
            epsilonClosures[state] = this._epsilonClosure([state]);
        }
        
        // Start with the epsilon closure of the initial state
        const initialClosure = this._epsilonClosure([this.initialState]);
        const initialStateName = this._getSetName(initialClosure);
        
        dfa.addState(initialStateName);
        dfa.setInitialState(initialStateName);
        
        // Check if the initial closure contains any final states
        for (const state of initialClosure) {
            if (this.finalStates.has(state)) {
                dfa.toggleFinalState(initialStateName, true);
                break;
            }
        }

        // Set of state sets to process
        const unprocessed = [initialClosure];
        const processed = [];
        
        // Process all state sets
        while (unprocessed.length > 0) {
            const currentStateSet = unprocessed.shift();
            const currentStateName = this._getSetName(currentStateSet);
            
            processed.push(currentStateSet);
            
            // For each symbol in the alphabet
            for (const symbol of this.alphabet) {
                // Skip epsilon transitions
                if (symbol === 'ε') continue;
                
                // Find all states reachable from current state set on this symbol
                const nextStateSet = this._getNextStates(currentStateSet, symbol);
                const nextStateName = this._getSetName(nextStateSet);
                
                // If this is a new state set, add it to the DFA and queue
                if (nextStateSet.length > 0) {
                    if (!dfa.states.has(nextStateName)) {
                        dfa.addState(nextStateName);
                        
                        // Check if the new state contains any final states
                        for (const state of nextStateSet) {
                            if (this.finalStates.has(state)) {
                                dfa.toggleFinalState(nextStateName, true);
                                break;
                            }
                        }
                        
                        // Add to unprocessed queue if we haven't processed it yet
                        const alreadyProcessed = processed.some(set => 
                            this._getSetName(set) === nextStateName);
                            
                        const alreadyQueued = unprocessed.some(set => 
                            this._getSetName(set) === nextStateName);
                        
                        if (!alreadyProcessed && !alreadyQueued) {
                            unprocessed.push(nextStateSet);
                        }
                    }
                    
                    // Add the transition
                    dfa.addTransition(currentStateName, symbol, nextStateName);
                }
            }
        }
        
        // Set the alphabet
        dfa.setAlphabet([...this.alphabet].filter(symbol => symbol !== 'ε'));
        
        return dfa;
    }

    /**
     * Find all states reachable from a state set on a given symbol, including epsilon transitions
     * @param {Array} stateSet - Set of states
     * @param {string} symbol - Transition symbol
     * @returns {Array} - Set of reachable states
     */
    _getNextStates(stateSet, symbol) {
        let nextStates = [];
        
        // For each state in the set
        for (const state of stateSet) {
            if (this.transitions[state] && this.transitions[state][symbol]) {
                // For NFA, transitions[state][symbol] is a Set
                nextStates = nextStates.concat([...this.transitions[state][symbol]]);
            }
        }
        
        // Get epsilon closure of the resulting set
        return this._epsilonClosure(nextStates);
    }

    /**
     * Find the epsilon closure of a set of states
     * @param {Array} stateSet - Set of states
     * @returns {Array} - Epsilon closure
     */
    _epsilonClosure(stateSet) {
        const closure = [...stateSet];
        const stack = [...stateSet];
        
        while (stack.length > 0) {
            const state = stack.pop();
            
            // Get all epsilon transitions from this state
            if (this.transitions[state] && this.transitions[state]['ε']) {
                for (const nextState of this.transitions[state]['ε']) {
                    // Add to closure if not already included
                    if (!closure.includes(nextState)) {
                        closure.push(nextState);
                        stack.push(nextState);
                    }
                }
            }
        }
        
        return closure.sort();
    }

    /**
     * Convert a set of states to a string name
     * @param {Array} stateSet - Set of states
     * @returns {string} - Name for the state set
     */
    _getSetName(stateSet) {
        if (stateSet.length === 0) return 'Ø';
        return `{${stateSet.join(',')}}`;
    }

    /**
     * Simulate automaton on an input string
     * @param {string} input - Input string
     * @returns {object} Simulation result
     */
    simulate(input) {
        // For DFA, we can simply follow the transitions
        if (this.type === 'DFA') {
            return this._simulateDFA(input);
        } else {
            // For NFA, we can either convert to DFA first or simulate directly
            return this._simulateNFA(input);
        }
    }

    /**
     * Simulate DFA on an input string
     * @param {string} input - Input string
     * @returns {object} Simulation result
     */
    _simulateDFA(input) {
        if (!this.initialState) {
            return { accepted: false, path: [] };
        }
        
        let currentState = this.initialState;
        const path = [{ state: currentState, input: input }];
        
        for (let i = 0; i < input.length; i++) {
            const symbol = input[i];
            
            // Check if symbol is in alphabet
            if (!this.alphabet.has(symbol)) {
                return { 
                    accepted: false, 
                    path, 
                    error: `Symbol ${symbol} is not in the alphabet`
                };
            }
            
            // Check if there is a transition for this symbol
            if (!this.transitions[currentState] || !this.transitions[currentState][symbol]) {
                return { 
                    accepted: false, 
                    path,
                    error: `No transition from state ${currentState} on symbol ${symbol}`
                };
            }
            
            // Follow the transition
            currentState = this.transitions[currentState][symbol];
            path.push({ state: currentState, input: input.substring(i+1) });
        }
        
        // Check if the final state is accepting
        return {
            accepted: this.finalStates.has(currentState),
            path
        };
    }

    /**
     * Simulate NFA on an input string
     * @param {string} input - Input string
     * @returns {object} Simulation result
     */
    _simulateNFA(input) {
        if (!this.initialState) {
            return { accepted: false, path: [] };
        }

        // Start with epsilon closure of the initial state
        let currentStates = this._epsilonClosure([this.initialState]);
        const path = [{ states: [...currentStates], input: input }];
        
        for (let i = 0; i < input.length; i++) {
            const symbol = input[i];
            
            // Check if symbol is in alphabet
            if (!this.alphabet.has(symbol)) {
                return { 
                    accepted: false, 
                    path, 
                    error: `Symbol ${symbol} is not in the alphabet`
                };
            }

            // Find all next states
            let nextStates = [];
            for (const state of currentStates) {
                if (this.transitions[state] && this.transitions[state][symbol]) {
                    nextStates = nextStates.concat([...this.transitions[state][symbol]]);
                }
            }
            
            // Get epsilon closure of next states
            currentStates = this._epsilonClosure(nextStates);
            
            // If there are no next states, the input is rejected
            if (currentStates.length === 0) {
                return { 
                    accepted: false, 
                    path,
                    error: `No transitions from current states on symbol ${symbol}`
                };
            }
            
            path.push({ states: [...currentStates], input: input.substring(i+1) });
        }

        // Check if any of the final states is accepting
        const isAccepted = currentStates.some(state => this.finalStates.has(state));
        return {
            accepted: isAccepted,
            path
        };
    }

    /**
     * Step through the simulation of the automaton
     * @param {string} input - The full input string
     * @param {number} step - The current step (how many characters have been processed)
     * @returns {object} Current simulation state
     */
    simulateStep(input, step) {
        // If we're at the beginning, reset to the initial state
        if (step === 0) {
            if (this.type === 'DFA') {
                return {
                    state: this.initialState,
                    states: null,
                    remainingInput: input,
                    accepted: this.finalStates.has(this.initialState),
                    complete: input.length === 0,
                };
            } else {
                // For NFA, start with epsilon closure of the initial state
                const initialStates = this._epsilonClosure([this.initialState]);
                const isAccepted = initialStates.some(state => this.finalStates.has(state));
                return {
                    state: null,
                    states: initialStates,
                    remainingInput: input,
                    accepted: isAccepted,
                    complete: input.length === 0,
                };
            }
        }

        // Determine how much of the input we've processed
        const processedInput = input.substring(0, step);
        const remainingInput = input.substring(step);

        if (this.type === 'DFA') {
            // Simulate DFA up to the current step
            let currentState = this.initialState;
            
            for (let i = 0; i < processedInput.length; i++) {
                const symbol = processedInput[i];
                if (!this.transitions[currentState] || !this.transitions[currentState][symbol]) {
                    return {
                        state: currentState,
                        states: null,
                        remainingInput,
                        accepted: false,
                        complete: true,
                        error: `No transition from state ${currentState} on symbol ${symbol}`,
                    };
                }
                currentState = this.transitions[currentState][symbol];
            }

            return {
                state: currentState,
                states: null,
                remainingInput,
                accepted: this.finalStates.has(currentState),
                complete: remainingInput.length === 0,
            };
        } else {
            // Simulate NFA up to the current step
            let currentStates = this._epsilonClosure([this.initialState]);
            
            for (let i = 0; i < processedInput.length; i++) {
                const symbol = processedInput[i];
                
                // Find all next states
                let nextStates = [];
                for (const state of currentStates) {
                    if (this.transitions[state] && this.transitions[state][symbol]) {
                        nextStates = nextStates.concat([...this.transitions[state][symbol]]);
                    }
                }
                
                // Get epsilon closure of next states
                currentStates = this._epsilonClosure(nextStates);
                
                if (currentStates.length === 0) {
                    return {
                        state: null,
                        states: [],
                        remainingInput,
                        accepted: false,
                        complete: true,
                        error: `No transitions from current states on symbol ${processedInput[i]}`,
                    };
                }
            }

            const isAccepted = currentStates.some(state => this.finalStates.has(state));
            return {
                state: null,
                states: currentStates,
                remainingInput,
                accepted: isAccepted,
                complete: remainingInput.length === 0,
            };
        }
    }

    /**
     * Check if the automaton is valid
     * @returns {object} Validation result
     */
    validate() {
        const errors = [];
        
        // Check if initial state is set
        if (!this.initialState) {
            errors.push('Initial state is not set');
        }
        
        // Check if there is at least one final state
        if (this.finalStates.size === 0) {
            errors.push('No final states defined');
        }
        
        // For DFA, check that all states have transitions for all symbols
        if (this.type === 'DFA') {
            for (const state of this.states) {
                for (const symbol of this.alphabet) {
                    if (!this.transitions[state] || !this.transitions[state][symbol]) {
                        errors.push(`State ${state} has no transition for symbol ${symbol}`);
                    }
                }
            }
        }
        
        return { valid: errors.length === 0, errors };
    }

    /**
     * Minimize DFA using Hopcroft's algorithm
     * @returns {Automaton} Minimized DFA
     */
    minimize() {
        if (this.type !== 'DFA') {
            // Convert NFA to DFA first
            return this.convertToDFA().minimize();
        }
        
        // Step 1: Remove unreachable states
        const reachable = this._getReachableStates();
        const unreachable = [...this.states].filter(state => !reachable.has(state));
        
        // Step 2: Create initial partition with final and non-final states
        const finalStatesSet = new Set([...this.finalStates]);
        const nonFinalStatesSet = new Set([...reachable].filter(state => !this.finalStates.has(state)));
        
        let partitions = [];
        if (finalStatesSet.size > 0) partitions.push(finalStatesSet);
        if (nonFinalStatesSet.size > 0) partitions.push(nonFinalStatesSet);
        
        // Step 3: Refine partitions
        let changed = true;
        while (changed) {
            changed = false;
            
            const newPartitions = [];
            
            // For each current partition
            for (const partition of partitions) {
                // Try to split the partition based on transitions
                const splits = this._splitPartition(partition, partitions);
                
                // If the partition was split
                if (splits.length > 1) {
                    changed = true;
                    newPartitions.push(...splits);
                } else {
                    newPartitions.push(partition);
                }
            }
            
            partitions = newPartitions;
        }
        
        // Step 4: Create the minimized DFA
        const minimized = new Automaton('DFA');
        
        // Create states in the minimized DFA for each partition
        const stateMap = {};  // Maps original states to partition states
        
        for (let i = 0; i < partitions.length; i++) {
            const partition = partitions[i];
            const partitionState = `q${i}`;
            
            minimized.addState(partitionState);
            
            // Map all states in this partition to the new partition state
            for (const state of partition) {
                stateMap[state] = partitionState;
            }
            
            // If partition contains the initial state, make it the initial state
            if (partition.has(this.initialState)) {
                minimized.setInitialState(partitionState);
            }
            
            // If partition contains any final state, make it a final state
            for (const state of partition) {
                if (this.finalStates.has(state)) {
                    minimized.toggleFinalState(partitionState, true);
                    break;
                }
            }
        }
        
        // Add transitions to the minimized DFA
        for (const partition of partitions) {
            // Take the first state in the partition as representative
            const representativeState = [...partition][0];
            const partitionState = stateMap[representativeState];
            
            // Add transitions from the representative state to other states
            if (this.transitions[representativeState]) {
                for (const symbol of this.alphabet) {
                    const targetState = this.transitions[representativeState][symbol];
                    if (targetState) {
                        const targetPartitionState = stateMap[targetState];
                        minimized.addTransition(partitionState, symbol, targetPartitionState);
                    }
                }
            }
        }
        
        // Set the alphabet
        minimized.setAlphabet(this.alphabet);
        
        return minimized;
    }

    /**
     * Get all states reachable from the initial state
     * @returns {Set} Set of reachable states
     */
    _getReachableStates() {
        const reachable = new Set([this.initialState]);
        const queue = [this.initialState];
        
        while (queue.length > 0) {
            const state = queue.shift();
            
            if (this.transitions[state]) {
                for (const symbol in this.transitions[state]) {
                    const targetState = this.transitions[state][symbol];
                    
                    if (!reachable.has(targetState)) {
                        reachable.add(targetState);
                        queue.push(targetState);
                    }
                }
            }
        }
        
        return reachable;
    }

    /**
     * Split a partition based on transitions
     * @param {Set} partition - The partition to split
     * @param {Array} partitions - All current partitions
     * @returns {Array} Array of new partitions
     */
    _splitPartition(partition, partitions) {
        // If the partition has only one state, it can't be split further
        if (partition.size <= 1) {
            return [partition];
        }
        
        // For each symbol in the alphabet
        for (const symbol of this.alphabet) {
            // Group states by their transition targets
            const groups = new Map();
            
            for (const state of partition) {
                let targetPartitionIndex = -1;
                
                // Find which partition the target state belongs to
                if (this.transitions[state] && this.transitions[state][symbol]) {
                    const targetState = this.transitions[state][symbol];
                    
                    for (let i = 0; i < partitions.length; i++) {
                        if (partitions[i].has(targetState)) {
                            targetPartitionIndex = i;
                            break;
                        }
                    }
                }
                
                // Group states by their target partition index
                if (!groups.has(targetPartitionIndex)) {
                    groups.set(targetPartitionIndex, new Set());
                }
                groups.get(targetPartitionIndex).add(state);
            }
            
            // If we found more than one group, the partition can be split
            if (groups.size > 1) {
                return Array.from(groups.values());
            }
        }
        
        // If we get here, the partition couldn't be split
        return [partition];
    }

    /**
     * Create a deep clone of the automaton
     * @returns {Automaton} Cloned automaton
     */
    clone() {
        const clone = new Automaton(this.type);
        
        // Copy states
        for (const state of this.states) {
            clone.addState(state);
        }
        
        // Copy alphabet
        clone.setAlphabet(this.alphabet);
        
        // Copy initial state
        clone.initialState = this.initialState;
        
        // Copy final states
        for (const state of this.finalStates) {
            clone.toggleFinalState(state, true);
        }
        
        // Copy transitions
        for (const fromState in this.transitions) {
            for (const symbol in this.transitions[fromState]) {
                if (this.type === 'DFA') {
                    const toState = this.transitions[fromState][symbol];
                    clone.addTransition(fromState, symbol, toState);
                } else {
                    for (const toState of this.transitions[fromState][symbol]) {
                        clone.addTransition(fromState, symbol, toState);
                    }
                }
            }
        }
        
        return clone;
    }

    /**
     * Normalize the automaton by renaming states sequentially
     * @returns {Automaton} Normalized automaton
     */
    normalize() {
        const normalized = new Automaton(this.type);
        
        // Map from old state names to new state names
        const stateMap = {};
        let stateIndex = 0;
        
        // Ensure initial state is q0
        stateMap[this.initialState] = `q${stateIndex++}`;
        
        // Map all final states next
        for (const state of this.finalStates) {
            if (state !== this.initialState && !stateMap[state]) {
                stateMap[state] = `q${stateIndex++}`;
            }
        }
        
        // Map all remaining states
        for (const state of this.states) {
            if (!stateMap[state]) {
                stateMap[state] = `q${stateIndex++}`;
            }
        }
        
        // Add all states to the normalized automaton
        for (const oldState in stateMap) {
            const newState = stateMap[oldState];
            normalized.addState(newState);
            
            if (oldState === this.initialState) {
                normalized.setInitialState(newState);
            }
            
            if (this.finalStates.has(oldState)) {
                normalized.toggleFinalState(newState, true);
            }
        }
        
        // Add all transitions
        for (const fromState in this.transitions) {
            for (const symbol in this.transitions[fromState]) {
                if (this.type === 'DFA') {
                    const toState = this.transitions[fromState][symbol];
                    normalized.addTransition(stateMap[fromState], symbol, stateMap[toState]);
                } else {
                    for (const toState of this.transitions[fromState][symbol]) {
                        normalized.addTransition(stateMap[fromState], symbol, stateMap[toState]);
                    }
                }
            }
        }
        
        // Set the alphabet
        normalized.setAlphabet(this.alphabet);
        
        return normalized;
    }

    /**
     * Export automaton to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        const json = {
            type: this.type,
            states: Array.from(this.states),
            alphabet: Array.from(this.alphabet),
            initialState: this.initialState,
            finalStates: Array.from(this.finalStates),
            transitions: {}
        };
        
        // Convert transitions to a serializable format
        for (const fromState in this.transitions) {
            json.transitions[fromState] = {};
            
            for (const symbol in this.transitions[fromState]) {
                if (this.type === 'DFA') {
                    json.transitions[fromState][symbol] = this.transitions[fromState][symbol];
                } else {
                    json.transitions[fromState][symbol] = Array.from(this.transitions[fromState][symbol]);
                }
            }
        }
        
        return json;
    }

    /**
     * Import automaton from JSON
     * @param {Object} json - JSON representation
     * @returns {Automaton} Imported automaton
     */
    static fromJSON(json) {
        const automaton = new Automaton(json.type);
        
        // Add states
        for (const state of json.states) {
            automaton.addState(state);
        }
        
        // Set alphabet
        automaton.setAlphabet(json.alphabet);
        
        // Set initial state
        automaton.initialState = json.initialState;
        
        // Set final states
        for (const state of json.finalStates) {
            automaton.toggleFinalState(state, true);
        }
        
        // Add transitions
        for (const fromState in json.transitions) {
            for (const symbol in json.transitions[fromState]) {
                if (json.type === 'DFA') {
                    const toState = json.transitions[fromState][symbol];
                    automaton.addTransition(fromState, symbol, toState);
                } else {
                    for (const toState of json.transitions[fromState][symbol]) {
                        automaton.addTransition(fromState, symbol, toState);
                    }
                }
            }
        }
        
        return automaton;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined') {
    module.exports = Automaton;
}
