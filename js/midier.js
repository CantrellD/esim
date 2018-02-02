/*
    midier.js - MIDI file manipulation tool.
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

var app = {};

function save(arr) {
    var buf = new ArrayBuffer(arr.length);
    var bytes = new Uint8Array(buf);
    for (var i = 0; i < arr.length; i++) {
        bytes[i] = arr[i];
    }
    var file = new Blob([bytes], {type: "octet/stream"});
    var fname = prompt("Filename?");
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(file, fname);
    }
    else {
        var a = document.createElement("a");
        var url = URL.createObjectURL(file);
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

function main(argv) {
    utils.update(app, utils.uri2data(window.location.href, []));
    document.getElementById("save_button").onclick = function() {
        var txt = document.getElementById("json_textarea").value;
        txt = txt.replace(/[,][\r]?[\n][\s]*[\x5d]/g, "\x5d");
        txt = txt.replace(/[,][\r]?[\n][\s]*[\x7d]/g, "\x7d");
        var obj = JSON.parse(txt);
        save(alumidium.object2midi(obj, utils.assert));
    }
    document.getElementById("file_input").onchange = function(evt) {
        var reader = new FileReader();
        reader.onload = function(evt) {
            var buf = evt.target.result;
            var src = new Uint8Array(buf);
            var txt = JSON.stringify(alumidium.midi2object(src, utils.assert));
            document.getElementById("json_textarea").value = txt;
        };
        if (evt.target.files.length > 0) {
            reader.readAsArrayBuffer(evt.target.files[0]);
        }
    };
}
