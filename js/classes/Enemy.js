import { CELL_SIZE } from '../utils/constants.js';
import Vec from './Vector.js';

export default class Enemy {
    constructor(coords, movement) {
        this.pos = new Vec((coords[0] * CELL_SIZE) + (CELL_SIZE / 2), (coords[1] * CELL_SIZE) + (CELL_SIZE / 2));
        // this.coords[0], y
        this.coords = coords;
        this.radius = 10;
        this.movement = movement;
    }

    makeMove(grid, to) {   
        if (this.movement === 'follow') this.follow(grid, to);
        if (this.movement === 'random') this.random(grid);
    }

    random(grid) {
        let moves = [];
        if (grid[this.coords[1]-1][this.coords[0]] !== 1) moves.push([this.coords[0],this.coords[1]-1]);
        if (grid[this.coords[1]+1][this.coords[0]] !== 1) moves.push([this.coords[0],this.coords[1]+1]);
        if (grid[this.coords[1]][this.coords[0]-1] !== 1) moves.push([this.coords[0]-1,this.coords[1]]);
        if (grid[this.coords[1]][this.coords[0]+1] !== 1) moves.push([this.coords[0]+1,this.coords[1]]);

        let rand_indx = Math.floor(Math.random()*moves.length);
        
        this.coords = moves[rand_indx];
        this.pos = new Vec((this.coords[0] * CELL_SIZE) + (CELL_SIZE / 2), (this.coords[1] * CELL_SIZE) + (CELL_SIZE / 2));
    }

    follow(grid, to) {
        // this.coords[0], y => y, this.coords[0]
        let to_position = [...to];
        [to_position[0], to_position[1]] = [to_position[1], to_position[0]];

        let path = this.dfs(grid, [this.coords[1], this.coords[0]], to_position);
        if (!path.length) return;

        let move = path.shift();
            
        [move[0], move[1]] = [move[1], move[0]];

        this.pos = new Vec((move[0] * CELL_SIZE) + (CELL_SIZE / 2), (move[1] * CELL_SIZE) + (CELL_SIZE / 2));
        this.coords = move;
    }

    prep(arr) {
        let visited = [];
        for (let i = 0; i < arr.length; i++) {
            visited[i] = [];
        }

        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr[i].length; j++) {
                switch (arr[i][j]) {
                    case 1:
                        visited[i][j] = true;
                        break;
                    default:
                        visited[i][j] = false;
                        break;
                }
            }
        }

        return {visited: visited, directions:  [[0,1], [0,-1], [1,0], [-1,0]], queue: []};
    }

    dfs(arr, from, to) {

        let props = this.prep(arr);
        let visited = props.visited, dir = props.directions, q = props.queue;
        
        //insert start cell
        q.push([from]);

        //until queue is empty
        while(q.length > 0) {      
            let path = q.shift();
            let p = path[path.length-1];

            //mark as visited
            visited[p[0]][p[1]] = true;
            
            //destination is reached.
            if(p[0] === to[0] && p[1] === to[1]) {
                path.shift();
                path.pop();
                return path;
            } 

            let adjacent = [];
            //check all four directions
            for(let i = 0; i < 4 ;i++) {
                //using the direction array
                let [a, b] = [ p[0] + dir[i][0], p[1] + dir[i][1]];
                if (a < 0 || b < 0 || a >= visited.length || b >= visited.length) continue;
                adjacent.push([a,b]);
            }
      
            for (let i = adjacent.length - 1; i >= 0; i--) {
                let new_path = [];
                let node = adjacent[i];
                //not blocked and valid
                if(!visited[node[0]][node[1]]) {
                    if(node[0] === to[0] && node[1] === to[1]) {
                        new_path.push(...path);
                        new_path.shift();
                        return new_path;
                    }

                    let flag = false;
                    for (let i = 0; i < path.length; i++) {
                        if (path[i][0] === node[0] && path[i][1] === node[1]) {
                            flag = true;
                        }
                    }

                    // main difference:
                    if (!flag) {
                        new_path.push(...path, node);
                        q.push(new_path);
                    }
                }
            } 
        }
        return false;
    }
}