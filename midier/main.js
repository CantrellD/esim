var app = {};

function list2ab(src) {
}

function midi2object(arr) {
    var index = 0;
    var runner = null; // Status byte. Used for Running Status.

    function ui32(arg) {
        return utils.ui32(arg);
    }

    function parseVariableLengthValue() {
        var value = 0;
        while (ui32(arr[index] & 0x80) > 0) {
            value = ui32(value << 7) + ui32(arr[index++] & 0x7F);
        }
        value = ui32(value << 7) + ui32(arr[index++] & 0x7F);
        utils.assert(value < ui32(0x10000000));
        return value;
    }

    function parseFile() {
        var chunk_id = "";
        var chunk_size = 0;
        var chunk_offset = null;
        var format_type = 0;
        var number_of_tracks = 0;
        var time_division = 0;

        var tracks = [];
        chunk_id += String.fromCharCode(arr[index++]);
        chunk_id += String.fromCharCode(arr[index++]);
        chunk_id += String.fromCharCode(arr[index++]);
        chunk_id += String.fromCharCode(arr[index++]);
        utils.assert(chunk_id === "MThd");
        chunk_size += ui32(arr[index++] << 24);
        chunk_size += ui32(arr[index++] << 16);
        chunk_size += ui32(arr[index++] << 8);
        chunk_size += ui32(arr[index++] << 0);
        chunk_offset = index;
        format_type += ui32(arr[index++] << 8);
        format_type += ui32(arr[index++] << 0);
        number_of_tracks += ui32(arr[index++] << 8);
        number_of_tracks += ui32(arr[index++] << 0);
        time_division += ui32(arr[index++] << 8);
        time_division += ui32(arr[index++] << 0);
        for (var i = 0; i < number_of_tracks; i++) {
            tracks.push(parseTrack());
            runner = null; // TODO: Verify that running status doesn't persist.
        }
        utils.assert(index === arr.length);
        return {
            header: {
                chunk_id: chunk_id,
                format_type: format_type,
                time_division: time_division,
            },
            tracks: tracks,
        };
    }

    function parseTrack() {
        var chunk_id = "";
        var chunk_size = 0;
        var chunk_offset = null;
        var events = [];
        var buffer = null;
        chunk_id += String.fromCharCode(arr[index++]);
        chunk_id += String.fromCharCode(arr[index++]);
        chunk_id += String.fromCharCode(arr[index++]);
        chunk_id += String.fromCharCode(arr[index++]);
        chunk_size += ui32(arr[index++] << 24);
        chunk_size += ui32(arr[index++] << 16);
        chunk_size += ui32(arr[index++] << 8);
        chunk_size += ui32(arr[index++] << 0);
        chunk_offset = index;
        if (chunk_id === "MTrk") {
            while (index < chunk_offset + chunk_size) {
                events.push(parseEvent());
            }
            utils.assert(index === chunk_offset + chunk_size);
        }
        else {
            index = chunk_offset + chunk_size;
        }
        return {
            header: {
                chunk_id: chunk_id,
            },
            events: events,
        };
    }

    function parseEvent() {
        var delta = parseVariableLengthValue();
        var type = null;
        var parameters = null;

        if (ui32(arr[index] & 0x80) > 0) {
            runner = null;
        }

        if (runner === null) {
            type = ui32(arr[index++]);
            utils.assert(-1 < type && type < 256);
            utils.assert(ui32(type & 0x80) > 0); // True for status bytes.
        }
        else {
            type = runner;
        }

        if (ui32(type & 0xF0) === 0xF0) {
            utils.assert(runner === null);
            parameters = [];
            if (type === 0xF0) {
                while (index < arr.length && arr[index] !== 0xF7) {
                    parameters.push(arr[index++]);
                }
                utils.assert(index < arr.length && arr[index] === 0xF7);
                parameters.push(arr[index++]);
            }
            else if (type === 0xF1) {
                parameters.push(arr[index++]);
            }
            else if (type === 0xF2) {
                parameters.push(arr[index++]);
                parameters.push(arr[index++]);
            }
            else if (type === 0xF3) {
                parameters.push(arr[index++]);
            }
            else if (type === 0xFF) {
                parameters.push(arr[index++]);
                parameters.push(arr[index++]);
                for (var i = 0; i < parameters[1]; i++) {
                    parameters.push(arr[index++]);
                }
            }
            return {
                delta: delta,
                hint: {
                    "0x0": "???",
                    "0x1": "???",
                    "0x2": "???",
                    "0x3": "???",
                    "0x4": "???",
                    "0x5": "???",
                    "0x6": "???",
                    "0x7": "???",
                    "0x8": "???",
                    "0x9": "???",
                    "0xA": "???",
                    "0xB": "???",
                    "0xC": "???",
                    "0xD": "???",
                    "0xE": "???",
                    "0xF": "Meta: " + {
                        "0x0": "Sequence Number",
                        "0x1": "General Text",
                        "0x2": "Copyright Text",
                        "0x3": "Sequence Name / Track Name",
                        "0x4": "Instrument Name",
                        "0x5": "Lyric Text",
                        "0x6": "Marker Text",
                        "0x7": "Cue Point Text",
                        "0x8": "Program Name",
                        "0x9": "Device Name",
                        "0x20": "Channel Prefix",
                        "0x21": "Port",
                        "0x2F": "End of Track",
                        "0x51": "Tempo",
                        "0x54": "SMPTE Offset",
                        "0x58": "Time Signature",
                        "0x59": "Key Signature",
                        "0x7F": "Sequencer Specific Event",
                    }["0x" + parameters[0].toString(16).toUpperCase()],
                }["0x" + ui32(type & 0x0F).toString(16).toUpperCase()],
                type: type,
                parameters: parameters,
            };
        }
        else {
            runner = type;
            parameters = [];
            if (ui32(type & 0xF0) === 0xC0) {
                parameters.push(arr[index++]);
            }
            else if (ui32(type & 0xF0) === 0xD0) {
                parameters.push(arr[index++]);
            }
            else {
                parameters.push(arr[index++]);
                parameters.push(arr[index++]);
            }
            return {
                delta: delta,
                hint: {
                    "0x80": "Note Off",
                    "0x90": "Note On",
                    "0xA0": "Polyphonic Key Pressure (Aftertouch)",
                    "0xB0": "Control Change",
                    "0xC0": "Program Change",
                    "0xD0": "Channel Pressure (Aftertouch)",
                    "0xE0": "Pitch Bend Change",
                }["0x" + ui32(type & 0xF0).toString(16).toUpperCase()],
                type: type,
                parameters: parameters,
            };
        }
    }
    return parseFile();
}

