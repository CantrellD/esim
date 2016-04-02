"use strict";
let cvs;
let ctx;
let img;
let cities = [];
let candidates = [];
let ballots = [];
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
    this.x = x;
    this.y = y;
    this.population = 1;
    this.voters = [];
    this.sigma = 0;
    this.radius = 8;
    this.moving = false;
    this.nominated = true;
    this.selected = false;
    this.name = "N/A";
    this.color = "white";
}

City.prototype = {
    checkBounds: function(x, y) {
        let dx = x - this.x;
        let dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    },
    draw: function(ctx) {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.font = "bold 16px Arial";
        let tags = [];
        if (!document.getElementById("nameBox").checked) {
            tags.push(this.name);
        }
        if (!(document.getElementById("popBox").checked)) {
            tags.push("Pop: " + this.population.toString());
        }
        for (let i = 0; i < tags.length; i++) {
            ctx.fillText(tags[i], this.x + this.radius + 8, this.y + 16 * i);
            ctx.strokeText(tags[i], this.x + this.radius + 8, this.y + 16 * i);
        }

        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.strokeStyle = (this.selected) ? "white" : "black";
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.stroke();
    }
};


function draw() {
    let xmax = cvs.width;
    let ymax = cvs.height;

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = utils.rgb2str(0.075, 0.075, 0.075);
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    if (document.getElementById("graphBox").checked) {
        let rval = parseFloat(document.getElementById("rField").value);
        let mval = document.getElementById("mField").value;
        let variable = null;
        for (let city of cities) {
            if (city.selected) {
                variable = city;
                break;
            }
        }
        if (isNaN(rval) || rval < 1) {
            alert("Step Size is invalid.");
            for (let city of cities) {
                city.moving = false;
            }
        }
        else if (!(mval in votesys)) {
            alert("Method is invalid.");
            for (let city of cities) {
                city.moving = false;
            }
        }
        else if (variable !== null) {
            let init_x = variable.x;
            let init_y = variable.y;
            let step = utils.i32(rval);
            let offset = utils.i32(step / 2);
            let gen = utils.cycle(utils.permutations.bind(null, candidates));
            let cache = {};
            let winner;
            let choices;

            for (let x = 0; x < xmax; x += step) {
                for (let y = 0; y < ymax; y += step) {
                    choices = gen.next().value;
                    variable.x = x;
                    variable.y = y;
                    updateBallots();
                    winner = votesys[mval](choices, ballots, cache)[0];
                    ctx.fillStyle = winner.color;
                    ctx.fillRect(x - offset, y - offset, step, step);
                }
            }
            variable.x = init_x;
            variable.y = init_y;
            updateBallots();
        }
    }
    ctx.drawImage(img, 0, 0, xmax, ymax);
    ctx.fillStyle = "white";
    for (let city of cities) {
        for (let voter of city.voters) {
            let truex = city.x + voter.x;
            let truey = city.y + voter.y;
            ctx.fillRect(truex, truey, 1, 1);
        }
    }
    for (let city of cities) {
        city.draw(ctx);
    }
}

