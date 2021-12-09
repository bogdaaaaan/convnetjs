import Agent from './js/classes/Agent.js';
import World from './js/classes/World.js';
import { CELL_SIZE, GRID_SIZE } from './js/utils/constants.js';


// constants
// buttons
const go_very_fast_btn = document.getElementById('go_very_fast');
const go_fast_btn = document.getElementById('go_fast');
const go_normal_btn = document.getElementById('go_normal');
const go_slow_btn = document.getElementById('go_slow');
const start_learn_btn = document.getElementById('start_learn');
const stop_learn_btn = document.getElementById('stop_learn');
const save_net_btn = document.getElementById('save_net');
const load_net_btn = document.getElementById('load_net');

// graph with rewards
const reward_graph = new cnnvis.Graph();

// canvases
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const net_canvas = document.getElementById('net_canvas');
const net_ctx = net_canvas.getContext('2d');

const vis_canvas = document.getElementById('vis_canvas');
const vis_ctx = vis_canvas.getContext('2d');

const graph_canvas = document.getElementById('graph_canvas');

// canvas style
canvas.width = (CELL_SIZE * GRID_SIZE);
canvas.height = (CELL_SIZE * GRID_SIZE);


// world creation
const world = new World(canvas);
world.agents = [new Agent()];

// let variables
let simulation_speed = 2;
let current_interval_id;
let skip_draw = false;

const draw_net = () => {
    if (world.clock % 50 !== 0 && simulation_speed > 1) return;

    const H = net_canvas.height;

    net_ctx.clearRect(0, 0, net_canvas.width, net_canvas.height);

    // set styles
    net_ctx.font = '12px Verdana';
    net_ctx.fillStyle = 'rgb(0,0,0)';
    net_ctx.fillText('Value Function Approximating Neural Network:', 10, 14);
    
    let layers = world.agents[0].brain.value_net.layers;

    // positions of layers
    let x = 10;
    let y = 40;

    for (let i = 0; i < layers.length; i++) {
        if (typeof layers[i].out_act === 'undefined') continue; // maybe not yet ready

        let kw = layers[i].out_act.w;
        let neurons = kw.length;

        net_ctx.fillStyle = 'rgb(0,0,0)';
        net_ctx.fillText(layers[i].layer_type + '(' + neurons + ')', x, 35);

        for (let j = 0; j < neurons; j++) {
            const v = Math.floor(kw[j] * 100);

            if (v >= 0) net_ctx.fillStyle = 'rgb(0,0,' + v + ')';
            if (v < 0) net_ctx.fillStyle = 'rgb(' + -v + ',0,0)';

            net_ctx.fillRect(x, y, 10, 10);

            y += 12;
            if (y > H - 25) {
                y = 40;
                x += 12;
            }
        }
        x += 50;
        y = 40;
    }
}

function draw_stats() {
    vis_ctx.clearRect(0, 0, vis_canvas.width, vis_canvas.height);
    vis_ctx.strokeStyle = 'rgb(0,0,0)';
    vis_ctx.lineWidth = 10;
    vis_ctx.beginPath();


    const agent = world.agents[0];
    const brain = agent.brain;
    const net_in = brain.last_input_array;
    
    for (let i = 0; i < net_in.length; i++) {
        vis_ctx.moveTo(10 + i * 12, 120);
        vis_ctx.lineTo(10 + i * 12, 120 - net_in[i] * 100);
    }

    vis_ctx.stroke();

    if (world.clock % 200 === 0) {
        reward_graph.add(world.clock / 200, brain.average_reward_window.get_average());
        reward_graph.drawSelf(graph_canvas);
    }
}

