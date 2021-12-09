import Vec from './Vector.js';

// item is circle thing on the floor that agent can interact with (see or eat, etc)
export default class Item {
    constructor(x, y, type, coords_x, coords_y) {
        this.position = new Vec(x, y); // position
        this.coordinates = [coords_x, coords_y];
        this.type = type;
        this.radius = 10; // default radius
        this.age = 0;
        this.cleanup_ = false;
    };
}