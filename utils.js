"use strict";

var utils = (function() {
	var ITR_END = {value: undefined, done: true};

	var EvtEnum = {
		MOUSEDOWN: "mousedown",
		MOUSEUP: "mouseup",
		MOUSEMOVE: "mousemove",
		WHEEL: "wheel",
		CONTEXTMENU: "contextmenu"
	};

	var statics = {
		seed: null,
		prng: null
	};

	function $(arg) {
		assert(arg.charAt(0) === "#");
		return [document.getElementById(arg.slice(1))];
	}

	function assert(invariant) {
		if (!invariant) {
			var src = (new Error).stack.split("\n")[4].trim();
			throw "AssertionError (" + src + ")";
		}
	}

	function i32(arg) {
		return arg | 0;
	}

	function ui32(arg) {
		return arg >>> 0;
	}

	function seed(arg) {
		statics.seed = arg;
		statics.prng = {};
	}

	function random(cache) {
		if (statics.seed === null) {
			return Math.random();
		}
		return ui32(randInt32(cache)) * (1.0 / 4294967296.0);
	}

	// Mersenne Twister 19937
	function randInt32(cache) {
		if (!("seed" in cache)) {
			cache.seed = ui32(statics.seed);
			cache.fval = 1812433253;
			cache.wval = 32;
			cache.nval = 624;
			cache.mval = 397;
			cache.rval = 31;
			cache.aval = 2567483615;
			cache.uval = 11;
			cache.dval = 4294967295;
			cache.sval = 7;
			cache.bval = 2636928640;
			cache.tval = 15;
			cache.cval = 4022730752;
			cache.lval = 18;
			cache.buf = [];
			cache.buf[0] = cache.seed;
			for (var i = 1; i < cache.nval; i++) {
				var product = product32(
					cache.fval,
					cache.buf[i - 1] ^ (cache.buf[i - 1] >>> (cache.wval - 2))
				)
				var sum = ui32(product + i);
				cache.buf.push(lowBits(sum, cache.wval));
			}
			cache.index = cache.nval;
		}

		if (cache.index === cache.nval) {
			var lmask = lowBits(-1, cache.rval);
			var hmask = lowBits(~lmask, cache.wval);
			for (var i = 0; i < cache.nval; i++) {
				var x = ui32(0);
				x = ui32(x + ui32(cache.buf[i] & hmask));
				x = ui32(x + ui32(cache.buf[(i + 1) % cache.nval] & lmask));
				var xa = ui32(x >>> 1);
				if ((x % 2) !== 0) {
					xa = ui32(xa ^ cache.aval);
				}
				cache.buf[i] = ui32(cache.buf[(i + cache.mval) % cache.nval] ^ xa);
			}
			cache.index = 0;
		}
		// Deliberately signed to avoid unnecessary operations.
		var y = i32(cache.buf[cache.index]);
		y = y ^ ((y >>> cache.uval) & cache.dval);
		y = y ^ ((y << cache.sval) & cache.bval);
		y = y ^ ((y << cache.tval) & cache.cval);
		y = y ^ (y >>> cache.lval);
		cache.index += 1;
		return i32(lowBits(y, cache.wval));

		function lowBits(arg, n) {
			var uarg = ui32(arg);
			var ret = ui32(0);
			if (n === 32) {
				ret = ui32(uarg & 0xFFFFFFFF);
			}
			else {
				ret = ui32((ui32(1 << n) - 1) & uarg);
			}
			return ret;
		}
		function product32(lhs, rhs) {
			var ulhs = ui32(lhs);
			var urhs = ui32(rhs);
			var ret = ui32(0);
			for (var shift = 0; shift < 32; shift += 4) {
				var nibble = ui32(ulhs * ((urhs >>> shift) & 0xF));
				ret = ui32(ret + ui32(nibble << shift));
			}
			return ret;
		}
	}

	function gauss(mu, sigma, cache) {
		var u1;
		var u2;
		var tmp;
		if ("value" in cache && cache.value !== null) {
			tmp = cache.value;
			cache.value = null;
			return tmp * sigma + mu;
		}
		do {
			u1 = 2.0 * random(statics.prng) - 1.0;
			u2 = 2.0 * random(statics.prng) - 1.0;
			tmp = u1 * u1 + u2 * u2;
		} while (tmp === 0 || tmp > 1.0);

		tmp = Math.sqrt((-2.0 * Math.log(tmp)) / tmp);
		cache.value = u2 * tmp;
		return u1 * tmp * sigma + mu;
	}

	function hsl2rgb(a,b,c) {
		a *= 6;
		b = [c+=b*=c<.5?c:1-c, c-a%1*b*2, c-=b*=2, c, c+a%1*b, c+b];
		return [b[~~a%6], b[(a|16)%6], b[(a|8)%6]];
	}

	function rgb2str(r, g, b) {
		r = (255 * r) | 0;
		g = (255 * g) | 0;
		b = (255 * b) | 0;
		return "rgb(" + r + ", " + g + ", " + b + ")";
	}

	function insertionSort(arr, cmp) {
		for (var i = 1; i < arr.length; i++) {
			var j = i;
			var t = arr[j];
			while (j > 0 && cmp(arr[j - 1], t) > 0) {
				arr[j] = arr[j - 1];
				j -= 1;
			}
			arr[j] = t;
		}
		return arr;
	}

	function merge(src, dst, a, b, c, cmp) {
		var i = a;
		var j = b;
		var k = a;
		while (k < c) {
			if (i === b) {
				dst[k] = src[j];
				k++;
				j++;
			}
			else if (j === c) {
				dst[k] = src[i];
				k++;
				i++;
			}
			else if (cmp(src[i], src[j]) > 0) {
				dst[k] = src[j];
				k++;
				j++;
			}
			else {
				dst[k] = src[i];
				k++;
				i++;
			}
		}
	}

	function mergeSort(arr, cmp) {
		var copy = arr.slice(0);
		function impl(x, y, a, b, c) {
			if (a === c) {
				return;
			}
			if (b - a > 1) {
				impl(y, x, a, (a + b) >> 1, b);
			}
			if (c - b > 1) {
				impl(y, x, b, (b + c) >> 1, c);
			}
			merge(x, y, a, b, c, cmp);
		}
		impl(copy, arr, 0, arr.length >> 1, arr.length);
		return arr;
	}

	function shuffle(arr) {
		var n, tmp;
		for (var i = arr.length - 1; i > 0; i--) {
			n = Math.floor(random(statics.prng) * (i + 1));
			tmp = arr[i];
			arr[i] = arr[n];
			arr[n] = tmp;
		}
	}

	function asyncFor(start, stop, step, callback) {
		if (start < stop) {
			callback(start);
			setTimeout(
				function() {asyncFor(start + step, stop, step, callback);},
				0
			);
		}
	}

	function cycle(generator) {
		var ret = {};
		var itr = generator();
		ret.next = function() {
			var nxt = itr.next();
			if (nxt.done) {
				itr = generator();
				nxt = itr.next();
			}
			return nxt;
		};
		return ret;
	}

	function ipermute(arr, depth) {
		var ret = {};
		var fin = false;
		var i = 1;
		var child;
		var src = null;
		if (depth < arr.length - 1) {
			child = ipermute(arr, depth + 1);
			ret.next = function() {
				var nxt = child.next();
				if (nxt.done) {
					if (src !== null) {
						var tmp = arr[src];
						arr[src] = arr[depth];
						arr[depth] = tmp;
					}
					if (depth + i < arr.length) {
						src = depth + i;
						var tmp = arr[depth];
						arr[depth] = arr[src];
						arr[src] = tmp;
						child = ipermute(arr, depth + 1);
						nxt = child.next();
						i += 1;
					}
					else {
						src = null;
						nxt = ITR_END;
					}
				}
				return nxt;
			};
		}
		else {
			ret.next = function() {
				if (fin) {
					return ITR_END;
				}
				else {
					fin = true;
					return {value: arr, done: false};
				}
			};
		}
		return ret;
	}

	// TODO: FIXME? Each call to 'next' mutates the object previously returned.
	function permutations(arr, cache) {
		var copy = arr.slice(0);
		return ipermute(copy, 0);
	}

	function reEscape(str){
		return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	function strSwap(str, a, b) {
		var re = new RegExp(reEscape(b), "g");
		var tmp = [];
		str.split(a).forEach(function(x) {
			tmp.push(x.replace(re, a));
		});
		return tmp.join(b);
	}

	function uriEncode(str, subs) {
		var tmp = str;
		for (var i = subs.length - 1; i >= 0; i--) {
			var sub = subs[i];
			tmp = strSwap(tmp, sub[0], sub[1]);
		}
		return encodeURIComponent(tmp);
	}

	function uriDecode(str, subs) {
		var tmp = decodeURIComponent(str);
		for (var i = 0; i < subs.length; i++) {
			var sub = subs[i];
			tmp = strSwap(tmp, sub[0], sub[1]);
		}
		return tmp;
	}

	function uri2data(uri, subs) {
		var uri_suffix = uri.match(/^[^?]*[?](.*)$/);
		var ret = {};
		if (uri_suffix !== null) {
			uri_suffix[1].split("&").forEach(function(x) {
				var tmp = x.match(/^([a-z_]+)[=](.*)$/);
				if (tmp !== null) {
					var key = uriDecode(tmp[1], subs);
					var val = JSON.parse(uriDecode(tmp[2], subs));
					if (!(key in ret)) {
						ret[key] = val;
					}
				}
			});
		}
		return ret;
	}

	function data2uri(data, subs, uri_prefix) {
		var tmp = [];
		for (var x in data) {
			if (data.hasOwnProperty(x)) {
				var key = uriEncode(x, subs);
				var val = uriEncode(JSON.stringify(data[x]), subs);
				tmp.push(key + "=" + val);
			}
		}
		return uri_prefix + tmp.join("&");
	}

	function forceBool(arg) {
		return (arg.toString() === "true");
	}

	function forceInt(arg) {
		return parseInt(arg.toString()) || 0;
	}

	function forceFloat(arg) {
		return parseFloat(arg.toString()) || 0.0;
	}

	function applyTo(thisArg, argsArray, func) {
		func.apply(thisArg, argsArray);
	}

	function freeze(arg) {
		try {
			return Object.freeze(arg);
		}
		catch (err) {
			return null;
		}
	}

	function isFrozen(arg) {
		try {
			return Object.isFrozen(arg);
		}
		catch (err) {
			return null;
		}
	}

	function orElse(arg, dflt) {
		return (arg === null) ? dflt : arg;
	}

	function setDefault(obj, key, val) {
		if (!(key in obj)) {
			obj[key] = val;
		}
		return obj[key];
	}

	function keyEventSourceId(evt) {
		var keyCode = evt.keyCode || evt.which;
		return evt.key || String.fromCharCode(keyCode) || evt.code;
	}

	return {
		EvtEnum: EvtEnum,
		$: $,
		assert: assert,
		i32: i32,
		ui32: ui32,
		seed: seed,
		random: random,
		randInt32: randInt32,
		gauss: gauss,
		hsl2rgb: hsl2rgb,
		rgb2str: rgb2str,
		insertionSort: insertionSort,
		mergeSort: mergeSort,
		shuffle: shuffle,
		permutations: permutations,
		cycle: cycle,
		asyncFor: asyncFor,
		reEscape: reEscape,
		strSwap: strSwap,
		uri2data: uri2data,
		data2uri: data2uri,
		forceBool: forceBool,
		forceInt: forceInt,
		forceFloat: forceFloat,
		applyTo: applyTo,
		freeze: freeze,
		isFrozen: isFrozen,
		orElse: orElse,
		setDefault: setDefault,
		keyEventSourceId: keyEventSourceId
	};
})();
