/**
 * Visualization module for automata using vis.js
 */
class AutomatonVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.network = null;
        this.nodes = new vis.DataSet();
        this.edges = new vis.DataSet();
        this.automaton = null;
        this.options = {
            nodes: {
                shape: 'circle',
                size: 30,
                font: {
                    size: 16,
                    color: '#333333'
                },
                borderWidth: 2,
                shadow: true
            },
            edges: {
                arrows: {
                    to: { enabled: true, scaleFactor: 1 }
                },
                font: {
                    size: 14,
                    align: 'middle'
                },
                shadow: true
            },
            physics: {
                enabled: true,
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -50,
                    centralGravity: 0.01,
                    springLength: 150,
                    springConstant: 0.05
                },
                stabilization: {
                    iterations: 200
                }
            },
            interaction: {
                navigationButtons: true,
                keyboard: true
            }
        };
        
        this._initNetwork();
    }

    /**
     * Initialize the network visualization
     */
    _initNetwork() {
        const data = {
            nodes: this.nodes,
            edges: this.edges
        };
        
        this.network = new vis.Network(this.container, data, this.options);
    }

    /**
     * Update the visualization with a new automaton
     * @param {Automaton} automaton - The automaton to visualize
     */
    update(automaton) {
        this.automaton = automaton;
        
        // Clear existing nodes and edges
        this.nodes.clear();
        this.edges.clear();
        
        // Add nodes for each state
        const nodes = [];
        for (const state of this.automaton.states) {
            const isFinal = this.automaton.finalStates.has(state);
            const isInitial = this.automaton.initialState === state;
            
            nodes.push({
                id: state,
                label: state,
                color: {
                    background: isFinal ? '#ffdddd' : '#d5e8ff',
                    border: isFinal ? '#ff0000' : '#2B7CE9'
                },
                borderWidth: isFinal ? 3 : 2,
                shapeProperties: isFinal ? { borderDashes: false } : {}
            });
        }
        
        this.nodes.add(nodes);
        
        // Add a dummy start node if we have an initial state
        if (this.automaton.initialState) {
            const initialId = `__start__${this.automaton.initialState}`;
            this.nodes.add({
                id: initialId,
                label: '',
                shape: 'dot',
                size: 5,
                color: '#333333',
                physics: false
            });
            
            // Add edge from dummy node to initial state
            this.edges.add({
                id: `initial_${this.automaton.initialState}`,
                from: initialId,
                to: this.automaton.initialState,
                arrows: {
                    to: { enabled: true, scaleFactor: 1 }
                }
            });
        }
        
        // Add edges for transitions
        const edges = [];
        const transitionLabels = {};
        
        // For each state and its transitions
        for (const fromState in this.automaton.transitions) {
            // For each symbol and its destination state(s)
            for (const symbol in this.automaton.transitions[fromState]) {
                // For DFA, there is a single target state
                if (this.automaton.type === 'DFA') {
                    const toState = this.automaton.transitions[fromState][symbol];
                    
                    // Create a unique edge ID
                    const edgeId = `${fromState}-${toState}`;
                    
                    // Add to transition labels or create a new one
                    if (transitionLabels[edgeId]) {
                        transitionLabels[edgeId].push(symbol);
                    } else {
                        transitionLabels[edgeId] = [symbol];
                    }
                } 
                // For NFA, there can be multiple target states
                else {
                    for (const toState of this.automaton.transitions[fromState][symbol]) {
                        const edgeId = `${fromState}-${toState}`;
                        
                        if (transitionLabels[edgeId]) {
                            transitionLabels[edgeId].push(symbol);
                        } else {
                            transitionLabels[edgeId] = [symbol];
                        }
                    }
                }
            }
        }
        
        // Create edges based on collected transition labels
        for (const edgeId in transitionLabels) {
            const [fromState, toState] = edgeId.split('-');
            
            // Handle self-loops specially
            const isSelfLoop = fromState === toState;
            
            edges.push({
                id: edgeId,
                from: fromState,
                to: toState,
                label: transitionLabels[edgeId].join(', '),
                smooth: isSelfLoop ? 
                    { type: 'curvedCW', roundness: 0.4 } : 
                    { type: 'curvedCW', roundness: 0.2 },
                physics: !isSelfLoop
            });
        }
        
        this.edges.add(edges);
        
        // Stabilize and fit the network
        setTimeout(() => {
            this.network.fit();
            this.network.stabilize(50);
        }, 100);
    }

    /**
     * Highlight the current state(s) in a simulation
     * @param {string|array} currentStates - Current state or states
     * @param {boolean} accepted - Whether the input is accepted
     */
    highlightStates(currentStates, accepted = null) {
        // Reset all nodes to default
        this.nodes.forEach((node) => {
            const isFinal = this.automaton && this.automaton.finalStates.has(node.id);
            
            this.nodes.update({
                id: node.id,
                color: {
                    background: isFinal ? '#ffdddd' : '#d5e8ff',
                    border: isFinal ? '#ff0000' : '#2B7CE9'
                },
                borderWidth: isFinal ? 3 : 2
            });
        });
        
        // Highlight current states
        if (Array.isArray(currentStates)) {
            for (const state of currentStates) {
                if (state.startsWith('__start__')) continue;
                
                const isFinal = this.automaton && this.automaton.finalStates.has(state);
                this.nodes.update({
                    id: state,
                    color: {
                        background: accepted === null ? 
                            '#ffff99' : // Yellow for in-progress
                            (accepted ? '#aaffaa' : '#ffaaaa'), // Green for accept, red for reject
                        border: isFinal ? '#ff0000' : '#2B7CE9',
                    },
                    borderWidth: 4
                });
            }
        } else if (currentStates) {
            if (currentStates.startsWith('__start__')) return;
            
            const isFinal = this.automaton && this.automaton.finalStates.has(currentStates);
            this.nodes.update({
                id: currentStates,
                color: {
                    background: accepted === null ? 
                        '#ffff99' : // Yellow for in-progress
                        (accepted ? '#aaffaa' : '#ffaaaa'), // Green for accept, red for reject
                    border: isFinal ? '#ff0000' : '#2B7CE9',
                },
                borderWidth: 4
            });
        }
    }

    /**
     * Highlight a transition in the visualization
     * @param {string} fromState - Source state
     * @param {string} toState - Target state
     * @param {string} symbol - Transition symbol
     */
    highlightTransition(fromState, toState, symbol) {
        const edgeId = `${fromState}-${toState}`;
        
        if (this.edges.get(edgeId)) {
            this.edges.update({
                id: edgeId,
                color: { color: '#fd8d3c', highlight: '#fd8d3c' },
                width: 3
            });
            
            // Reset after a delay
            setTimeout(() => {
                this.edges.update({
                    id: edgeId,
                    color: { color: '#848484', highlight: '#848484' },
                    width: 1
                });
            }, 1500);
        }
    }

    /**
     * Reset all highlighting in the visualization
     */
    resetHighlights() {
        // Reset node colors
        this.nodes.forEach((node) => {
            const isFinal = this.automaton && this.automaton.finalStates.has(node.id);
            
            this.nodes.update({
                id: node.id,
                color: {
                    background: isFinal ? '#ffdddd' : '#d5e8ff',
                    border: isFinal ? '#ff0000' : '#2B7CE9'
                },
                borderWidth: isFinal ? 3 : 2
            });
        });
        
        // Reset edge colors
        this.edges.forEach((edge) => {
            this.edges.update({
                id: edge.id,
                color: undefined,
                width: 1
            });
        });
    }
}
