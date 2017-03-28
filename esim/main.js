"use strict";

var URI_SUBS = [
    ["\"", "Q"],
    [",", "AND"],
    [":", "IS"],
    ["{", "OBJ"],
    ["}", "JBO"],
    ["[", "LST"],
    ["]", "TSL"]
];
var EvtEnum = {
    MOUSEDOWN: "mousedown",
    MOUSEUP: "mouseup",
    MOUSEMOVE: "mousemove",
    WHEEL: "wheel",
    CONTEXTMENU: "contextmenu"
};

var cvs;
var ctx;
var img;
var draw_cache = {};
var graph_is_visible = false;
var allow_caching = true;
var download_name = "esim";
var download_flag = false;
var cities = [];
var methods = votesys.methods;
var colors = ["cyan", "yellow", "magenta", "red", "green", "blue"];
var names = [
    "Memphis", "Nashville", "Knoxville", "Chattanooga",
    "Clarksville", "Murfreesboro", "Franklin", "Jackson",
    "Johnson City", "Bartlett", "Hendersonville", "Kingsport",
    "Collierville", "Smyrna", "Cleveland", "Brentwood",
    "Germantown", "Columbia", "La Vergne", "Spring Hill",
    "Gallatin", "Cookeville", "Lebanon", "Mount Juliet",
    "Morristown", "Oak Ridge", "Maryville", "Bristol",
    "Farragut", "East Ridge", "Shelbyville"
];
colors.init_len = colors.length;
names.init_len = names.length;

function City(x, y) {
    this.x = x;
    this.y = y;
    this._voters = [];
    this._history = [];
    this._sigma = 0;
    this.radius = 8;
    this.moving = false;
    this.nominated = true;
    this.selected = false;
    this.name = "N/A";
    this.color = "gray";
}
(function() {
    var cls = City.prototype;
    cls.getVoters = function() {
        return this._voters;
    };
    cls.checkBounds = function(x, y) {
        var dx = x - this.x;
        var dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    };
    cls.draw = function(ctx) {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        var tags = [];
        if (!document.getElementById("nameBox").checked) {
            tags.push(this.name);
        }
        tags.push("Pop: " + this.getPopulation().toString());
        tags.forEach(function(tag, i) {
            ctx.strokeText(tag, this.x + this.radius + 8, this.y + 16 * i);
            ctx.fillText(tag, this.x + this.radius + 8, this.y + 16 * i);
        }.bind(this));

        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.strokeStyle = (this.selected) ? "white" : "black";
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
    };
    cls.copy = function() {
        var ret = new City(0, 0);
        for (var x in this) {
            if (this.hasOwnProperty(x)) {
                ret[x] = this[x];
            }
        }
        return ret;
    };
    cls.getSigma = function() {
        return this._sigma;
    };
    cls.setSigma = function(arg) {
        if (arg === this.getSigma()) {
            return;
        }
        var pop = this.getPopulation();
        this.setPopulation(0);
        this._sigma = arg;
        this.setPopulation(pop);
    };
    cls.getPopulation = function() {
        return this._history.length;
    };
    cls.setPopulation = function(arg) {
        if (arg === this.getPopulation()) {
            return;
        }
        var voters = this._voters.map(function(voter) {
            return {x: voter.x, y: voter.y, weight: voter.weight};
        });
        var history = this._history.map(function(x) {
            return x;
        });
        var xy2index = {};
        voters.forEach(function (voter, i) {
            var xy = args2xy(voter.x, voter.y);
            if (xy in xy2index) {
                return; //continue
            }
            xy2index[xy] = i;
        });
        while (history.length > arg) {
            var voter = voters[history.pop()];
            voter.weight -= 1;
            if (voter.weight < 1) {
                utils.assert(voters[voters.length - 1].weight < 1);
                voters.pop();
            }
        }
        var gaussCache = {};
        while (history.length < arg) {
            var xval = utils.i32(utils.gauss(0, this.getSigma(), gaussCache));
            var yval = utils.i32(utils.gauss(0, this.getSigma(), gaussCache));
            var xy = args2xy(xval, yval);
            if (xy in xy2index) {
                voters[xy2index[xy]].weight += 1;
                history.push(xy2index[xy]);
            }
            else {
                xy2index[xy] = voters.length;
                voters.push({x: xval, y: yval, weight: 1});
                history.push(xy2index[xy]);
            }
        }
        this._voters = voters;
        this._history = history;
        utils.assert(this.getPopulation() == arg);
        function args2xy(x, y) {
            return "x" + x.toString() + "y" + y.toString();
        }
    };
})();

