export default class Vec {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    dist_from = (v) => {
        return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2));
    }

    length = () => {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }

    // new vector returning operations
    add = (v) => {
        return new Vec(this.x + v.x, this.y + v.y);
    } 

    sub = (v) => {
        return new Vec(this.x - v.x, this.y - v.y);
    }

    rotate = (a) => {
        // CLOCKWISE
        return new Vec(this.x * Math.cos(a) + this.y * Math.sin(a), -this.x * Math.sin(a) + this.y * Math.cos(a));
    }

    // in place operations
    scale = (s) => {
        this.x *= s;
        this.y *= s;
    }

    normalize = () => {
        let len = this.length();
        this.scale(1.0 / len);
    }
}