// Draw everything
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;

    // draw walls in environment
    ctx.strokeStyle = 'rgb(0,0,0)';
    ctx.beginPath();
    for (let i = 0; i < world.walls.length; i++) {
        let q = world.walls[i];
        ctx.moveTo(q.p1.x, q.p1.y);
        ctx.lineTo(q.p2.x, q.p2.y);
    }
    ctx.stroke();

    // draw agents
    const agents = world.agents;

     // color agent based on reward it is experiencing at the moment
    let reward = Math.floor(agents[0].brain.latest_reward * 200);
    if (reward > 255) reward = 255;
    if (reward < 0) reward = 0;

    ctx.fillStyle = 'rgb(' + reward + ', 150, 150)';
    ctx.strokeStyle = 'rgb(0,0,0)';

    for (let i = 0; i <  agents.length; i++) {
        let agent = agents[i];

        // draw agents body
        ctx.beginPath();
        ctx.arc(agent.old_pos.x, agent.old_pos.y, agent.rad, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.stroke();

        // draw agents sight
        for (let j = 0; j < agent.eyes.length; j++) {
            let eye = agent.eyes[j];

            if (eye.sensed_type === -1 || eye.sensed_type === 0) {
                ctx.strokeStyle = 'rgb(0,0,0)'; // wall or nothing
            }
            if (eye.sensed_type === 1) {
                ctx.strokeStyle = 'rgb(255,150,150)';
            } // apples
            if (eye.sensed_type === 2) {
                ctx.strokeStyle = 'rgb(150,255,150)';
            } // poison

            ctx.beginPath();
            ctx.moveTo(agent.old_pos.x, agent.old_pos.y);

            switch (eye.direction) {
                case 'up':
                    ctx.lineTo(agent.old_pos.x, agent.old_pos.y + eye.sensed_proximity);
                    break;
                case 'down':
                    ctx.lineTo(agent.old_pos.x, agent.old_pos.y - eye.sensed_proximity);
                    break;
                case 'left':
                    ctx.lineTo(agent.old_pos.x + eye.sensed_proximity, agent.old_pos.y);
                    break;
                case 'right':
                    ctx.lineTo(agent.old_pos.x - eye.sensed_proximity, agent.old_pos.y);
                    break;
                default:
                    break;
            }
            ctx.stroke();
        }
    }


    // draw items
    ctx.strokeStyle = 'rgb(0,0,0)';
    for (let i = 0; i < world.items.length; i++) {
        let item = world.items[i];

        if (item.type === 1) ctx.fillStyle = 'rgb(255, 150, 150)';
        if (item.type === 2) ctx.fillStyle = 'rgb(150, 255, 150)';

        ctx.beginPath();
        ctx.arc(item.position.x, item.position.y, item.radius, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.stroke();
    }

    // draw enemy
    const enemy = world.enemy;

    for (let i = 0; i < enemy.length; i++) {
        const ghost = enemy[i];

        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.strokeStyle = 'rgb(0,0,0)';
        // draw agents body
        ctx.beginPath();
        ctx.arc(ghost.pos.x, ghost.pos.y, ghost.radius, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.stroke();
    }

    world.agents[0].brain.visSelf(document.getElementById('brain_info_div'));
}

// Tick the world
const tick = () => {
    world.tick();
    if (!skip_draw || world.clock % 50 === 0) {
        draw();
        draw_stats();
        draw_net();
    }
}

// page controls
const go_very_fast = () => {
    window.clearInterval(current_interval_id);
    current_interval_id = setInterval(tick, 0);
    skip_draw = true;
    simulation_speed = 3;
}
const go_fast = () => {
    window.clearInterval(current_interval_id);
    current_interval_id = setInterval(tick, 0);
    skip_draw = false;
    simulation_speed = 2;
}
const go_normal = () => {
    window.clearInterval(current_interval_id);
    current_interval_id = setInterval(tick, 30);
    skip_draw = false;
    simulation_speed = 1;
}
const go_slow = () => {
    window.clearInterval(current_interval_id);
    current_interval_id = setInterval(tick, 200);
    skip_draw = false;
    simulation_speed = 0;
}
const start_learn = () => {
    world.agents[0].brain.learning = true;
}
const stop_learn = () => {
    world.agents[0].brain.learning = false;
}
const save_net = () => {
    let json_net = "data:text/json;charset=utf-8," + JSON.stringify(world.agents[0].brain.value_net.toJSON());

    let encodedUri = encodeURI(json_net);
    let link = document.createElement("a");
    link.style.display = "none";
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trained_agent.json");
    document.body.appendChild(link);
    link.click();
}

const load_net = () => {
    let file_upload = document.getElementById("file_upload");
    if (file_upload) file_upload.click();

    function test() {
        const fileList = this.files;
        let fr = new FileReader();

        fr.onload = function(e) { 
            let result = JSON.parse(e.target.result);
            world.agents[0].brain.value_net.fromJSON(result);
        }

        fr.readAsText(fileList.item(0));
        stop_learn();
        go_normal();
    }
    file_upload.addEventListener("change", test);
}

function start() {
    go_fast();
}

start();

window.addEventListener('click', (e) => {
    let target = e.target;
    switch(target) {
        case go_very_fast_btn:
            go_very_fast();
            break;
        case go_fast_btn:
            go_fast();
            break;
        case go_normal_btn:
            go_normal();
            break;
        case go_slow_btn:
            go_slow();
            break;
        case start_learn_btn:
            start_learn();
            break;
        case stop_learn_btn:
            stop_learn();
            break;
        case save_net_btn:
            save_net();
            break;
        case load_net_btn:
            load_net();
            break;
        default:
            break;
    }
})
