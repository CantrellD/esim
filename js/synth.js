/*
    synth.js - Simple tool for generating tones at specific frequencies.
    Copyright (C) 2016 Douglas Cantrell <cantrell.douglas@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

"use strict";

var AudioContext = window.AudioContext || window.webkitAudioContext;
var ctx = new AudioContext();
var fmap = {
    "a": 440.00,
    "s": 493.88,
    "d": 523.25,
    "f": 587.33,
    "g": 659.25,
    "h": 698.46,
    "j": 783.99,
    "k": 880.00,
    "l": 987.77,
};
var generators = {};

function createToneGenerator(frequency, volume) {
    var now = ctx.currentTime;
    var gen = ctx.createOscillator();
    gen.frequency.setTargetAtTime(frequency, now + 0.01, 0.01);
    gen.type = "sine";

    var gnode = ctx.createGain();
    gnode.gain.setTargetAtTime(volume, now + 0.01, 0.01);

    gen.connect(gnode);
    gnode.connect(ctx.destination);
    return gen;
}

function main() {
    bButton = document.getElementById("bButton");
    fField = document.getElementById("fField");

    fField.defaultValue = JSON.stringify(fmap);

    document.onkeydown = function(evt) {
        keyid = utils.keyEventSourceId(evt);
        if (keyid in generators && generators[keyid] !== null) {
            return;
        }
        if (keyid in fmap) {
            frequency = fmap[keyid];
            generators[keyid] = createToneGenerator(frequency, 0.25);
            generators[keyid].start();
        }
    };
    document.onkeyup = function(evt) {
        keyid = utils.keyEventSourceId(evt);
        if (keyid in generators && generators[keyid] !== null) {
            generators[keyid].stop();
            generators[keyid] = null;
        }
    };
    bButton.onclick = function(evt) {
        fmap = JSON.parse(fField.value);
    };
}
