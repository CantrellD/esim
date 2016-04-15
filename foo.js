"use strict";
let cvs;
let ctx;
let img;
let cities = [];
let methods = votesys.methods;
let colors = ["cyan", "yellow", "magenta", "red", "green", "blue"];
let names = [
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
    let voters = [];
    Object.freeze(voters);
    this.x = x;
    this.y = y;
    this._voters = voters;
    this._sigma = 0;
    this.radius = 8;
    this.moving = false;
    this.nominated = true;
    this.selected = false;
    this.name = "N/A";
    this.color = "gray";
}
(function() {
    let cls = City.prototype;
    cls.getVoters = function() {
        return this._voters;
    };
    cls.setVoters = function(voters) {
        if (Object.isFrozen(voters)) {
            this._voters = voters;
        }
        else {
            this._voters = voters.slice(0);
            Object.freeze(this._voters);
        }
    };
    cls.checkBounds = function(x, y) {
        let dx = x - this.x;
        let dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    };
    cls.draw = function(ctx) {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.font = "bold 16px Arial";
        let tags = [];
        if (!document.getElementById("nameBox").checked) {
            tags.push(this.name);
        }
        if (!(document.getElementById("popBox").checked)) {
            tags.push("Pop: " + this.getPopulation().toString());
        }
        tags.forEach(function(tag, i) {
            ctx.fillText(tag, this.x + this.radius + 8, this.y + 16 * i);
            ctx.strokeText(tag, this.x + this.radius + 8, this.y + 16 * i);
        }.bind(this));

        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.strokeStyle = (this.selected) ? "white" : "black";
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
    };
    cls.copy = function() {
        let ret = new City(0, 0);
        for (let x in this) {
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
        let pop = this.getPopulation();
        this.setPopulation(0);
        this._sigma = arg;
        this.setPopulation(pop);
    };
    cls.getPopulation = function() {
        return this.getVoters().length;
    };
    cls.setPopulation = function(arg) {
        if (arg === this.getPopulation()) {
            return;
        }
        let counter = 0;
        let min = Math.min;
        let voters = this.getVoters().map(function(voter) {
            return {x: voter.x, y: voter.y, weight: voter.weight};
        });
        let xy2index = {};
        voters.forEach(function (voter, i) {
            let xy = args2xy(voter.x, voter.y);
            if (xy in xy2index) {
                return; //continue
            }
            xy2index[xy] = i;
        });
        while (voters.length > arg) {
            let voter = voters.pop();
            if (voter.weight < 1) {
                let xy = args2xy(voter.x, voter.y);
                voters[xy2index[xy]].weight -= 1;
            }
        }
        while (voters.length < arg) {
            let xval = utils.i32(utils.gauss(0, this.getSigma(), true));
            let yval = utils.i32(utils.gauss(0, this.getSigma(), true));
            let xy = args2xy(xval, yval);
            if (xy in xy2index) {
                voters[xy2index[xy]].weight += 1;
                voters.push({x: xval, y: yval, weight: 0});
            }
            else {
                xy2index[xy] = voters.length;
                voters.push({x: xval, y: yval, weight: 1});
            }
        }
        Object.freeze(voters);
        this.setVoters(voters);
        function args2xy(x, y) {
            return "x" + x.toString() + "y" + y.toString();
        }
    };
})();


function draw() {
    if (!("graph" in draw)) {
        draw.graph = null;
    }
    let xmax = cvs.width;
    let ymax = cvs.height;
    let gBox = document.getElementById("graphBox");

    drawBotLayer();
    drawMidLayer();
    drawTopLayer();

    function drawBotLayer() {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = utils.rgb2str(0.075, 0.075, 0.075);
        ctx.fillRect(0, 0, cvs.width, cvs.height);
    }
    function drawMidLayer() {
        if (draw.graph !== null) {
            ctx.drawImage(draw.graph, 0, 0, xmax, ymax);
        }
        if (gBox.checked) {
            requestGraph(function(graph) {
                draw.graph = graph;
                draw();
                return;
            });
        }
        else {
            draw.graph = null;
        }
    }
    function drawTopLayer() {
        ctx.drawImage(img, 0, 0, xmax, ymax);
        ctx.fillStyle = "white";
        cities.forEach(function (city) {
            city.getVoters().forEach(function (voter) {
                let truex = city.x + voter.x;
                let truey = city.y + voter.y;
                ctx.fillRect(truex, truey, 1, 1);
            });
        });
        cities.forEach(function (city) {
            city.draw(ctx);
        });
    }
}

function requestGraph(callback) {
    let fn = requestGraph;
    if (!("cache" in fn)) {
        fn.cache = fn;
        fn.busy = false;
        fn.cvs = document.createElement("canvas");
        fn.ctx = fn.cvs.getContext("2d");
        fn.cvs.width = cvs.width;
        fn.cvs.height = cvs.height;
    }
    if (fn.busy) {
        return;
    }
    let ss = document.styleSheets[0];
    fn.busy = true;
    ss.insertRule("* {cursor: wait !important}", 0);
    if (cities.filter(function(x) {return x.selected;}).length < 1) {
        callback(null);
        ss.deleteRule(0);
        fn.busy = false;
        return;
    }
    if (cities.filter(function(x) {return x.nominated;}).length < 1) {
        callback(null);
        ss.deleteRule(0);
        fn.busy = false;
        return;
    }
    setTimeout(function() {
        let rField = document.getElementById("rField");
        let mField = document.getElementById("mField");
        let step = utils.i32(rField.value);
        let offset = utils.i32(step / 2);
        let method = methods.filter(function(x) {
            return x.name === mField.value;
        })[0];
        let evilCache = {};
        let goodCache = {};

        let copies = cities.map(function(x) {return x.copy();});
        let candidates = copies.filter(function(x) {return x.nominated;});
        let variable = copies.filter(function(x) {return x.selected;})[0];
        let gen = utils.cycle(utils.permutations.bind(null, candidates, {}));
        for (let x = 0; x < fn.cvs.width; x += step) {
            for (let y = 0; y < fn.cvs.height; y += step) {
                let init_x = variable.x;
                let init_y = variable.y;
                let ballots;
                let winner;
                variable.x = x;
                variable.y = y;
                ballots = poll(copies, candidates, goodCache);
                variable.x = init_x;
                variable.y = init_y;
                winner = method.fn(gen.next().value, ballots, evilCache)[0];
                fn.ctx.fillStyle = winner.color;
                fn.ctx.fillRect(x - offset, y - offset, step, step);
            }
        }
        callback(fn.cvs);
        ss.deleteRule(0);
        fn.busy = false;
    }, 32);
}

function submitNewProperties() {
    let xval = parseFloat(document.getElementById("xField").value);
    let yval = parseFloat(document.getElementById("yField").value);
    let pval = parseFloat(document.getElementById("pField").value);
    let sval = parseFloat(document.getElementById("sField").value);
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


function poll(cities, candidates, cache) {
    var ballots = [];
    for (var i = 0; i < cities.length; i++) {
        var city = cities[i];
        var voters = city.getVoters();
        for (var j = 0; j < voters.length; j++) {
            var voter = voters[j];
            if (voter.weight === 0) {
                continue;
            }
            var votes = [];
            if (city.name in cache && !(city.selected)) {
                var cacheVotes = cache[city.name];
                for (var k = 0; k < cacheVotes.length; k++) {
                    var cacheVote = cacheVotes[k];
                    if (cacheVote.candidate.selected) {
                        var dx = city.x + voter.x - cacheVote.candidate.x;
                        var dy = city.y + voter.y - cacheVote.candidate.y;
                        var score = -Math.sqrt(dx * dx + dy * dy);
                        votes.push({
                            candidate: cacheVote.candidate,
                            score: score
                        });
                    }
                    else {
                        votes.push(cacheVote);
                    }
                }
                utils.insertionSort(
                    votes,
                    function(a, b) {return b.score - a.score;}
                );
            }
            else {
                for (var k = 0; k < candidates.length; k++) {
                    var candidate = candidates[k];
                    var dx = city.x + voter.x - candidate.x;
                    var dy = city.y + voter.y - candidate.y;
                    var score = -Math.sqrt(dx * dx + dy * dy);
                    votes.push({candidate: candidate, score: score});
                }
                utils.mergeSort(
                    votes,
                    function(a, b) {return b.score - a.score;}
                );
                if (!(city.selected)) {
                    cache[city.name] = votes;
                }
            }
            ballots.push({weight: voter.weight, votes: votes});
        }
    }
    return ballots;
}

function main() {
    let EE = utils.EvtEnum;
    cvs = document.getElementById("myCanvas");
    ctx = cvs.getContext("2d");
    img = new Image();
    img.src = "tenn.png";
    img.onload = function() {
        let ymax = (img.height / img.width) * cvs.width;
        if (ymax > cvs.height) {
            cvs.width = (img.width / img.height) * cvs.height;
        }
        else {
            cvs.height = ymax;
        }
        draw();
    }
    cvs.addEventListener(EE.MOUSEDOWN, onEvent.bind(null, EE.MOUSEDOWN), false);
    cvs.addEventListener(EE.MOUSEUP, onEvent.bind(null, EE.MOUSEUP), false);
    cvs.addEventListener(EE.MOUSEMOVE, onEvent.bind(null, EE.MOUSEMOVE), false);
    cvs.addEventListener(EE.WHEEL, onEvent.bind(null, EE.WHEEL), false);
    cvs.addEventListener(EE.CONTEXTMENU, onEvent.bind(null, EE.CONTEXTMENU), false);
    document.getElementById("oBox").onclick = updateTables;
    document.getElementById("cBox").onclick = updateTables;
    document.getElementById("eBox").onclick = updateTables;
    document.getElementById("nameBox").onclick = draw;
    document.getElementById("popBox").onclick = draw;
    document.getElementById("graphBox").onclick = draw;
    document.getElementById("uButton").onclick = function() {
        submitNewProperties();
        onUpdate();
        draw();
    };
    document.getElementById("dButton").onclick = function() {
        cities.forEach(function(city) {
            if (city.selected) {
                city.setPopulation(0);
                onUpdate();
                draw();
            }
        });
    };
    // TODO: Kind of a hack.
    document.getElementById("gButton").onclick = function() {
        let gBox = document.getElementById("graphBox");
        let tmp = gBox.checked;
        submitNewProperties();
        onUpdate();
        gBox.checked = true;
        draw();
        gBox.checked = tmp;
    }
    onUpdate();
    draw();
}

function onEvent(src, evt) {
    let fn = onEvent;
    let EE = utils.EvtEnum;
    let box = cvs.getBoundingClientRect();
    let x = (evt.clientX - box.left) * cvs.width / (box.right - box.left);
    let y = (evt.clientY - box.top) * cvs.height / (box.bottom - box.top);
    let handled = false;
    if (!("cache" in fn)) {
        fn.cache = fn;
        fn.isClick = function(e) {return false;};
    }
    if (src === EE.MOUSEDOWN) {
        fn.isClick = function(e) {
            let eq = function(x, y) {return utils.i32(x) === utils.i32(y);};
            return e.button === evt.button && eq(e.x, evt.x) && eq(e.y, evt.y);
        };
    }
    for (let i = cities.length - 1; i > -1; i--) {
        let city = cities[i];
        if (src === EE.MOUSEDOWN) {
            if (city.checkBounds(x, y) && evt.button === 0 && !city.moving) {
                city.moving = true;
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
                    let tmp = city.selected;
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
                city.x = utils.i32(x);
                city.y = utils.i32(y);
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
        draw();
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
    while (names.length > names.init_len && names.length > cities.length) {
        names.pop();
    }
    while (cities.length > names.length) {
        names.push("New " + names[names.length - names.init_len]);
    }
    cities.forEach(function(city, i) {
        city.name = names[i];
        city.x = Math.max(city.x, 0);
        city.x = Math.min(city.x, cvs.width);
        city.y = Math.max(city.y, 0);
        city.y = Math.min(city.y, cvs.height);
    });

    updateColors();
    updateCityPropertyControls();
    updateMethodField();
    updateTables();
}

function updateMethodField() {
    let mField = document.getElementById("mField");
    if (mField.options.length !== methods.length) {
        while (mField.length > 0) {
            mField.remove(0);
        }
        methods.forEach(function (method) {
            let option = document.createElement("option");
            option.text = method.name;
            option.value = method.name;
            mField.add(option);
        });
        mField.selectedIndex = 0;
    }
}

function updateCityPropertyControls() {
    let xField = document.getElementById("xField");
    let yField = document.getElementById("yField");
    let pField = document.getElementById("pField");
    let sField = document.getElementById("sField");
    let nNoRad = document.getElementById("nNoRad");
    let nYesRad = document.getElementById("nYesRad");
    let fields = [xField, yField, pField, sField];
    let rads = [nNoRad, nYesRad];
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

function updateColors() {
    let candidates = cities.filter(function(x) {return x.nominated;});
    cities.forEach(function (city) {
        city.color = "gray";
    });

    let tooManyColors = (colors.length > candidates.length) ? true : false;
    while (colors.length > colors.init_len && tooManyColors) {
        colors.pop();
    }
    while (candidates.length > colors.length) {
        let hval = Math.random();
        let sval = Math.random() % 0.5 + 0.5;
        let lval = Math.random() % 0.5 + 0.25;
        colors.push(utils.rgb2str.apply(null, utils.hsl2rgb(hval, sval, lval)));
    }
    candidates.forEach(function(candidate, i) {
        candidate.color = colors[i];
    });
}

function updateTables() {
    let candidates = cities.filter(function(x) {return x.nominated;});
    let ballots = poll(cities, candidates, {});
    let name2index = {};
    candidates.forEach(function(candidate, i) {
        name2index[candidate.name] = i;
    });
    updateOrdinalResultsTable();
    updateCardinalResultsTable();
    updateElectionResultsTable();
    // Everything else in updateTables is a function definition.

    function rebuildTable(tbl, numRows, numCols) {
        let hdr = tbl.getElementsByTagName("thead")[0];
        let bdy = tbl.getElementsByTagName("tbody")[0];

        // Destroy the existing header and body.
        while (hdr.rows.length > 0) {
            hdr.deleteRow(0);
        }
        while (bdy.rows.length > 0) {
            bdy.deleteRow(0);
        }

        // Build the header.
        let row = hdr.insertRow(hdr.rows.length);
        row.appendChild(document.createElement("th"));
        for (let i = 0; i < numCols; i++) {
            let cell = row.appendChild(document.createElement("th"));
            cell.style.color = "white";
            cell.appendChild(document.createTextNode(""));
        }

        // Build the body.
        for (let i = 0; i < numRows; i++) {
            let row = bdy.insertRow(bdy.rows.length);
            let cell = row.appendChild(document.createElement("th"));
            cell.style.color = "white";
            cell.appendChild(document.createTextNode(""));
            for (let j = 0; j < numCols; j++) {
                let cell = row.appendChild(document.createElement("td"));
                cell.appendChild(document.createTextNode(""))
            }
        }
    }

    function updateTableCell(tbl, row, col, msg, color) {
        let hdr = tbl.getElementsByTagName("thead")[0];
        let bdy = tbl.getElementsByTagName("tbody")[0];

        let cell = null;
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
        let tbl = document.getElementById("myOrdinalResults");

        tbl.style.visibility = "hidden";
        rebuildTable(tbl, candidates.length, candidates.length);
        if (candidates.length < 1 || document.getElementById("oBox").checked) {
            return;
        }
        tbl.style.visibility = "visible";

        // Update the table headers.
        candidates.forEach(function(candidate, i) {
            updateTableCell(tbl, i, -1, candidate.name + " Y", candidate.color);
        });
        candidates.forEach(function(candidate, i) {
            updateTableCell(tbl, -1, i, candidate.name + " N", candidate.color);
        });
        // Update the table contents.
        let tableData = [];
        let dataDenom = 0;

        candidates.forEach(function (candidate) {
            let rowData = [];
            while (rowData.length < candidates.length) {
                rowData.push(0);
            }
            tableData.push(rowData);
        });
        ballots.forEach(function (ballot) {
            for (let j = 0; j < ballot.votes.length; j++) {
                let winner_id = name2index[ballot.votes[j].candidate.name];
                for (let k = j + 1; k < ballot.votes.length; k++) {
                    let loser_id = name2index[ballot.votes[k].candidate.name];
                    tableData[winner_id][loser_id] += ballot.weight;
                }
            }
            dataDenom += ballot.weight;
        });
        for (let row = 0; row < tableData.length; row++) {
            let rowData = tableData[row];
            for (let col = 0; col < rowData.length; col++) {
                let datum = rowData[col];
                let cellVal = utils.i32(100 * datum / dataDenom);
                let cellColor = (cellVal < 50) ? "red" : (cellVal > 50) ? "green" : "white";
                updateTableCell(tbl, row, col, ("    " + cellVal).slice(-3) + "%", cellColor);
            }
        }
    }

    function updateCardinalResultsTable() {
        let tbl = document.getElementById("myCardinalResults");

        tbl.style.visibility = "hidden";
        rebuildTable(tbl, candidates.length, 1);
        if (candidates.length < 1 || document.getElementById("cBox").checked) {
            return;
        }
        tbl.style.visibility = "visible";

        // Update the table headers.
        candidates.forEach(function(candidate, i) {
            updateTableCell(tbl, i, -1, candidate.name, candidate.color);
        });
        updateTableCell(tbl, -1, 0, "Average Distance", "white");

        // Update the table contents.
        let tableData = [];
        let dataDenom = 0;
        candidates.forEach(function (candidate) {
            let rowData = [0];
            tableData.push(rowData);
        });
        ballots.forEach(function (ballot) {
            ballot.votes.forEach(function (vote) {
                let candidate_id = name2index[vote.candidate.name];
                tableData[candidate_id][0] += vote.score * ballot.weight;
            });
            dataDenom += ballot.weight;
        });
        for (let row = 0; row < tableData.length; row++) {
            let rowData = tableData[row];
            for (let col = 0; col < rowData.length; col++) {
                let datum = rowData[col];
                let cellVal = (-utils.i32(datum / dataDenom)).toString();
                let cellColor = "white";
                updateTableCell(tbl, row, col, cellVal, cellColor);
            }
        }
    }

    function updateElectionResultsTable() {
        let tbl = document.getElementById("myElectionResults");

        tbl.style.visibility = "hidden";
        rebuildTable(tbl, methods.length, candidates.length);
        if (candidates.length < 1 || document.getElementById("eBox").checked) {
            return;
        }
        tbl.style.visibility = "visible";

        // Update the table headers.
        candidates.forEach(function(candidate, i) {
            updateTableCell(tbl, -1, i, (i + 1).toString(), "white");
        });

        // Update the table headers.
        methods.forEach(function(method, i) {
            updateTableCell(tbl, i, -1, method.name, "white");
        });
        // Update the table contents.
        let tableData = [];
        methods.forEach(function (method) {
            let rowData = method.fn(candidates, ballots, {});
            tableData.push(rowData);
        });
        for (let row = 0; row < tableData.length; row++) {
            let rowData = tableData[row];
            for (let col = 0; col < rowData.length; col++) {
                let datum = rowData[col];
                let cellVal = datum.name;
                let cellColor = datum.color;
                updateTableCell(tbl, row, col, cellVal, cellColor);
            }
        }
    }
}

