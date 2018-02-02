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
    var gen = ctx.createOscillator();
    gen.frequency.value = frequency;
    gen.type = "sine";

    var gnode = ctx.createGain();
    gnode.gain.value = volume;

    gen.connect(gnode);
    gnode.connect(ctx.destination);
    return gen;
}

function main() {
    bButton = document.getElementById("bButton")[0];
    fField = document.getElementById("fField")[0];

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