function autodraw() {
    var gBox = document.getElementById("graphBox");
    if (gBox.checked) {
        draw(null, draw_cache);
        requestGraph(function(g) {
            draw(g, draw_cache);
        });
    }
    else {
        draw_cache = {};
        draw(null, draw_cache);
    }
}

function draw(graph, cache) {
    var xmax = cvs.width;
    var ymax = cvs.height;
    var gBox = document.getElementById("graphBox");

    drawBotLayer();
    drawMidLayer();
    drawTopLayer();

    // TODO: Find a better solution maybe.
    updatePermalink();

    // TODO: Find a better solution maybe.
    if (graph_is_visible && download_flag) {
        cvs2file(download_name + ".png");
        download_flag = false;
    }

    function drawBotLayer() {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = utils.rgb2str(0.075, 0.075, 0.075);
        ctx.fillRect(0, 0, cvs.width, cvs.height);
    }
    function drawMidLayer() {
        ctx.fillStyle = "white";
        cities.forEach(function (city) {
            city.getVoters().forEach(function (voter) {
                var truex = city.x + voter.x;
                var truey = city.y + voter.y;
                ctx.fillRect(truex, truey, 1, 1);
            });
        });
        graph_is_visible = false;
        if (graph !== null) {
            ctx.drawImage(graph, 0, 0, xmax, ymax);
            cache.graph = graph;
            graph_is_visible = true;
        }
        else if (gBox.checked && "graph" in cache && cache.graph !== null) {
            ctx.drawImage(cache.graph, 0, 0, xmax, ymax);
            graph_is_visible = true;
        }
    }
    function drawTopLayer() {
        var variables = cities.filter(function(x) {
            return x.selected;
        });
        if (variables.length > 0 && !(document.getElementById("lineBox").checked)) {
            var variable = variables[0];
            if (variable.nominated) {
                cities.forEach(function(ci, i) {
                    if (!(ci.selected) && !(ci.nominated)) {
                        cities.forEach(function(cj, j) {
                            if (i === j || cj.selected || !(cj.nominated)) {
                                return; //continue
                            }
                            var dx = cj.x - ci.x;
                            var dy = cj.y - ci.y;
                            var r = Math.sqrt(dx * dx + dy * dy);
                            ctx.strokeStyle = "black";
                            ctx.beginPath();
                            ctx.arc(ci.x, ci.y, r, 0, 2 * Math.PI);
                            ctx.stroke();
                        });
                    }
                    ctx.strokeStyle = "white";
                    ctx.beginPath();
                    ctx.arc(ci.x, ci.y, ci.getSigma(), 0, 2 * Math.PI);
                    ctx.stroke();
                });
            }
            else {
                cities.forEach(function(ci, i) {
                    if (ci.selected || !(ci.nominated)) {
                        return; //continue
                    }
                    cities.forEach(function(cj, j) {
                        if (i === j || cj.selected || !(cj.nominated)) {
                            return; //continue
                        }
                        if (cj.y - ci.y !== 0) {
                            var m = -(cj.x - ci.x) / (cj.y - ci.y);
                            var b = (ci.y + cj.y) / 2 - m * (ci.x + cj.x) / 2
                            ctx.strokeStyle = "black";
                            ctx.beginPath();
                            ctx.moveTo(0, b);
                            ctx.lineTo(cvs.width, m * cvs.width + b);
                            ctx.stroke();
                        }
                        else {
                            ctx.strokeStyle = "black";
                            ctx.beginPath();
                            ctx.moveTo((ci.x + cj.x) / 2, 0);
                            ctx.lineTo((ci.x + cj.x) / 2, cvs.height);
                            ctx.stroke();
                        }
                    });
                });
            }
        }
        ctx.drawImage(img, 0, 0, xmax, ymax);
        cities.forEach(function (city) {
            city.draw(ctx);
        });
    }
}

