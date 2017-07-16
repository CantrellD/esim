"use strict";

// Degree: Index into a scale.
// Tone: Relative pitch, integer number of semitones.
// Note: Absolute pitch, integer values from MIDI table.

var app = {};
app.HOME_ROW = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"];
app.DEBUG_KEYBOARD_MAP = {
    "a": 69,
    "s": 71,
    "d": 72,
    "f": 74,
    "g": 76,
    "h": 77,
    "j": 79,
    "k": 81,
    "l": 83,
    ";": 84,
    "'": 86,
    "Enter": 88,
};
app.TONES = {
    "C": 0,
    "C#": 1,
    "Db": 1,
    "D": 2,
    "D#": 3,
    "Eb": 3,
    "E": 4,
    "E#": 5,
    "Fb": 4,
    "F": 5,
    "F#": 6,
    "Gb": 6,
    "G": 7,
    "G#": 8,
    "Ab": 8,
    "A": 9,
    "A#": 10,
    "Bb": 10,
    "B": 11,
    "B#": 12,
    "Cb": 11,
};
app.MODES = {
    ionian:     [2, 2, 1, 2, 2, 2, 1],
    dorian:     [2, 1, 2, 2, 2, 1, 2],
    phrygian:   [1, 2, 2, 2, 1, 2, 2],
    lydian:     [2, 2, 2, 1, 2, 2, 1],
    mixolydian: [2, 2, 1, 2, 2, 1, 2],
    aeolian:    [2, 1, 2, 2, 1, 2, 2],
    locrian:    [1, 2, 2, 1, 2, 2, 2],
};
app.SHARP_CHAR = '\u266F';
app.FLAT_CHAR = '\u266D';

app.verbose = false;
app.tonic = "C";
app.mode = "ionian";
app.octave = 5;
app.signature = {upper: 4, lower: 4};
app.pool = [0, 1, 2, 3, 4];
app.kmap = createKeyboardMap(createScale(app.tonic, app.mode), app.octave);

app.treble = true;
app.bass = true;
app.frames_per_second = 60;
app.ticks_per_second = 60;
app.targets_per_second = 1;
app.target_color = "black";
app.target_size = 8;
app.edge = 0.1;
app.x_velocity = -0.10;
app.y_velocity = 0;
app.targets = [];
app.queue = null;
app.score = 0;
app.best = 0;
app.penalty = 5;
app.active_notes = [];
app.frame_counter = 0;
app.target_counter = 0;

app.midi_access = null;
app.canvas = null;
app.context = null;
app.audio = null;
app.sound_generator = null;

////////////////////////////////////////////////////////////////
// midi
////////////////////////////////////////////////////////////////

function note2frequency(note) {
    return utils.ui32(440 * Math.pow(2, (note - 69) / 12));
}

