"use strict";

var global = {};

var MIDI_MAP = [
    "CC",
    "CD",
    "DD",
    "DE",
    "EE",
    "FF",
    "FG",
    "GG",
    "GA",
    "AA",
    "AB",
    "BB",
];

var CC_MAJOR = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21];

////////////////////////////////////////////////////////////////
// midi
////////////////////////////////////////////////////////////////

function midiInputSetup() {
    var ok = false;
    var input = global.midiAccess.inputs.values().next();
    while (input && !(input.done)) {
        input.value.onmidimessage = onMIDIMessage;
        input = input.next;
        ok = true;
    }
    if (!ok) {
        alert("MIDI input device not found.");
    }
}
function onMIDIAccept(midi) {
    global.midiAccess = midi;
    global.midiAccess.onstatechange = midiInputSetup;
    midiInputSetup();
    tick.cache = {};
    setInterval(function() {
        tick(tick.cache);
    }, 1000 / global.ticksPerSecond);
}
function onMIDIReject(err) {
    alert("MIDI system failed to start.");
}
function onMIDIMessage(evt) {
    var channel = evt.data[0] & 0xF;
    var type = evt.data[0] & 0xF0;
    if (type === 0x90) {
        var velocity = evt.data[2];
        var note = evt.data[1];
        if (velocity === 0) {
            noteOff(note);
            return;
        }
        else {
            noteOn(note);
            return;
        }
    }
    else if (type === 0x80) {
        var note = evt.data[1];
        noteOff(note);
        return;
    }
}
function note2frequency(note) {
    return utils.i32(440 * Math.pow(2, (note - 69) / 12));
}
function noteOn(note) {
    console.log("Note on: " + note + " - " + note2frequency(note) + "hz");
    global.activeNotes.push(note);
    if (global.targets.length < 1) {
        onWrongNote();
    }
    else {
        var target = global.targets[0];
        var temp = note - global.key[target.offset];
        var memento = utils.orElse(global.memento, temp - (temp % 12));
        var targetNote = memento + global.key[target.offset];
        if (note === targetNote) {
            onRightNote();
        }
        else {
            onWrongNote();
        }
    }
    function onRightNote() {
        var target = global.targets[0];
        global.memento = note - global.key[target.offset];
        global.targets.splice(0, 1);
        global.targetColor = "black";
        global.score += 1;
        if (global.score > global.best) {
            global.best = global.score;
        }
    }
    function onWrongNote() {
        global.memento = null;
        global.targetColor = "gray";
        global.score = 0;
    }
}
function noteOff(note) {
    console.log("Note off: " + note + " - " + note2frequency(note) + "hz");
    var activeNotes = global.activeNotes;
    var idx = activeNotes.indexOf(note);
    if (idx > -1) {
        activeNotes.splice(idx, 1);
    }
}

////////////////////////////////////////////////////////////////
// game
////////////////////////////////////////////////////////////////

function tick(cache) {
    if (!("tick" in cache)) {
        cache.tick = tick;
        cache.frameCounter = 0;
        cache.targetCounter = 0;
    }
    var dt = 1 / global.ticksPerSecond;
    for (var i = 0; i < global.targets.length; i++) {
        var target = global.targets[i];
        target.x += global.xVelocity * dt;
        target.y += global.yVelocity * dt;
    }
    while (global.targets.length > 0 && global.targets[0].x < 0.1) {
        global.memento = null;
        global.targets.splice(0, 1);
        global.targetColor = "red";
        global.score = 0;
    }
    if (cache.frameCounter > 1 / global.framesPerSecond) {
        draw();
        cache.frameCounter = 0;
    }
    if (cache.targetCounter > 1 / global.targetsPerSecond) {
        var idx = utils.i32(utils.random(null) * global.pool.length);
        var offset = global.pool[idx];
        var newTarget = {
            offset: offset,
            x: 1,
            y: 0.8 - offset * 0.05,
        };
        global.targets.push(newTarget);
        cache.targetCounter = 0;
    }
    cache.frameCounter += dt;
    cache.targetCounter += dt;
}

function draw() {
    var cvs = global.canvas;
    var ctx = cvs.getContext("2d");
    var xmin = 0;
    var ymin = 0;
    var xmax = cvs.width;
    var ymax = cvs.height;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // border
    drawLine("black", xmin, ymin, xmin, ymax);
    drawLine("black", xmin, ymin, xmax, ymin);
    drawLine("black", xmax, ymin, xmax, ymax);
    drawLine("black", xmin, ymax, xmax, ymax);

    // boundary
    drawLine("black", 0.1 * xmax, ymin, 0.1 * xmax, ymax);

    // bar
    drawLine("black", 0, 0.3 * ymax, xmax, 0.3 * ymax);
    drawLine("black", 0, 0.4 * ymax, xmax, 0.4 * ymax);
    drawLine("black", 0, 0.5 * ymax, xmax, 0.5 * ymax);
    drawLine("black", 0, 0.6 * ymax, xmax, 0.6 * ymax);
    drawLine("black", 0, 0.7 * ymax, xmax, 0.7 * ymax);

    // extended bar
    drawLine("lightGray", 0, 0.1 * ymax, xmax, 0.1 * ymax);
    drawLine("lightGray", 0, 0.2 * ymax, xmax, 0.2 * ymax);
    drawLine("lightGray", 0, 0.8 * ymax, xmax, 0.8 * ymax);
    drawLine("lightGray", 0, 0.9 * ymax, xmax, 0.9 * ymax);

    for (var i = 0; i < global.targets.length; i++) {
        var target = global.targets[i];
        drawTarget(target);
    }

    var score = global.score;
    ctx.fillStyle = "black";
    ctx.strokeStyle = "white";
    ctx.strokeText("Points: " + score, 0.025 * xmax, 0.025 * ymax);
    ctx.fillText("Points: " + score, 0.025 * xmax, 0.025 * ymax);

    var best = global.best;
    ctx.fillStyle = "black";
    ctx.strokeStyle = "white";
    ctx.strokeText("Record: " + best, 0.025 * xmax, 0.05 * ymax);
    ctx.fillText("Record: " + best, 0.025 * xmax, 0.05 * ymax);

    function drawTarget(target) {
        var radius = Math.min(global.targetSize, xmax * (target.x - 0.1));
        ctx.fillStyle = global.targetColor;
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.arc(xmax * target.x, ymax * target.y, radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
    }

    function drawLine(color, x1, y1, x2, y2) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

////////////////////////////////////////////////////////////////
// main
////////////////////////////////////////////////////////////////

function main(argv) {
    global.key = CC_MAJOR;
    global.pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    global.framesPerSecond = 60;
    global.ticksPerSecond = 60;
    global.targetsPerSecond = 1;
    global.targetColor = "black";
    global.targetSize = 16;
    global.xVelocity = -0.10;
    global.yVelocity = 0;
    global.targets = [];
    global.memento = null;
    global.score = 0;
    global.best = 0;
    global.canvas = document.getElementById("canvas");
    global.context = null;
    global.midiAccess = null;
    global.activeNotes = [];
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.addEventListener('load', function() {
        global.context = new AudioContext();
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(onMIDIAccept, onMIDIReject);
        }
        else {
            alert("MIDI functionality not supported by browser.")
        }
    });
}