function requestGraph(callback) {
    var fn = requestGraph;
    if (!("cache" in fn)) {
        fn.cache = fn;
        fn.busy = false;
        fn.deferred = null;
        fn.cvs = document.createElement("canvas");
        fn.cvs.width = cvs.width;
        fn.cvs.height = cvs.height;
        fn.ctx = fn.cvs.getContext("2d");
        fn.outcvs = document.createElement("canvas");
        fn.outcvs.width = fn.cvs.width;
        fn.outcvs.height = fn.cvs.height;
        fn.outctx = fn.outcvs.getContext("2d");
    }
    if (fn.busy) {
        fn.deferred = callback;
        return;
    }
    if (cities.filter(function(x) {return x.selected;}).length < 1) {
        return;
    }
    if (cities.filter(function(x) {return x.nominated;}).length < 1) {
        return;
    }
    var ss = document.styleSheets[0];
    var rField = document.getElementById("rField");
    var mField = document.getElementById("mField");
    var step = utils.i32(rField.value);
    var offset = utils.i32(step / 2);
    var method = methods.filter(function(x) {
        return x.name === mField.value;
    })[0];
    var goodCache = {};
    var evilCache = {};
    var copies = cities.map(function(x) {return x.copy();});
    var candidates = copies.filter(function(x) {return x.nominated;});
    var variable = copies.filter(function(x) {return x.selected;})[0];
    var gen = utils.cycle(utils.permutations.bind(null, candidates));
    var x = 0;
    var y = 0;
    fn.busy = true;
    ss.insertRule("* {cursor: wait !important}", 0);
    setTimeout(process, 0);
    function process() {
        var t0 = Date.now();
        for (x = x; x < fn.cvs.width; x = x + step) {
            for (y = y; y < fn.cvs.height; y = y + step) {
                if (Date.now() - t0 > 100) {
                    setTimeout(process, 0);
                    return;
                }
                var init_x = variable.x;
                var init_y = variable.y;
                var ballots;
                var winner;
                variable.x = x;
                variable.y = y;
                ballots = poll(copies, candidates, goodCache);
                variable.x = init_x;
                variable.y = init_y;
                winner = method.fn(gen.next().value, ballots, evilCache)[0];
                fn.ctx.fillStyle = winner.color;
                fn.ctx.fillRect(x - offset, y - offset, step, step);
            }
            y = 0;
        }
        fn.outctx.drawImage(fn.cvs, 0, 0, fn.cvs.width, fn.cvs.height);
        callback(fn.outcvs);
        ss.deleteRule(0);
        fn.busy = false;
        if (fn.deferred !== null) {
            requestGraph(fn.deferred);
            fn.deferred = null;
        }
    }
}

function submitNewProperties() {
    var xval = parseFloat(document.getElementById("xField").value);
    var yval = parseFloat(document.getElementById("yField").value);
    var pval = parseFloat(document.getElementById("pField").value);
    var sval = parseFloat(document.getElementById("sField").value);
    cities.forEach(function(city) {
        if (city.selected) {
            if (!isNaN(xval)) { city.x = utils.i32(xval); }
            else {alert("X Position is invalid.");}
            if (!isNaN(yval)) { city.y = utils.i32(yval); }
            else {alert("Y Position is invalid.");}
            if (!isNaN(pval)) { city.setPopulation(utils.i32(pval)); }
            else {alert("Population is invalid.");}
            if (!isNaN(sval)) { city.setSigma(sval); }
            else {alert("Sigma is invalid.");}
            city.nominated = document.getElementById("nYesRad").checked;
        }
    });
}

