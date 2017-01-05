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

var SHARP_CHAR = '\u266F';
var FLAT_CHAR = '\u266D';

var MAJOR_KEYS = {
    "F": [0, 2, 4, 5, 7, 9, 10],
    "C": [0, 2, 4, 5, 7, 9, 11],
    "G": [0, 2, 4, 6, 7, 9, 11],
    "D": [1, 2, 4, 6, 7, 9, 11],
    "A": [1, 2, 4, 6, 8, 9, 11],
    "E": [1, 3, 4, 6, 8, 9, 11],
    "B": [1, 3, 4, 6, 8, 10, 11],
    "F#": [1, 3, 5, 6, 8, 10, 11],
    "Gb": [-1, 1, 3, 5, 6, 8, 10],
    "Db": [0, 1, 3, 5, 6, 8, 10],
    "Ab": [0, 1, 3, 5, 7, 8, 10],
    "Eb": [0, 2, 3, 5, 7, 8, 10],
    "Bb": [0, 2, 3, 5, 7, 9, 10],
}


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
        global.score = Math.max(0, global.score - global.penalty);
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
        global.score = Math.max(0, global.score - global.penalty);
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

    drawLines();
    drawTargets();
    drawInfo();

    function drawLines() {
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

        // guides
        for (var yprop = 0.1; yprop < 0.95; yprop += 0.05) {
            var yval = yprop * ymax;
            drawLine("lightGray", 0, yval, xmax, yval, false);
        }

        // staff one
        if (global.treble) {
            drawLine("black", 0, 0.25 * ymax, xmax, 0.25 * ymax, true);
            drawLine("black", 0, 0.3 * ymax, xmax, 0.3 * ymax, true);
            drawLine("black", 0, 0.35 * ymax, xmax, 0.35 * ymax, true);
            drawLine("black", 0, 0.4 * ymax, xmax, 0.4 * ymax, true);
            drawLine("black", 0, 0.45 * ymax, xmax, 0.45 * ymax, true);
        }

        // staff two
        if (global.bass) {
            drawLine("black", 0, 0.55 * ymax, xmax, 0.55 * ymax, true);
            drawLine("black", 0, 0.6 * ymax, xmax, 0.6 * ymax, true);
            drawLine("black", 0, 0.65 * ymax, xmax, 0.65 * ymax, true);
            drawLine("black", 0, 0.7 * ymax, xmax, 0.7 * ymax, true);
            drawLine("black", 0, 0.75 * ymax, xmax, 0.75 * ymax, true);
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

    function drawTargets() {
        for (var i = 0; i < global.targets.length; i++) {
            var target = global.targets[i];
            drawTarget(target);
        }
        function drawTarget(target) {
            var xval = target.x * xmax;
            var yval = target.y * ymax;
            var rval = Math.min(
                global.target_size,
                xmax * Math.abs(target.x - 0.1)
            );
            ctx.beginPath();
            ctx.fillStyle = global.target_color;
            ctx.strokeStyle = "black";
            ctx.arc(xval, yval, rval, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        }
    }

    function drawInfo() {
        var xlut = {
            flats: [0.06, 0.04, 0.02, 0.07, 0.05, 0.03, 0.01],
            sharps: [0.02, 0.04, 0.06, 0.01, 0.03, 0.05, 0.07],
        };
        var ylut = {
            flats: [0.325, 0.3, 0.275, 0.425, 0.4, 0.375, 0.35],
            sharps: [0.325, 0.3, 0.275, 0.25, 0.225, 0.375, 0.35],
        };
        var xval = null;
        var yval = null;
        var symbol = null;
        for (var i = 0; i < global.key.length; i++) {
            symbol = null;
            if (global.key[i] < MAJOR_KEYS["C"][i]) {
                symbol = FLAT_CHAR;
                xval = xlut.flats[i] * xmax;
                yval = ylut.flats[i] * ymax + 8;
            }
            else if (global.key[i] > MAJOR_KEYS["C"][i]) {
                symbol = SHARP_CHAR;
                xval = xlut.sharps[i] * xmax;
                yval = ylut.sharps[i] * ymax + 8;
            }
            if (symbol !== null) {
                drawText(symbol, xval, yval, "black", "black", 16);
            }
        }

        var score = global.score;
        xval = 0.025 * xmax;
        yval = 0.025 * ymax;
        drawText("Points: " + score, xval, yval, "black", "white", 8);

        var best = global.best;
        xval = 0.025 * xmax;
        yval = 0.05 * ymax;
        drawText("Record: " + best, xval, yval, "black", "white", 8);

        function drawText(txt, x, y, fColor, sColor, size) {
            ctx.font = "" + size + "pt Arial";
            ctx.strokeStyle = sColor;
            ctx.fillStyle = fColor;
            ctx.strokeText(txt, x, y);
            ctx.fillText(txt, x, y);
        }
    }
}

////////////////////////////////////////////////////////////////
// main
////////////////////////////////////////////////////////////////

function main(argv) {
    global.key = MAJOR_KEYS["C"];
    global.pool = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    global.treble = true;
    global.bass = true;
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
    global.penalty = 5;
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
