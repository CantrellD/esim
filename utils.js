"use strict";

var utils = (function() {
    var EvtEnum = {
        MOUSEDOWN: "mousedown",
        MOUSEUP: "mouseup",
        MOUSEMOVE: "mousemove",
        WHEEL: "wheel",
        CONTEXTMENU: "contextmenu"
    }

    var ITR_END = {value: undefined, done: true};

    function i32(x) {
        return x | 0;
    }

    function assert(invariant) {
        if (!invariant) {
            throw "Assertion failed.";
        }
    }

    function gauss(mu, sigma, use_cache) {
        var u1;
        var u2;
        var tmp;
        if (use_cache && gauss.cache !== null) {
            tmp = gauss.cache;
            gauss.cache = null;
            return tmp * sigma + mu;
        }
        do {
            u1 = 2.0 * Math.random() - 1.0;
            u2 = 2.0 * Math.random() - 1.0;
            tmp = u1 * u1 + u2 * u2;
        } while (tmp === 0 || tmp > 1.0);

        tmp = Math.sqrt((-2.0 * Math.log(tmp)) / tmp);
        gauss.cache = u2 * tmp;
        return u1 * tmp * sigma + mu;
    }
    gauss.cache = null;

    function hsl2rgb(a,b,c) {
        a*=6;
        b=[c+=b*=c<.5?c:1-c,c-a%1*b*2,c-=b*=2,c,c+a%1*b,c+b];
        return [b[~~a%6],b[(a|16)%6],b[(a|8)%6]];
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
        impl(copy, arr, 0, arr.length >> 1, arr.length)
        return arr;
    }

    function shuffle(arr) {
        var n, tmp;
        for (var i = arr.length - 1; i > 0; i--) {
            n = Math.floor(Math.random() * (i + 1));
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
        }
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
            }
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

    function permutations(arr) {
        var copy = arr.slice(0);
        return ipermute(copy, 0);
    }

    return {
        EvtEnum: EvtEnum,
        i32: i32,
        assert: assert,
        gauss: gauss,
        hsl2rgb: hsl2rgb,
        rgb2str: rgb2str,
        insertionSort: insertionSort,
        mergeSort: mergeSort,
        shuffle: shuffle,
        permutations: permutations,
        cycle: cycle,
        asyncFor: asyncFor
    };
})();