function compareScores(a, b) {
    return b.score - a.score;
}
function poll(cities, candidates, cache) {
    var ballots = [];
    var cacheBallots = ("ballots" in cache) ? cache.ballots : null;
    for (var i = 0; i < cities.length; i++) {
        var city = cities[i];
        var voters = city.getVoters();
        for (var j = 0; j < voters.length; j++) {
            var voter = voters[j];
            if (voter.weight === 0) {
                continue;
            }
            var ballot;
            if (cacheBallots === null) {
                ballot = {
                    weight: voter.weight,
                    votes: candidates.map(function(x) {
                        return {candidate: x, score: 1};
                    })
                };
            }
            else {
                ballot = cacheBallots[ballots.length];
                if (city.selected) {
                    for (var k = 0; k < ballot.votes.length; k++) {
                        ballot.votes[k].score = 1;
                    }
                }
            }
            var votes = ballot.votes;
            for (var k = 0; k < votes.length; k++) {
                var vote = votes[k];
                if (vote.candidate.selected || vote.score > 0) {
                    var dx = city.x + voter.x - vote.candidate.x;
                    var dy = city.y + voter.y - vote.candidate.y;
                    vote.score = -Math.sqrt(dx * dx + dy * dy);
                }
            }
            utils.insertionSort(votes, compareScores);
            ballots.push(ballot);
        }
    }
    if (allow_caching) {
        cache.ballots = ballots;
    }
    return ballots;
}

function main() {
    var EE = EvtEnum;
    var raw_uri_data = utils.uri2data(window.location.href, URI_SUBS);
    var uri_data = utils.uri2data(window.location.href, URI_SUBS);

    if ("download" in raw_uri_data) {
        uri_data.download = utils.forceBool(raw_uri_data.download);
        download_flag = uri_data.download;
    }
    if ("suffix" in raw_uri_data) {
        uri_data.suffix = raw_uri_data.suffix.toString().replace(/[^0-9a-zA-Z_]/g, '');
        download_name += uri_data.suffix;
    }
    if ("seed" in raw_uri_data) {
        uri_data.seed = utils.forceInt(raw_uri_data.seed);
        utils.seed(uri_data.seed);
    }
    if ("flags" in raw_uri_data) {
        uri_data.flags = utils.forceInt(raw_uri_data.flags);
        document.getElementById("oBox").checked = (uri_data.flags & 0x1) > 0;
        document.getElementById("cBox").checked = (uri_data.flags & 0x2) > 0;
        document.getElementById("eBox").checked = (uri_data.flags & 0x4) > 0;
        document.getElementById("lineBox").checked = (uri_data.flags & 0x8) > 0;
        document.getElementById("nameBox").checked = (uri_data.flags & 0x10) > 0;
        document.getElementById("graphBox").checked = (uri_data.flags & 0x20) > 0;
    }
    if ("draw" in raw_uri_data) {
        uri_data.draw = utils.forceBool(raw_uri_data.draw);
    }
    if ("step" in raw_uri_data) {
        uri_data.step = utils.forceInt(raw_uri_data.step);
        var rField = document.getElementById("rField");
        rField.value = uri_data.step.toString();
    }
    if ("method" in raw_uri_data) {
        updateMethods();
        uri_data.method = utils.forceInt(raw_uri_data.method);
        var mField = document.getElementById("mField");
        mField.value = methods[uri_data.method].name;
    }
    if ("cities" in raw_uri_data) {
        raw_uri_data.cities.forEach(function(raw_uri_city) {
            var uri_city = {};
            uri_city.x = utils.forceInt(raw_uri_city.x);
            uri_city.y = utils.forceInt(raw_uri_city.y);
            uri_city.sig = utils.forceFloat(raw_uri_city.sig);
            uri_city.pop = utils.forceInt(raw_uri_city.pop);
            uri_city.nom = utils.forceBool(raw_uri_city.nom);
            uri_city.sel = utils.forceBool(raw_uri_city.sel);

            var city = new City(0, 0);
            city.x = uri_city.x;
            city.y = uri_city.y;
            city.setSigma(uri_city.sig);
            city.setPopulation(uri_city.pop);
            city.nominated = uri_city.nom;
            city.selected = uri_city.sel;
            cities.push(city);
        });
    }
    if ("version" in raw_uri_data) {
        uri_data.version = raw_uri_data.version.toString();
    }

    cvs = document.getElementById("myCanvas");
    ctx = cvs.getContext("2d");
    img = new Image();
    img.src = "esim/tenn.png";
    img.onload = function() {
        var ymax = (img.height / img.width) * cvs.width;
        if (ymax > cvs.height) {
            cvs.width = (img.width / img.height) * cvs.height;
        }
        else {
            cvs.height = ymax;
        }
        onUpdate();
        if ("draw" in uri_data && uri_data.draw) {
            draw(null, draw_cache);
            requestGraph(function(g) {
                draw(g, draw_cache);
            });
        }
        else {
            autodraw();
        }
    };
    cvs.addEventListener(EE.MOUSEDOWN, onEvent.bind(null, EE.MOUSEDOWN), false);
    cvs.addEventListener(EE.MOUSEUP, onEvent.bind(null, EE.MOUSEUP), false);
    cvs.addEventListener(EE.MOUSEMOVE, onEvent.bind(null, EE.MOUSEMOVE), false);
    cvs.addEventListener(EE.WHEEL, onEvent.bind(null, EE.WHEEL), false);
    cvs.addEventListener(EE.CONTEXTMENU, onEvent.bind(null, EE.CONTEXTMENU), false);
    document.getElementById("oBox").onclick = updateTables;
    document.getElementById("cBox").onclick = updateTables;
    document.getElementById("eBox").onclick = updateTables;
    document.getElementById("nameBox").onclick = autodraw;
    document.getElementById("lineBox").onclick = autodraw;
    document.getElementById("graphBox").onclick = autodraw;
    document.getElementById("uButton").onclick = function() {
        submitNewProperties();
        onUpdate();
        autodraw();
    };
    document.getElementById("dButton").onclick = function() {
        cities.forEach(function(city) {
            if (city.selected) {
                city.setPopulation(0);
                onUpdate();
                autodraw();
            }
        });
    };
    document.getElementById("gButton").onclick = function() {
        submitNewProperties();
        onUpdate();
        draw(null, draw_cache);
        requestGraph(function(g) {
            draw(g, draw_cache);
        });
    };
}