function midiInputSetup() {
    var ok = false;
    var input = app.midi_access.inputs.values().next();
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
    app.midi_access = midi;
    app.midi_access.onstatechange = midiInputSetup;
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
function noteOn(note) {
    if (utils.containsElement(app.active_notes, note)) {
        return;
    }
    if (app.verbose) {
        console.log("Note on: " + note + " - " + note2frequency(note) + "hz");
    }
    app.active_notes.push(note);
    onInput(note);
}
function noteOff(note) {
    if (!utils.containsElement(app.active_notes, note)) {
        return;
    }
    if (app.verbose) {
        console.log("Note off: " + note + " - " + note2frequency(note) + "hz");
    }
    var idx = app.active_notes.indexOf(note);
    if (idx > -1) {
        app.active_notes.splice(idx, 1);
    }
}

////////////////////////////////////////////////////////////////
// misc
////////////////////////////////////////////////////////////////

function createScale(tonic, mode) {
    var scale = [app.TONES[tonic]];
    for (var i = 0; i < app.MODES[mode].length; i++) {
        var interval = app.MODES[mode][i];
        scale.push(scale[scale.length - 1] + interval);
    }
    return scale;
}

function createSoundGenerator(ctx) {
    var speakers = {};
    var rmbuffer = [];
    function produceSound(frequency, volume) {
        var now = app.audio_context.currentTime;
        var key = frequency.toString() + "hz";
        if (speakers.hasOwnProperty(key) && speakers[key] !== null) {
            return;
        }
        var onode = ctx.createOscillator();
        onode.frequency.value = frequency;
        onode.type = "sine";

        var gnode = ctx.createGain();
        gnode.gain.value = 0;

        onode.connect(gnode);
        gnode.connect(ctx.destination);

        speakers[key] = {onode: onode, gnode: gnode};
        speakers[key].onode.start();
        speakers[key].gnode.gain.setTargetAtTime(volume, now + 0.01, 0.01);
    }
    function destroySound(frequency) {
        var now = app.audio_context.currentTime;
        var key = frequency.toString() + "hz";
        if (speakers.hasOwnProperty(key)) {
            var speaker = speakers[key];
            speakers[key] = null;
            rmbuffer.push(speaker);
            speaker.gnode.gain.setTargetAtTime(0, now + 0.01, 0.01);
            setTimeout(function() {
                rmbuffer[0].onode.stop();
                rmbuffer.splice(0, 1);
            }, 1000);
        }
    }
    return {
        produceSound: produceSound,
        destroySound: destroySound,
        speakers: speakers,
        rmbuffer: rmbuffer,
    };
}

function createKeyboardMap(scale, octave) {
    var kmap = {};
    var scale = scale.slice();
    for (var i = 0; i < scale.length; i++) {
        scale[i] = scale[i] + 12 * octave;
    }
    for (var i = 0; i < app.HOME_ROW.length; i++) {
        var key = app.HOME_ROW[i];
        var dval = utils.div(i, scale.length - 1);
        var mval = utils.mod(i, scale.length - 1);
        kmap[key] = scale[mval] + 12 * dval;
    }
    return kmap;
}

function degree2note(scale, octave, degree) {
    var aval = scale[utils.mod(degree, scale.length - 1)];
    var bval = 12 * utils.div(degree, scale.length - 1);
    var cval = 12 * octave;
    return aval + bval + cval;
}

function drawText(ctx, txt, x, y, fColor, sColor, size) {
    ctx.font = "" + size.toString() + "pt Arial";
    ctx.strokeStyle = sColor;
    ctx.fillStyle = fColor;
    ctx.strokeText(txt, x, y);
    ctx.fillText(txt, x, y);
}

function drawLine(ctx, x1, y1, x2, y2, width, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
}

////////////////////////////////////////////////////////////////
// game
////////////////////////////////////////////////////////////////

function onInput(note) {
    if (app.targets.length < 1) {
        onWrongNote();
    }
    else {
        var target = app.targets[0];
        var scale = createScale(app.tonic, app.mode);
        var expected = degree2note(scale, app.octave, target.degree);
        var observed = note;
        if (app.verbose) {
            console.log("Expected: " + expected);
            console.log("Observed: " + observed);
        }
        if (expected === observed) {
            onRightNote();
        }
        else {
            onWrongNote();
        }
    }
    function onRightNote() {
        app.targets.splice(0, 1);
        app.target_color = "black";
        app.score += 1;
        if (app.score > app.best) {
            app.best = app.score;
        }
    }
    function onWrongNote() {
        oops();
    }
}

function oops() {
    app.target_color = "red";
    app.score = Math.max(0, app.score - app.penalty);
}

function tick() {
    var dt = 1 / app.ticks_per_second;
    for (var i = 0; i < app.targets.length; i++) {
        var target = app.targets[i];
        target.x += app.x_velocity * dt;
        target.y += app.y_velocity * dt;
    }
    while (app.targets.length > 0 && app.targets[0].x < app.edge) {
        app.targets.splice(0, 1);
        oops();
    }
    if (app.frame_counter > 1 / app.frames_per_second) {
        draw();
        app.frame_counter = 0;
    }
    if (app.target_counter > 1 / app.targets_per_second) {
        var target = tryCreateTarget();
        if (target !== null) {
            app.targets.push(target);
        }
        app.target_counter = 0;
    }
    app.frame_counter += dt;
    app.target_counter += dt;
    setTimeout(function() {
        tick();
    }, 1000 / app.ticks_per_second);

    function tryCreateTarget() {
        var degree = null;
        if (app.queue === null) {
            if (app.pool.length > 0) {
                var idx = utils.i32(utils.random() * app.pool.length);
                degree = app.pool[idx];
            }
        }
        else {
            for (var i = 0; i < app.queue.length; i++) {
                var elt = app.queue.splice(0, 1)[0];
                if (utils.containsElement(app.pool, elt)) {
                    degree = elt;
                    break;
                }
            }
        }
        if (degree === null) {
            return null;
        }
        var lut = {"C": 0, "D": 1, "E": 2, "F": 3, "G": 4, "A": 5, "B": 6};
        var yref = 0.5 - lut[app.tonic[0]] * 0.025;
        return {
            degree: degree,
            octave: app.octave,
            x: 1,
            y: yref - degree * 0.025,
        };
    }
}

function draw() {
    var cvs = app.canvas;
    var ctx = cvs.getContext("2d");
    var xmin = 0;
    var ymin = 0;
    var xmax = cvs.width;
    var ymax = cvs.height;

    drawLines();
    drawTargets();
    drawKeySignature();
    drawInfo();

    function drawLines() {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // border
        drawLine(ctx, xmin, ymin, xmin, ymax, 1, "black");
        drawLine(ctx, xmin, ymin, xmax, ymin, 1, "black");
        drawLine(ctx, xmax, ymin, xmax, ymax, 1, "black");
        drawLine(ctx, xmin, ymax, xmax, ymax, 1, "black");

        // boundary
        drawLine(ctx, app.edge * xmax, ymin, app.edge * xmax, ymax, 1, "black");

        // guides
        for (var yprop = 0.1; yprop < 0.95; yprop += 0.05) {
            var yval = yprop * ymax;
            drawLine(ctx, 0, yval, xmax, yval, 1, "lightGray");
        }

        // staff one
        if (app.treble) {
            drawLine(ctx, 0, 0.25 * ymax, xmax, 0.25 * ymax, 2, "black");
            drawLine(ctx, 0, 0.30 * ymax, xmax, 0.30 * ymax, 2, "black");
            drawLine(ctx, 0, 0.35 * ymax, xmax, 0.35 * ymax, 2, "black");
            drawLine(ctx, 0, 0.40 * ymax, xmax, 0.40 * ymax, 2, "black");
            drawLine(ctx, 0, 0.45 * ymax, xmax, 0.45 * ymax, 2, "black");
        }

        // staff two
        if (app.bass) {
            drawLine(ctx, 0, 0.55 * ymax, xmax, 0.55 * ymax, 2, "black");
            drawLine(ctx, 0, 0.60 * ymax, xmax, 0.60 * ymax, 2, "black");
            drawLine(ctx, 0, 0.65 * ymax, xmax, 0.65 * ymax, 2, "black");
            drawLine(ctx, 0, 0.70 * ymax, xmax, 0.70 * ymax, 2, "black");
            drawLine(ctx, 0, 0.75 * ymax, xmax, 0.75 * ymax, 2, "black");
        }
    }

    function drawTargets() {
        for (var i = 0; i < app.targets.length; i++) {
            var target = app.targets[i];
            drawTarget(target);
        }
        function drawTarget(target) {
            var xval = target.x * xmax;
            var yval = target.y * ymax;
            var rval = Math.min(
                app.target_size,
                xmax * Math.abs(target.x - 0.1)
            );
            ctx.beginPath();
            ctx.fillStyle = app.target_color;
            ctx.strokeStyle = "black";
            ctx.arc(xval, yval, rval, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        }
    }


    /*\
    var xlut = {
        flats: [0.06, 0.04, 0.02, 0.07, 0.05, 0.03, 0.01],
        sharps: [0.02, 0.04, 0.06, 0.01, 0.03, 0.05, 0.07],
    };
    var ylut = {
        flats: [0.325, 0.3, 0.275, 0.425, 0.4, 0.375, 0.35],
        sharps: [0.325, 0.3, 0.275, 0.25, 0.225, 0.375, 0.35],
    };
    \*/
    function drawKeySignature() {
        var wlut = {
            "C": "ionian",
            "D": "dorian",
            "E": "phrygian",
            "F": "lydian",
            "G": "mixolydian",
            "A": "aeolian",
            "B": "locrian",
        };
        var xlut = {
            "F#": 0,
            "C#": 1,
            "G#": 2,
            "D#": 3,
            "A#": 4,
            "E#": 5,
            "B#": 6,
            "Bb": 0,
            "Eb": 1,
            "Ab": 2,
            "Db": 3,
            "Gb": 4,
            "Cb": 5,
            "Fb": 6,
        };
        var ylut = {
            "A#": 5,
            "B#": 6,
            "C#": 7,
            "D#": 8,
            "E#": 9,
            "F#": 10,
            "G#": 11,
            "Ab": 5,
            "Bb": 6,
            "Cb": 7,
            "Db": 8,
            "Eb": 9,
            "Fb": 3,
            "Gb": 4,
        };
        var scale = createScale(app.tonic, app.mode);
        var white = createScale(app.tonic[0], wlut[app.tonic[0]]);
        var arr = ["C", "D", "E", "F", "G", "A", "B"];
        var sig = {};
        for (var i = 0; i < white.length - 1; i++) {
            var idx = utils.mod(arr.indexOf(app.tonic[0]) + i, arr.length);
            var key = arr[idx];
            var expected = degree2note(white, app.octave, i);
            var observed = degree2note(scale, app.octave, i);
            if (app.tonic === "Cb") {
                expected = degree2note(white, app.octave + 1, i);
            }
            if (expected !== observed) {
                var atom = (observed < expected) ? "b" : "#";
                var symbol = "";
                for (var j = 0; j < Math.abs(observed - expected); j++) {
                    symbol += atom;
                }
                sig[key] = {
                    x: xlut[key + atom],
                    y: ylut[key + atom],
                    z: symbol,
                }
            }
        }

        var keys = utils.keys(sig);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var xprop = 0.01 + sig[key].x * 0.01;
            var yprop = 0.5 - sig[key].y * 0.025;
            var xval = xprop * xmax;
            var yval = yprop * ymax + 8;
            var symbol = sig[key].z;
            symbol = symbol.replace(/[#]/g, app.SHARP_CHAR);
            symbol = symbol.replace(/[b]/g, app.FLAT_CHAR);
            drawText(ctx, symbol, xval, yval, "black", "black", 16);
        }
    }

    function drawInfo() {
        var xval = 0.025 * xmax;
        var yval = 0.025 * ymax;
        drawText(ctx, "Points: " + app.score, xval, yval, "black", "white", 8);

        xval = 0.025 * xmax;
        yval = 0.05 * ymax;
        drawText(ctx, "Record: " + app.best, xval, yval, "black", "white", 8);

    }
}

////////////////////////////////////////////////////////////////
// main
////////////////////////////////////////////////////////////////

function main(argv) {
    app.canvas = document.getElementById("canvas");
    app.audio_context = new AudioContext();
    app.sound_generator = createSoundGenerator(app.audio_context);
    utils.update(app, utils.uri2data(window.location.href, [
        ["\"", "Q"],
        [",", "AND"],
        [":", "IS"],
        ["{", "OBJ"],
        ["}", "JBO"],
        ["[", "LST"],
        ["]", "TSL"]
    ]));
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.addEventListener('load', function() {
        app.context = new AudioContext();
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then(onMIDIAccept, onMIDIReject);
        }
        else {
            alert("Sorry, this browser doesn't seem to support MIDI access.");
        }
    });
    document.onkeydown = function(evt) {
        var keyid = utils.keyEventSourceId(evt);
        if (app.kmap.hasOwnProperty(keyid)) {
            var note = app.kmap[keyid];
            noteOn(note);
            app.sound_generator.produceSound(note2frequency(note), 0.25);
        }
    };
    document.onkeyup = function(evt) {
        var keyid = utils.keyEventSourceId(evt);
        if (app.kmap.hasOwnProperty(keyid)) {
            var note = app.kmap[keyid];
            app.sound_generator.destroySound(note2frequency(note));
            noteOff(note);
        }
    };
}