function submitNewProperties() {
    let xval = parseFloat(document.getElementById("xField").value);
    let yval = parseFloat(document.getElementById("yField").value);
    let pval = parseFloat(document.getElementById("pField").value);
    let sval = parseFloat(document.getElementById("sField").value);
    for (let i = 0; i < cities.length; i++) {
        let city = cities[i];
        if (city.selected) {
            if (!isNaN(xval)) { city.x = utils.i32(xval); }
            else {alert("X Position is invalid.");}
            if (!isNaN(yval)) { city.y = utils.i32(yval); }
            else {alert("Y Position is invalid.");}
            if (!isNaN(pval)) { city.population = utils.i32(pval); }
            else {alert("Population is invalid.");}
            if (!isNaN(sval)) {
                if (city.sigma !== sval) {
                    city.sigma = sval;
                    city.voters.length = 0;
                }
            }
            else {alert("Sigma is invalid.");}
            city.nominated = document.getElementById("nYesRad").checked;
        }
    }
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
    }
    document.getElementById("dButton").onclick = function() {
        for (let i = 0; i < cities.length; i++) {
            let city = cities[i];
            if (city.selected) {
                city.population = -1;
                onUpdate();
                draw();
            }
        }
    }
    // TODO: Fix this.
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
    let EE = utils.EvtEnum;
    let box = cvs.getBoundingClientRect();
    let x = (evt.clientX - box.left) * cvs.width / (box.right - box.left);
    let y = (evt.clientY - box.top) * cvs.height / (box.bottom - box.top);
    let handled = false;
    for (let city of utils.reversed(cities)) {
        if (src === EE.MOUSEDOWN) {
            if (city.checkBounds(x, y) && evt.button === 0 && !city.moving) {
                city.moving = true;
                handled = true;
                break;
            }
        }
        if (src === EE.MOUSEUP) {
            if (evt.button === 0 && city.moving) {
                city.moving = false;
                handled = true;
                break;
            }
            if (city.checkBounds(x, y) && evt.button === 1) {
                city.population = -1;
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
                if (evt.deltaY > 0 && city.population > 0) {
                    city.population -= 100;
                    if (city.population < 0) {
                        city.population = 0;
                    }
                }
                else if (evt.deltaY < 0) {
                    city.population += 100;
                }
                handled = true;
                break;
            }
        }
        if (src === EE.CONTEXTMENU) {
            if (city.checkBounds(x, y)) {
                city.selected = !city.selected;
                handled = true;
            }
            else {
                city.selected = false;
            }
        }
    }
    if (!handled) {
        if (src === EE.MOUSEUP && evt.button === 0) {
            cities.push(new City(utils.i32(x), utils.i32(y)));
            handled = true;
        }
    }
    if (!handled) {
        if (src === EE.MOUSEUP && evt.button === 1) {
            cities.push(new City(x, y));
            cities[cities.length - 1].nominated = false;
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
        function(a, b) {return b.population - a.population;}
    );
    utils.assert(
        cities.length < 2 || cities[0].population >= cities[1].population
    );

    while (cities.length > 0 && cities[cities.length - 1].population < 0) {
        cities.pop();
    }
    while (names.length > names.init_len && names.length > cities.length) {
        names.pop();
    }
    while (cities.length > names.length) {
        names.push("New " + names[names.length - names.init_len]);
    }
    for (let i = 0; i < cities.length; i++) {
        let city = cities[i];
        city.name = names[i];
        city.x = Math.max(city.x, 0);
        city.x = Math.min(city.x, cvs.width);
        city.y = Math.max(city.y, 0);
        city.y = Math.min(city.y, cvs.height);
    }

    updateCityPropertyControls();
    updateVoters();
    updateCandidates();
    updateColors();
    updateBallots();
    updateTables();
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
    for (let field of fields) {
        field.value = "";
        field.disabled = true;
    }
    for (let rad of rads) {
        rad.checked = false;
        rad.disabled = true;
    }
    for (let city of cities) {
        if (city.selected) {
            for (let elt of [].concat(fields, rads)) {
                elt.disabled = false;
            }
            xField.value = city.x.toString();
            yField.value = city.y.toString();
            pField.value = city.population.toString();
            sField.value = city.sigma.toString();
            nNoRad.checked = !city.nominated;
            nYesRad.checked = city.nominated;
        }
    }
}

function updateVoters() {
    for (let city of cities) {
        let xy2index = {};
        city.voters.length = Math.min(city.voters.length, city.population);
        while (city.population > city.voters.length) {
            let xval = utils.i32(utils.gauss(0, city.sigma, true));
            let yval = utils.i32(utils.gauss(0, city.sigma, true));
            let xy = "x" + xval.toString() + "y" + yval.toString();
            if (xy in xy2index) {
                // TODO: Don't push elements just to update city.voters.length.
                city.voters[xy2index[xy]].weight += 1;
                city.voters.push({weight: 0});
            }
            else {
                xy2index[xy] = city.voters.length;
                city.voters.push({x: xval, y: yval, weight: 1});
            }
        }
    }
}