function onEvent(src, evt) {
    var fn = onEvent;
    var EE = EvtEnum;
    var box = cvs.getBoundingClientRect();
    var x = (evt.clientX - box.left) * cvs.width / (box.right - box.left);
    var y = (evt.clientY - box.top) * cvs.height / (box.bottom - box.top);
    var handled = false;
    if (!("cache" in fn)) {
        fn.cache = fn;
        fn.isClick = function(e) {return false;};
        fn.offset = null;
    }
    if (src === EE.MOUSEDOWN) {
        fn.isClick = function(e) {
            var eq = function(x, y) {return utils.i32(x) === utils.i32(y);};
            return e.button === evt.button && eq(e.x, evt.x) && eq(e.y, evt.y);
        };
    }
    for (var i = cities.length - 1; i > -1; i--) {
        var city = cities[i];
        if (src === EE.MOUSEDOWN) {
            if (city.checkBounds(x, y) && evt.button === 0 && !city.moving) {
                city.moving = true;
                fn.offset = {dx: x - city.x, dy: y - city.y};
                handled = true;
                break;
            }
            if (city.checkBounds(x, y) && evt.button === 1) {
                handled = true;
                break;
            }
        }
        if (src === EE.MOUSEUP) {
            if (evt.button === 0 && city.moving) {
                city.moving = false;
                if (fn.isClick(evt)) {
                    var tmp = city.selected;
                    cities.forEach(function(x) {x.selected = false;});
                    city.selected = !tmp;
                }
                handled = true;
                break;
            }
            if (city.checkBounds(x, y) && evt.button === 1) {
                city.nominated = !(city.nominated);
                handled = true;
                break;
            }
        }
        if (src === EE.CONTEXTMENU) {
            if (city.checkBounds(x, y)) {
                city.setPopulation(0);
                handled = true;
                break;
            }
        }
        if (src === EE.MOUSEMOVE) {
            if (city.moving) {
                city.x = utils.i32(x - fn.offset.dx);
                city.y = utils.i32(y - fn.offset.dy);
                handled = true;
                break;
            }
        }
        if (src === EE.WHEEL) {
            if (city.checkBounds(x, y)) {
                if (evt.deltaY > 0 && city.getPopulation() > 0) {
                    city.setPopulation(Math.max(city.getPopulation() - 100, 1));
                }
                else if (evt.deltaY < 0) {
                    city.setPopulation(city.getPopulation() + 100);
                }
                handled = true;
                break;
            }
        }
    }
    if (!handled) {
        if (src === EE.MOUSEUP && evt.button === 0) {
            cities.push(new City(utils.i32(x), utils.i32(y)));
            cities[cities.length - 1].setPopulation(1);
            handled = true;
        }
    }
    if (handled) {
        evt.preventDefault();
        onUpdate();
        autodraw();
    }
}

