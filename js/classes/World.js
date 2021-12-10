import Vec from './Vector.js';
import Wall from './Wall.js';
import Item from './Item.js';
import { LEVEL_GRID, CELL_SIZE, PACMAN_POS, GHOST_POSITIONS } from '../utils/constants.js';
import Enemy from './Enemy.js';

// World object contains many agents and walls and food and stuff
const util_add_box = (list, x, y, w, h) => {
    list.push(new Wall(new Vec(x, y), new Vec(x + w, y)));
    list.push(new Wall(new Vec(x + w, y), new Vec(x + w, y + h)));
    list.push(new Wall(new Vec(x + w, y + h), new Vec(x, y + h)));
    list.push(new Wall(new Vec(x, y + h), new Vec(x, y)));
};

// line intersection helper function: does line segment (p1,p2) intersect segment (p3,p4) ?
const line_intersect = (p1, p2, p3, p4) => {
    let denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
     // parallel lines
    if (denom === 0) {
        return false;
    }

    let ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    let ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

    if (ua > 0.0 && ua < 1.0 && ub > 0.0 && ub < 1.0) {
        const up = new Vec(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
        return { ua: ua, ub: ub, up: up }; // up is intersection point
    }
    return false;
}

const line_point_intersect = (p1, p2, p0, radius) => {
    const vector = new Vec(p2.y - p1.y, -(p2.x - p1.x)); // perpendicular vector

    let d = Math.abs((p2.x - p1.x) * (p1.y - p0.y) - (p1.x - p0.x) * (p2.y - p1.y));
    d = d / vector.length();
    if (d > radius) {
        return false;
    }

    vector.normalize();
    vector.scale(d);
    let up = p0.add(vector);

    let ua = null;
    if (Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y)) {
        ua = (up.x - p1.x) / (p2.x - p1.x);
    } else {
        ua = (up.y - p1.y) / (p2.y - p1.y);
    }
    if (ua > 0.0 && ua < 1.0) {
        return { ua: ua, up: up };
    }
    return false;
};

export default class World {
    constructor(canvas) {
        this.agents = [];
        this.enemy = [new Enemy(GHOST_POSITIONS[0], 'random'), new Enemy(GHOST_POSITIONS[1], 'follow')];
        this.W = canvas.width;
        this.H = canvas.height;

        this.clock = 0;

        let pad = 0;
        // set up walls in the world
        this.walls = [];
 
        // inner walls
        util_add_box(this.walls, pad, pad, this.W - pad * 2, this.H - pad * 2);

        // set up food and poison
        this.items = [];

        // create copy of level layout
        this.grid = new Array(LEVEL_GRID.length);
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = new Array(LEVEL_GRID[i].length);
        }

        for (let i = 0; i < LEVEL_GRID.length; i++) {
            for (let j = 0; j < LEVEL_GRID[i].length; j++) {
                this.grid[i][j] = LEVEL_GRID[i][j];
            }
        }

        // fill level with food
        for (let i = 0; i < this.grid.length; i++) {
            for (let j = 0; j < this.grid[i].length; j++) {
                switch (this.grid[i][j]) {
                    case 1:
                        util_add_box(this.walls, j * CELL_SIZE, i * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                        break;
                    case 2:
                        this.items.push(new Item((j * CELL_SIZE) + (CELL_SIZE / 2), (i * CELL_SIZE) + (CELL_SIZE / 2), 1, j, i));
                        break;
                    case 7:
                        this.items.push(new Item((j * CELL_SIZE) + (CELL_SIZE / 2), (i * CELL_SIZE) + (CELL_SIZE / 2), 1, j, i));
                        break;
                    default:
                        break;
                }
            }
        }
    }

    // helper function to get closest colliding walls/items
    stuff_collide_= (p1, p2, check_walls, check_items, check_enemy) => {
        let min_res = false;

        // collide with walls
        if (check_walls) {
            for (let i = 0; i < this.walls.length; i++) {
                const wall = this.walls[i];
                const res = line_intersect(p1, p2, wall.p1, wall.p2);
                if (res) {
                    // 0 is wall
                    res.type = 0; 
                    if (!min_res) {
                        min_res = res;
                    } else {
                        // check if its closer
                        if (res.ua < min_res.ua) {
                            // if yes replace item
                            min_res = res;
                        }
                    }
                }
            }
        }

        // collide with items
        if (check_items) {
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                const res = line_point_intersect(p1, p2, item.position, item.radius);
                if (res) {
                     // store type of item
                    res.type = item.type;
                    if (!min_res) {
                        min_res = res;
                    } else {
                        if (res.ua < min_res.ua) {
                            min_res = res;
                        }
                    }
                }
            }
        }

