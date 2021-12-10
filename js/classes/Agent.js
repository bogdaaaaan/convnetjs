import Vec from './Vector.js';
import Eye from './Eye.js';
import { CELL_SIZE, PACMAN_POS } from '../utils/constants.js';

// A single agent
export default class Agent {
    constructor() {
        // positional information
        this.pos = new Vec(PACMAN_POS[1], PACMAN_POS[0]);
        this.old_pos = this.pos; // old position
        this.angle = 0; // direction facing

        this.coords = [this.pos.x < CELL_SIZE ? 0 : (this.pos.x - (CELL_SIZE / 2)) / CELL_SIZE, this.pos.y < CELL_SIZE ? 0 : (this.pos.y - (CELL_SIZE / 2)) / CELL_SIZE];
        this.actions = [];
        this.actions.push([0, -CELL_SIZE]); // up
        this.actions.push([0, CELL_SIZE]); // down
        this.actions.push([-CELL_SIZE, 0]); // left
        this.actions.push([CELL_SIZE, 0]); // right

        // properties
        this.rad = 10;
        this.eyes = [];
        let directions = ['up', 'down', 'left', 'right'];
        for (let i = 0; i < 4; i++) {
            this.eyes.push(new Eye(directions[i]));
        }

        // braaain
        let num_inputs = 12; // 4 eyes, each sees 3 numbers (wall, green, red thing proximity)
        let num_actions = 4; // 5 possible angles agent can turn
        
        let temporal_window = 1; // amount of temporal memory. 0 = agent lives in-the-moment :)
        let network_size = num_inputs * temporal_window + num_actions * temporal_window + num_inputs;

        // the value function network computes a value of taking any of the possible actions
        // given an input state. Here we specify one explicitly the hard way
        // but user could also equivalently instead use opt.hidden_layer_sizes = [20,20]
        // to just insert simple relu hidden layers.
        let layer_defs = [];
        layer_defs.push({ type: 'input', out_sx: 1, out_sy: 1, out_depth: network_size });
        layer_defs.push({ type: 'fc', num_neurons: 50, activation: 'relu' });
        layer_defs.push({ type: 'fc', num_neurons: 50, activation: 'relu' });
        layer_defs.push({ type: 'regression', num_neurons: num_actions });

        // options for the Temporal Difference learner that trains the above net
        // by backpropping the temporal difference learning rule.
        let tdtrainer_options = { learning_rate: 0.001, momentum: 0.0, batch_size: 64, l2_decay: 0.01 };

        let opt = {};
        opt.temporal_window = temporal_window;
        opt.experience_size = 60000;
        opt.start_learn_threshold = 1000;
        opt.gamma = 0.7;
        opt.learning_steps_total = 500000;
        opt.learning_steps_burnin = 3000;
        opt.epsilon_min = 0.05;
        opt.epsilon_test_time = 0.05;
        opt.layer_defs = layer_defs;
        opt.tdtrainer_options = tdtrainer_options;


        this.brain = new deepqlearn.Brain(num_inputs, num_actions, opt);
        this.reward_bonus = 0.0;
        this.digestion_signal = 0.0;

        this.move = [1,1];

        this.prevactionix = -1;
    }

    forward = () => {
        // in forward pass the agent simply behaves in the environment
        // create input to brain
        let input_array = new Array(this.eyes.length * 3);
        for (let i = 0; i < this.eyes.length; i++) {
            let eye = this.eyes[i];
            input_array[i * 3] = 1.0;
            input_array[i * 3 + 1] = 1.0;
            input_array[i * 3 + 2] = 1.0;
            if (eye.sensed_type !== -1) {
                // sensed_type is 0 for wall, 1 for food and 2 for poison.
                // lets do a 1-of-k encoding into the input array
                input_array[i * 3 + eye.sensed_type] = eye.sensed_proximity / eye.max_range; // normalize to [0,1]
            }
        }

        // get action from brain
        let actionix = this.brain.forward(input_array);
        
        let action = this.actions[actionix];
        this.actionix = actionix; //back this up

        // demultiplex into behavior variables
        this.move = action;
    }

    backward = () => {
        // in backward pass agent learns.
        // compute reward
        let proximity_reward = 0.0;
        for (let i = 0; i < this.eyes.length; i++) {
            let eye = this.eyes[i];
            // agents dont like to see walls, especially up close
            proximity_reward += eye.sensed_type === 0 ? eye.sensed_proximity / eye.max_range : 1.0;
        }
        proximity_reward = proximity_reward / this.eyes.length;
        proximity_reward = Math.min(1.0, proximity_reward * 2);

        // agents like to go straight forward
        let forward_reward = 0.0;
        if (this.actionix === 0 && proximity_reward > 0.75) forward_reward = 0.1 * proximity_reward;

        // agents like to eat good things
        let digestion_reward = this.digestion_signal;
        this.digestion_signal = 0.0;

        let reward = proximity_reward + forward_reward + digestion_reward;

        // pass to brain for learning
        this.brain.backward(reward);
    }
}