function updateCandidates() {
    candidates.length = 0;
    for (let city of cities) {
        if (city.nominated) {
            candidates.push(city);
        }
    }
}

function updateColors() {
    for (let city of cities) {
        city.color = "white";
    }
    while (
        colors.length > colors.init_len && colors.length > candidates.length
    ) {
        colors.pop();
    }
    while (candidates.length > colors.length) {
        let hval = Math.random();
        let sval = Math.random() % 0.5 + 0.5;
        let lval = Math.random() % 0.5 + 0.25;
        colors.push(utils.rgb2str.apply(null, utils.hsl2rgb(hval, sval, lval)));
    }
    for (let i = 0; i < candidates.length; i++) {
        let candidate = candidates[i];
        candidate.color = colors[i];
    }
}

function updateBallots() {
    ballots.length = 0;
    for (let city of cities) {
        for (let voter of city.voters) {
            if (voter.weight === 0) {
                continue;
            }
            let votes = [];
            for (let candidate of candidates) {
                let dx = city.x + voter.x - candidate.x;
                let dy = city.y + voter.y - candidate.y;
                let score = -Math.sqrt(dx * dx + dy * dy);
                votes.push({
                    candidate: candidate,
                    score: score
                });
            }
            votes.sort(function(a, b) {return b.score - a.score;});
            utils.assert(votes.length < 2 || votes[0].score >= votes[1].score);
            ballots.push({weight: voter.weight, votes: votes});
        }
    }
}

function updateTables() {
    let name2index = {};
    for (let i = 0; i < candidates.length; i++) {
        let candidate = candidates[i];
        name2index[candidate.name] = i;
    }
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
        for (let i = 0; i < candidates.length; i++) {
            let candidate = candidates[i];
            updateTableCell(tbl, i, -1, candidate.name + " Y", candidate.color);
        }
        for (let i = 0; i < candidates.length; i++) {
            let candidate = candidates[i];
            updateTableCell(tbl, -1, i, candidate.name + " N", candidate.color);
        }
        // Update the table contents.
        let tableData = [];
        let dataDenom = 0;

        for (let candidate of candidates) {
            let rowData = [];
            while (rowData.length < candidates.length) {
                rowData.push(0);
            }
            tableData.push(rowData);
        }
        for (let ballot of ballots) {
            for (let j = 0; j < ballot.votes.length; j++) {
                let winner_id = name2index[ballot.votes[j].candidate.name];
                for (let k = j + 1; k < ballot.votes.length; k++) {
                    let loser_id = name2index[ballot.votes[k].candidate.name];
                    tableData[winner_id][loser_id] += ballot.weight;
                }
            }
            dataDenom += ballot.weight;
        }
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
        for (let i = 0; i < candidates.length; i++) {
            let candidate = candidates[i];
            updateTableCell(tbl, i, -1, candidate.name, candidate.color);
        }
        updateTableCell(tbl, -1, 0, "Average Distance", "white");

        // Update the table contents.
        let tableData = [];
        let dataDenom = 0;
        for (let candidate of candidates) {
            let rowData = [0];
            tableData.push(rowData);
        }
        for (let ballot of ballots) {
            for (let vote of ballot.votes) {
                let candidate_id = name2index[vote.candidate.name];
                tableData[candidate_id][0] += vote.score * ballot.weight;
            }
            dataDenom += ballot.weight;
        }
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
        let methods = votesys.methods;

        tbl.style.visibility = "hidden";
        rebuildTable(tbl, methods.length, candidates.length);
        if (candidates.length < 1 || document.getElementById("eBox").checked) {
            return;
        }
        tbl.style.visibility = "visible";

        // Update the table headers.
        for (let i = 0; i < candidates.length; i++) {
            let candidate = candidates[i];
            updateTableCell(tbl, -1, i, (i + 1).toString(), "white");
        }

        // Update the table headers.
        for (let i = 0; i < methods.length; i++) {
            let method = methods[i];
            updateTableCell(tbl, i, -1, method, "white");
        }
        // Update the table contents.
        let tableData = [];
        for (let method of methods) {
            let rowData = votesys[method](candidates, ballots, {});
            tableData.push(rowData);
        }
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

