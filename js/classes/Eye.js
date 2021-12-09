import { CELL_SIZE } from '../utils/constants.js';

const MAX_CELL_VISIBLE = 5;

// Eye sensor has a maximum range and senses walls
export default class Eye {
    constructor(direction) {
        // angle relative to agent its on
        this.direction = direction;
        this.max_range = CELL_SIZE * MAX_CELL_VISIBLE;
        
        // what the eye is seeing will be set in world.tick()
        this.sensed_proximity =  CELL_SIZE * MAX_CELL_VISIBLE; 
        
        // what does the eye see?
        this.sensed_type = -1; 
    }
}