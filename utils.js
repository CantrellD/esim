"use strict";

var utils = (function() {
    let EvtEnum = {
        MOUSEDOWN: "mousedown",
        MOUSEUP: "mouseup",
        MOUSEMOVE: "mousemove",
        WHEEL: "wheel",
        CONTEXTMENU: "contextmenu"
    }

    function i32(x) {
        return x | 0;
    }

    function assert(invariant) {
        if (!invariant) {
            throw "Assertion failed.";
        }
    }

    function gauss(mu, sigma, use_cache) {
        if (use_cache && gauss.cache !== null) {
            let tmp = gauss.cache;
            gauss.cache = null;
            return tmp * sigma + mu;
        }
        let u1;
        let u2;
        let tmp;
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

    function* reversed(arr) {
        let index = arr.length - 1;
        while (index >= 0) {
            yield arr[index];
            index -= 1;
        }
    }

    function insertionSort(arr, cmp) {
        for (let i = 1; i < arr.length; i++) {
            let j = i;
            let t = arr[j];
            while (j > 0 && cmp(arr[j - 1], t) > 0) {
                arr[j] = arr[j - 1];
                j -= 1;
            }
            arr[j] = t;
        }
    }

    function shuffle(arr) {
        let n, tmp;
        for (let i = arr.length - 1; i > 0; i--) {
            n = Math.floor(Math.random() * (i + 1));
            tmp = arr[i];
            arr[i] = arr[n];
            arr[n] = tmp;
        }
    }

    function emap(arr, fn) {
        let ret = [];
        for (let i = 0; i < arr.length; i++) {
            ret.push(fn(i, arr[i]));
        }
        return ret;
    }
    function exclude(arr, i) {
        let ret = arr.slice(0);
        ret.splice(i, 1);
        return ret;
    }
    function* permutations(arr) {
        if (arr.length < 1) {
            yield arr;
        }
        for (let i = 0; i < arr.length; i++) {
            let child = permutations(exclude(arr, i));
            for (let p of child) {
                yield [arr[i]].concat(p);
            }
        }
    }
    function* cycle(generator) {
        while (true) {
            for (let x of generator()) {
                yield x;
            }
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

    return {
        EvtEnum: EvtEnum,
        i32: i32,
        assert: assert,
        gauss: gauss,
        hsl2rgb: hsl2rgb,
        rgb2str: rgb2str,
        reversed: reversed,
        insertionSort: insertionSort,
        shuffle: shuffle,
        permutations: permutations,
        cycle: cycle,
        asyncFor: asyncFor
    };
})();