function object2midi(obj) {
    var arr = [];
    var index = 0;

    function ui32(arg) {
        return utils.ui32(arg);
    }

    function pushVariableLengthValue(value) {
        var src = utils.ui32(value);
        var stack = [];
        utils.assert(src === value);
        while (true) {
            stack.push(src & 0x7F);
            src = src >>> 7;
            if (src === 0) {
                break;
            }
        }
        while (stack.length > 0) {
            arr.push((stack.length > 1 ? 0x80 : 0x00) | stack.pop());
        }
    }

    function pushFile(obj) {
        // chunk_id
        utils.assert(obj.header.chunk_id === "MThd");
        for (var i = 0; i < obj.header.chunk_id.length; i++) {
            var code = obj.header.chunk_id.charCodeAt(i);
            arr.push(code);
        }

        // chunk_size
        var chunk_size = 6;
        arr.push(utils.ui32(chunk_size & 0xFF000000) >>> 24);
        arr.push(utils.ui32(chunk_size & 0x00FF0000) >>> 16);
        arr.push(utils.ui32(chunk_size & 0x0000FF00) >>> 8);
        arr.push(utils.ui32(chunk_size & 0x000000FF) >>> 0);

        // format_type
        arr.push(utils.ui32(obj.header.format_type >>> 8) & 0xFF);
        arr.push(utils.ui32(obj.header.format_type >>> 0) & 0xFF);

        // number_of_tracks
        arr.push(utils.ui32(obj.tracks.length >>> 8) & 0xFF);
        arr.push(utils.ui32(obj.tracks.length >>> 0) & 0xFF);

        // time_division
        arr.push(utils.ui32(obj.header.time_division >>> 8) & 0xFF);
        arr.push(utils.ui32(obj.header.time_division >>> 0) & 0xFF);

        // tracks
        for (var i = 0; i < obj.tracks.length; i++) {
            var track = obj.tracks[i];
            pushTrack(track);
        }
    }

    function pushTrack(track) {
        // chunk_id
        for (var i = 0; i < track.header.chunk_id.length; i++) {
            var code = track.header.chunk_id.charCodeAt(i);
            arr.push(code);
        }

        // chunk_size
        var chunk_size = 0;
        for (var i = 0; i < track.events.length; i++) {
            var evt = track.events[i];
            var old_length = arr.length;
            pushVariableLengthValue(evt.delta);
            chunk_size += arr.length - old_length;
            chunk_size += 1;
            chunk_size += evt.parameters.length;
            while (arr.length > old_length) {
                arr.pop(); // TODO: This is stupid, so... Not this.
            }
        }
        arr.push(utils.ui32(chunk_size & 0xFF000000) >>> 24);
        arr.push(utils.ui32(chunk_size & 0x00FF0000) >>> 16);
        arr.push(utils.ui32(chunk_size & 0x0000FF00) >>> 8);
        arr.push(utils.ui32(chunk_size & 0x000000FF) >>> 0);

        // events
        for (var i = 0; i < track.events.length; i++) {
            var evt = track.events[i];
            pushEvent(evt);
        }
    }

    function pushEvent(evt) {
        pushVariableLengthValue(evt.delta);
        arr.push(evt.type);
        for (var i = 0; i < evt.parameters.length; i++) {
            var parameter = evt.parameters[i];
            arr.push(parameter);
        }
    }

    pushFile(obj);
    return arr;
}

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
        save(object2midi(obj));
    }
    document.getElementById("file_input").onchange = function(evt) {
        var reader = new FileReader();
        reader.onload = function(evt) {
            var buf = evt.target.result;
            var src = new Uint8Array(buf);
            var txt = JSON.stringify(midi2object(src));
            document.getElementById("json_textarea").value = txt;
        };
        if (evt.target.files.length > 0) {
            reader.readAsArrayBuffer(evt.target.files[0]);
        }
    };
}