function onUpdate() {
    utils.insertionSort(
        cities,
        function(a, b) {return b.getPopulation() - a.getPopulation();}
    );
    if (cities.length > 1) {
        utils.assert(cities[0].getPopulation() >= cities[1].getPopulation());
    }
    while (cities.length > 0 && cities[cities.length - 1].getPopulation() < 1) {
        cities.pop();
    }

    updatePositions();
    updateSelection();
    updateNames();
    updateColors();
    updateCityPropertyControls();
    updateMethods();
    updateTables();
}

function updatePositions() {
    cities.forEach(function(city, i) {
        city.x = Math.max(city.x, 0);
        city.x = Math.min(city.x, cvs.width);
        city.y = Math.max(city.y, 0);
        city.y = Math.min(city.y, cvs.height);
    });
}

function updateSelection() {
    var flag = false;
    cities.forEach(function(x) {
        if (flag) {
            x.selected = false;
        }
        flag = flag || x.selected;
    });
}

function updateNames() {
    while (names.length > names.init_len && names.length > cities.length) {
        names.pop();
    }
    while (cities.length > names.length) {
        names.push("New " + names[names.length - names.init_len]);
    }
    cities.forEach(function(city, i) {
        city.name = names[i];
    });
}

function updateColors() {
    var candidates = cities.filter(function(x) {return x.nominated;});
    cities.forEach(function (city) {
        city.color = "gray";
    });

    while (colors.length > colors.init_len && colors.length > candidates.length) {
        colors.pop();
    }
    while (candidates.length > colors.length) {
        var hval = Math.random();
        var sval = Math.random() % 0.5 + 0.5;
        var lval = Math.random() % 0.5 + 0.25;
        colors.push(utils.rgb2str.apply(null, utils.hsl2rgb(hval, sval, lval)));
    }
    candidates.forEach(function(candidate, i) {
        candidate.color = colors[i];
    });
}

function updateCityPropertyControls() {
    var xField = document.getElementById("xField");
    var yField = document.getElementById("yField");
    var pField = document.getElementById("pField");
    var sField = document.getElementById("sField");
    var nNoRad = document.getElementById("nNoRad");
    var nYesRad = document.getElementById("nYesRad");
    var fields = [xField, yField, pField, sField];
    var rads = [nNoRad, nYesRad];
    fields.forEach(function (field) {
        field.value = "";
        field.disabled = true;
    });
    rads.forEach(function (rad) {
        rad.checked = false;
        rad.disabled = true;
    });
    cities.forEach(function (city) {
        if (city.selected) {
            [].concat(fields, rads).forEach(function (elt) {
                elt.disabled = false;
            });
            xField.value = city.x.toString();
            yField.value = city.y.toString();
            pField.value = city.getPopulation().toString();
            sField.value = city.getSigma().toString();
            nNoRad.checked = !city.nominated;
            nYesRad.checked = city.nominated;
        }
    });
}

function updateMethods() {
    var mField = document.getElementById("mField");
    if (mField.options.length !== methods.length) {
        while (mField.length > 0) {
            mField.remove(0);
        }
        methods.forEach(function (method) {
            var option = document.createElement("option");
            option.text = method.name;
            option.value = method.name;
            mField.add(option);
        });
        mField.value = methods[0].name;
    }
}

