var AudioContext = window.AudioContext || window.webkitAudioContext;
var ctx = new AudioContext();
var fmap = {};
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
	bButton = utils.$("#bButton")[0];
	fField = utils.$("#fField")[0];

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
		onkeydown = document.onkeydown;
		onkeyup = document.onkeyup;
		document.onkeydown = function(evt) {};
		document.onkeyup = function(evt) {
			keyid = utils.keyEventSourceId(evt);
			fmap[keyid] = parseInt(fField.value);
			document.onkeydown = onkeydown;
			document.onkeyup = onkeyup;
		};
	};
}
