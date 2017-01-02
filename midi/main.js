"use strict";

var global = {};

var KEYBOARD_MAP = {
    "a": 69,
    "s": 71,
    "d": 72,
    "f": 74,
    "g": 76,
    "h": 77,
    "j": 79,
    "k": 81,
    "l": 83,
};

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

var URI_SUBS = [
    ["\"", "Q"],
    [",", "AND"],
    [":", "IS"],
    ["{", "OBJ"],
    ["}", "JBO"],
    ["[", "LST"],
    ["]", "TSL"]
];

var CC_MAJOR = [0, 2, 4, 5, 7, 9, 11];

////////////////////////////////////////////////////////////////
// midi
////////////////////////////////////////////////////////////////

function midiInputSetup() {
    var ok = false;
    var input = global.midi_access.inputs.values().next();
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
    global.midi_access = midi;
    global.midi_access.onstatechange = midiInputSetup;
    midiInputSetup();
    tick.cache = {};
    tick(tick.cache);
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
    if (utils.contains(global.active_notes, note)) {
        return;
    }
    console.log("Note on: " + note + " - " + note2frequency(note) + "hz");
    global.active_notes.push(note);
    if (global.targets.length < 1) {
        onWrongNote();
    }
    else {
        var target = global.targets[0];
        var key = global.key;
        var idx = utils.mod(target.offset, key.length);
        var delta = 12 * Math.floor(target.offset / key.length) + key[idx];
        var memento = utils.orElse(global.memento, note - delta);
        if (memento % 12 === 0 && note === memento + delta) {
            onRightNote(memento);
        }
        else {
            onWrongNote();
        }
    }
    function onRightNote(memento) {
        var target = global.targets[0];
        global.memento = memento;
        global.targets.splice(0, 1);
        global.target_color = "black";
        global.score += 1;
        if (global.score > global.best) {
            global.best = global.score;
        }
    }
    function onWrongNote() {
        global.memento = null;
        global.target_color = "red";
        global.score = global.score / 2;
    }
}
function noteOff(note) {
    if (!(utils.contains(global.active_notes, note))) {
        return;
    }
    console.log("Note off: " + note + " - " + note2frequency(note) + "hz");
    var active_notes = global.active_notes;
    var idx = active_notes.indexOf(note);
    if (idx > -1) {
        active_notes.splice(idx, 1);
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
    var dt = 1 / global.ticks_per_second;
    for (var i = 0; i < global.targets.length; i++) {
        var target = global.targets[i];
        target.x += global.x_velocity * dt;
        target.y += global.y_velocity * dt;
    }
    while (global.targets.length > 0 && global.targets[0].x < 0.1) {
        global.memento = null;
        global.targets.splice(0, 1);
        global.target_color = "red";
        global.score = global.score / 2;
    }
    if (cache.frameCounter > 1 / global.frames_per_second) {
        draw();
        cache.frameCounter = 0;
    }
    if (cache.targetCounter > 1 / global.targets_per_second) {
        var offset = null;
        if (global.mystery === null) {
            if (global.pool.length > 0) {
                var idx = utils.i32(utils.random(null) * global.pool.length);
                offset = global.pool[idx];
            }
        }
        else {
            for (var i = 0; i < global.mystery.length; i++) {
                var elt = global.mystery.splice(0, 1)[0];
                if (utils.contains(global.pool, elt)) {
                    offset = elt;
                    break;
                }
            }
        }
        if (offset !== null) {
            global.targets.push({
                offset: offset,
                x: 1,
                y: 0.5 - offset * 0.025,
            });
        }
        cache.targetCounter = 0;
    }
    cache.frameCounter += dt;
    cache.targetCounter += dt;
    setTimeout(function() {
        tick(cache);
    }, 1000 / global.ticks_per_second);
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
    drawLine("black", xmin, ymin, xmin, ymax, false);
    drawLine("black", xmin, ymin, xmax, ymin, false);
    drawLine("black", xmax, ymin, xmax, ymax, false);
    drawLine("black", xmin, ymax, xmax, ymax, false);

    // boundary
    drawLine("black", 0.1 * xmax, ymin, 0.1 * xmax, ymax, false);

    // guide one
    drawLine("lightGray", 0, 0.1 * ymax, xmax, 0.1 * ymax, false);
    drawLine("lightGray", 0, 0.15 * ymax, xmax, 0.15 * ymax, false);
    drawLine("lightGray", 0, 0.2 * ymax, xmax, 0.2 * ymax, false);

    // bar one
    drawLine("black", 0, 0.25 * ymax, xmax, 0.25 * ymax, true);
    drawLine("black", 0, 0.3 * ymax, xmax, 0.3 * ymax, true);
    drawLine("black", 0, 0.35 * ymax, xmax, 0.35 * ymax, true);
    drawLine("black", 0, 0.4 * ymax, xmax, 0.4 * ymax, true);
    drawLine("black", 0, 0.45 * ymax, xmax, 0.45 * ymax, true);

    // guide two
    drawLine("lightGray", 0, 0.5 * ymax, xmax, 0.5 * ymax, false);

    // bar two
    drawLine("black", 0, 0.55 * ymax, xmax, 0.55 * ymax, true);
    drawLine("black", 0, 0.6 * ymax, xmax, 0.6 * ymax, true);
    drawLine("black", 0, 0.65 * ymax, xmax, 0.65 * ymax, true);
    drawLine("black", 0, 0.7 * ymax, xmax, 0.7 * ymax, true);
    drawLine("black", 0, 0.75 * ymax, xmax, 0.75 * ymax, true);

    // guide three
    drawLine("lightGray", 0, 0.8 * ymax, xmax, 0.8 * ymax, false);
    drawLine("lightGray", 0, 0.85 * ymax, xmax, 0.85 * ymax, false);
    drawLine("lightGray", 0, 0.9 * ymax, xmax, 0.9 * ymax, false);

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
        var radius = Math.min(global.target_size, xmax * Math.abs(target.x - 0.1));
        ctx.beginPath();
        ctx.fillStyle = global.target_color;
        ctx.strokeStyle = "black";
        ctx.arc(xmax * target.x, ymax * target.y, radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }

    function drawLine(color, x1, y1, x2, y2, wide) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = wide ? 2 : 1;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath();
    }
}

////////////////////////////////////////////////////////////////
// main
////////////////////////////////////////////////////////////////

function main(argv) {
    global.key = CC_MAJOR;
    global.pool = [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    global.frames_per_second = 60;
    global.ticks_per_second = 60;
    global.targets_per_second = 1;
    global.target_color = "black";
    global.target_size = 8;
    global.x_velocity = -0.10;
    global.y_velocity = 0;
    global.targets = [];
    global.mystery = null;
    global.memento = null;
    global.score = 0;
    global.best = 0;
    global.canvas = document.getElementById("canvas");
    global.context = null;
    global.midi_access = null;
    global.active_notes = [];
    utils.update(global, utils.uri2data(window.location.href, URI_SUBS));
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
    document.onkeydown = function(evt) {
        var keyid = utils.keyEventSourceId(evt);
        if (KEYBOARD_MAP.hasOwnProperty(keyid)) {
            var note = KEYBOARD_MAP[keyid];
            noteOn(note);
        }
    };
    document.onkeyup = function(evt) {
        var keyid = utils.keyEventSourceId(evt);
        if (KEYBOARD_MAP.hasOwnProperty(keyid)) {
            var note = KEYBOARD_MAP[keyid];
            noteOff(note);
        }
    };
}