function updateTables() {
    var candidates = cities.filter(function(x) {return x.nominated;});
    var ballots = poll(cities, candidates, {});
    var name2index = {};
    candidates.forEach(function(candidate, i) {
        name2index[candidate.name] = i;
    });
    updateOrdinalResultsTable();
    updateCardinalResultsTable();
    updateElectionResultsTable();
    // Everything else in updateTables is a function definition.

    function rebuildTable(tbl, numRows, numCols) {
        var hdr = tbl.getElementsByTagName("thead")[0];
        var bdy = tbl.getElementsByTagName("tbody")[0];

        // Destroy the existing header and body.
        while (hdr.rows.length > 0) {
            hdr.deleteRow(0);
        }
        while (bdy.rows.length > 0) {
            bdy.deleteRow(0);
        }

        // Build the header.
        var hdr_row = hdr.insertRow(hdr.rows.length);
        hdr_row.appendChild(document.createElement("th"));
        for (var i = 0; i < numCols; i++) {
            var cell = hdr_row.appendChild(document.createElement("th"));
            cell.style.color = "black";
            cell.appendChild(document.createTextNode(""));
        }

        // Build the body.
        for (var i = 0; i < numRows; i++) {
            var row = bdy.insertRow(bdy.rows.length);
            var header_cell = row.appendChild(document.createElement("th"));
            header_cell.style.color = "black";
            header_cell.appendChild(document.createTextNode(""));
            for (var j = 0; j < numCols; j++) {
                var data_cell = row.appendChild(document.createElement("td"));
                data_cell.appendChild(document.createTextNode(""));
            }
        }
    }

    function updateTableCell(tbl, row, col, msg, color) {
        var hdr = tbl.getElementsByTagName("thead")[0];
        var bdy = tbl.getElementsByTagName("tbody")[0];

        var cell = null;
        if (row < 0) {
            cell = hdr.children[row + 1].children[col + 1];
        }
        else {
            cell = bdy.children[row].children[col + 1];
        }
        while (cell.lastChild) {
            cell.removeChild(cell.lastChild);
        }
        cell.style.color = color;
        cell.appendChild(document.createTextNode(msg));
    }

    function updateOrdinalResultsTable() {
        var tbl = document.getElementById("myOrdinalResults");

        tbl.style.visibility = "hidden";
        if (candidates.length < 1 || document.getElementById("oBox").checked) {
            return;
        }
        rebuildTable(tbl, candidates.length, candidates.length);
        tbl.style.visibility = "visible";

        // Update the table headers.
        candidates.forEach(function(candidate, i) {
            updateTableCell(tbl, i, -1, candidate.name + " Y", candidate.color);
        });
        candidates.forEach(function(candidate, i) {
            updateTableCell(tbl, -1, i, candidate.name + " N", candidate.color);
        });
        // Update the table contents.
        var tableData = [];
        var dataDenom = 0;

        candidates.forEach(function (candidate) {
            var rowData = [];
            while (rowData.length < candidates.length) {
                rowData.push(0);
            }
            tableData.push(rowData);
        });
        ballots.forEach(function (ballot) {
            for (var j = 0; j < ballot.votes.length; j++) {
                var winner_id = name2index[ballot.votes[j].candidate.name];
                for (var k = j + 1; k < ballot.votes.length; k++) {
                    var loser_id = name2index[ballot.votes[k].candidate.name];
                    tableData[winner_id][loser_id] += ballot.weight;
                }
            }
            dataDenom += ballot.weight;
        });
        for (var row = 0; row < tableData.length; row++) {
            var rowData = tableData[row];
            for (var col = 0; col < rowData.length; col++) {
                var datum = rowData[col];
                var cellVal = utils.i32(100 * datum / dataDenom);
                var cellColor = (cellVal < 50) ? "red" : (cellVal > 50) ? "green" : "black";
                updateTableCell(tbl, row, col, ("    " + cellVal).slice(-3) + "%", cellColor);
            }
        }
    }

    function updateCardinalResultsTable() {
        var tbl = document.getElementById("myCardinalResults");

        tbl.style.visibility = "hidden";
        if (candidates.length < 1 || document.getElementById("cBox").checked) {
            return;
        }
        rebuildTable(tbl, candidates.length, 1);
        tbl.style.visibility = "visible";

        // Update the table headers.
        candidates.forEach(function(candidate, i) {
            updateTableCell(tbl, i, -1, candidate.name, candidate.color);
        });
        updateTableCell(tbl, -1, 0, "Average Distance", "black");

        // Update the table contents.
        var tableData = [];
        var dataDenom = 0;
        candidates.forEach(function (candidate) {
            var rowData = [0];
            tableData.push(rowData);
        });
        ballots.forEach(function (ballot) {
            ballot.votes.forEach(function (vote) {
                var candidate_id = name2index[vote.candidate.name];
                tableData[candidate_id][0] += vote.score * ballot.weight;
            });
            dataDenom += ballot.weight;
        });
        for (var row = 0; row < tableData.length; row++) {
            var rowData = tableData[row];
            for (var col = 0; col < rowData.length; col++) {
                var datum = rowData[col];
                var cellVal = (-utils.i32(datum / dataDenom)).toString();
                var cellColor = "black";
                updateTableCell(tbl, row, col, cellVal, cellColor);
            }
        }
    }

    function updateElectionResultsTable() {
        var tbl = document.getElementById("myElectionResults");

        tbl.style.visibility = "hidden";
        if (candidates.length < 1 || document.getElementById("eBox").checked) {
            return;
        }
        rebuildTable(tbl, methods.length, candidates.length);
        tbl.style.visibility = "visible";

        // Update the table headers.
        candidates.forEach(function(candidate, i) {
            updateTableCell(tbl, -1, i, (i + 1).toString(), "black");
        });

        // Update the table headers.
        methods.forEach(function(method, i) {
            updateTableCell(tbl, i, -1, method.name, "black");
        });
        // Update the table contents.
        var tableData = [];
        methods.forEach(function (method) {
            var rowData = method.fn(candidates, ballots, {});
            tableData.push(rowData);
        });
        for (var row = 0; row < tableData.length; row++) {
            var rowData = tableData[row];
            for (var col = 0; col < rowData.length; col++) {
                var datum = rowData[col];
                var cellVal = datum.name;
                var cellColor = datum.color;
                updateTableCell(tbl, row, col, cellVal, cellColor);
            }
        }
    }
}