        // collide with ghosts
        if (check_enemy) {
            for (let i = 0; i < this.enemy.length; i++) {
                const ghost = this.enemy[i];
                const res = line_point_intersect(p1, p2, ghost.pos, ghost.radius);
                if (res) {
                     // store type of item
                    res.type = 2;
                    if (!min_res) {
                        min_res = res;
                    } else {
                        if (res.ua < min_res.ua) {
                            min_res = res;
                        }
                    }
                }
            }
        }

        return min_res;
    }

    free_grid = (coords) => {
        this.grid[coords[1]][coords[0]] = 0;
    }

    respawn_food = () => {
        this.items = [];
        for (let i = 0; i < this.grid.length; i++) {
            for (let j = 0; j < this.grid[i].length; j++) {
                if (this.grid[i][j] !== 1 && this.grid[i][j] !== 9) {
                    this.grid[i][j] = 2;
                    this.items.push(new Item((j * CELL_SIZE) + (CELL_SIZE / 2), (i * CELL_SIZE) + (CELL_SIZE / 2), 1, j, i));
                }
            }
        }
    }

    check_collisions = () => {
        // ghost collision
        let collision_flag = false;
        for (let i = 0; i < this.enemy.length; i++) {
            const ghost = this.enemy[i];
            // see if some agent goes into enemy
            for (let j = 0; j < this.agents.length; j++) {
                const agent = this.agents[j];
                const dist = agent.pos.dist_from(ghost.pos);

                if (dist < ghost.radius + agent.rad) {
                    // wait lets just make sure that this isn't through a wall
                    let res_check = this.stuff_collide_(agent.pos, ghost.pos, true, false, false);
                    if (!res_check) {
                        agent.digestion_signal += -20;
                       
                        agent.pos = new Vec(PACMAN_POS[1], PACMAN_POS[0]);
                        agent.coords = [agent.pos.x < CELL_SIZE ? 0 : (agent.pos.x - (CELL_SIZE / 2)) / CELL_SIZE, agent.pos.y < CELL_SIZE ? 0 : (agent.pos.y - (CELL_SIZE / 2)) / CELL_SIZE];

                        collision_flag = true;
                        this.respawn_food();
                    }
                }
            }
        }
        if (collision_flag) {
            for (let i = 0; i < this.enemy.length; i++) {
                const ghost = this.enemy[i];

                ghost.pos = new Vec((GHOST_POSITIONS[i][0] * CELL_SIZE) + (CELL_SIZE / 2), (GHOST_POSITIONS[i][1] * CELL_SIZE) + (CELL_SIZE / 2));
                ghost.coords = [ghost.pos.x < CELL_SIZE ? 0 : (ghost.pos.x - (CELL_SIZE / 2)) / CELL_SIZE, ghost.pos.y < CELL_SIZE ? 0 : (ghost.pos.y - (CELL_SIZE / 2)) / CELL_SIZE]
            }
            collision_flag = false;
        }
    }

    tick = () => {
        // tick the environment
        this.clock++;

        // fix input to all agents based on environment
        // process eyes
        this.collpoints = [];

        for (let i = 0; i < this.agents.length; i++) {
            const agent = this.agents[i];
            for (let j = 0; j < agent.eyes.length; j++) {
                const eye = agent.eyes[j];
                // we have a line from p to p->eyep
                let eye_pos = 0;
                switch (eye.direction) {
                    case 'up':
                        eye_pos = new Vec(agent.pos.x, agent.pos.y + eye.max_range);
                        break;
                    case 'down':
                        eye_pos = new Vec(agent.pos.x, agent.pos.y - eye.max_range);
                        break;
                    case 'left':
                        eye_pos = new Vec(agent.pos.x + eye.max_range, agent.pos.y);
                        break;
                    case 'right':
                        eye_pos = new Vec(agent.pos.x - eye.max_range, agent.pos.y);
                        break;
                    default:
                        break;
                }
                
                const res = this.stuff_collide_(agent.pos, eye_pos, true, true, true);
                if (res) {
                    // eye collided with wall
                    eye.sensed_proximity = res.up.dist_from(agent.pos);
                    eye.sensed_type = res.type;
                } else {
                    eye.sensed_proximity = eye.max_range;
                    eye.sensed_type = -1;
                }
            }
        }

        // let the agents behave in the world based on their input
        for (let i = 0; i < this.agents.length; i++) {
            this.agents[i].forward();
        }

        // apply outputs of agents on environment
        for (let i = 0; i < this.agents.length; i++) {
            const agent = this.agents[i];
            agent.old_pos = agent.pos; // back up old position
            agent.old_angle = agent.angle; // and angle

            agent.pos = new Vec(agent.pos.x + agent.move[0], agent.pos.y + agent.move[1]);

            // agent is trying to move from p to op. Check walls
            let res = this.stuff_collide_(agent.old_pos, agent.pos, true, false, false);
            

            // wall collision! reset position
            if (res) agent.pos = agent.old_pos;

            // handle boundary conditions
            if (agent.pos.x < 0) agent.pos.x = 0;
            if (agent.pos.x > this.W) agent.pos.x = this.W;
            if (agent.pos.y < 0) agent.pos.y = 0;
            if (agent.pos.y > this.H) agent.pos.y = this.H;

            // set new coords 
            agent.coords = [agent.pos.x < CELL_SIZE ? 0 : (agent.pos.x - (CELL_SIZE / 2)) / CELL_SIZE, agent.pos.y < CELL_SIZE ? 0 : (agent.pos.y - (CELL_SIZE / 2)) / CELL_SIZE];
        }


        // ghost collision
        this.check_collisions();

        // tick all items
        let update_items = false;
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            item.age += 1;

            // see if some agent gets lunch
            for (let j = 0; j < this.agents.length; j++) {
                const agent = this.agents[j];
                const dist = agent.pos.dist_from(item.position);
                if (dist < item.radius + agent.rad) {
                    // wait lets just make sure that this isn't through a wall
                    let res_check = this.stuff_collide_(agent.pos, item.position, true, false, false);
                    if (!res_check) {
                        // ding! nom nom nom
                        if (item.type === 1) agent.digestion_signal += 6; // mmm delicious apple
                        
                        item.cleanup_ = true;
                        update_items = true;
                        // change level grid
                        this.free_grid(item.coordinates);
                        // break out of loop, item was consumed
                        break; 
                    }
                }
            }

            // if (item.age > 5000 && this.clock % 100 === 0 && convnetjs.randf(0, 1) < 0.1) {
            //     // replace this one, has been around too long
            //     item.cleanup_ = true;
            //     update_items = true;
            // }
        }

        if (update_items) {
            let old_items = [];
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                this.free_grid(item.coordinates);
                if (!item.cleanup_) old_items.push(item);
            }
            // swap
            this.items = old_items;
        }

        // if (this.items.length < 100) {
        //     for (let i = 0; i < 100 - this.items.length; i++) {
        //         let available_squares = getGridFreeSquares(this.grid);
        //         if (available_squares.length) {
        //             let [new_item_x, new_item_y] = available_squares[Math.floor(Math.random()*available_squares.length)];
                    
        //             let new_item = new Item((new_item_x * CELL_SIZE) + (CELL_SIZE / 2), (new_item_y * CELL_SIZE) + (CELL_SIZE / 2), 1, new_item_x, new_item_y);
        //             this.grid[new_item_y][new_item_x] = 2;
        //             this.items.push(new_item);
        //         }
        //     }
        // }

        // agents are given the opportunity to learn based on feedback of their action on environment
        for (let i = 0; i < this.agents.length; i++) {
            this.agents[i].backward();
        }

        for (let i = 0; i < this.enemy.length; i++) {
            this.enemy[i].makeMove(this.grid, this.agents[0].coords);
        }

        // ghost collision
        this.check_collisions();
    }
}