function updatePermalink() {
    var uri_method = 0;
    methods.forEach(function(x, i) {
        if (x.name === document.getElementById("mField").value) {
            uri_method = i;
        }
    });

    var uri_flags = 0;
    uri_flags |= (document.getElementById("oBox").checked) ? 0x1 : 0;
    uri_flags |= (document.getElementById("cBox").checked) ? 0x2 : 0;
    uri_flags |= (document.getElementById("eBox").checked) ? 0x4 : 0;
    uri_flags |= (document.getElementById("lineBox").checked) ? 0x8 : 0;
    uri_flags |= (document.getElementById("nameBox").checked) ? 0x10 : 0;
    uri_flags |= (document.getElementById("graphBox").checked) ? 0x20 : 0;

    var uri_cities = [];
    cities.forEach(function(city) {
        uri_cities.push({
            x: city.x,
            y: city.y,
            pop: city.getPopulation(),
            sig: city.getSigma(),
            sel: city.selected,
            nom: city.nominated
        });
    });

    document.getElementById("permalink").href = utils.data2uri(
        {
            draw: graph_is_visible,
            step: parseInt(document.getElementById("rField").value),
            method: uri_method,
            flags: uri_flags,
            cities: uri_cities,
            version: "4"
        },
        URI_SUBS,
        "esim.html?"
    );
}

function cvs2file(filename) {
    var elt = document.createElement("a");
    elt.setAttribute("href", cvs.toDataURL());
    elt.setAttribute("download", filename);
    elt.style.display = "none";
    document.body.appendChild(elt);
    elt.click();
    document.body.removeChild(elt);
}

