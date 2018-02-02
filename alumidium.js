/*
    alumidium.js - Functions for parsing/generating MIDI files.
    Written in 2018 by Douglas Cantrell <cantrell.douglas@gmail.com>

    To the extent possible under law, the author(s) have dedicated all
    copyright and related and neighboring rights to this software to the
    public domain worldwide.

    This software is distributed without any warranty.

    You should have received a copy of the CC0 Public Domain Dedication
    along with this software.

    If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
*/

var alumidium = (function() {

    function ui32(arg) {
        return arg >>> 0;
    }

    function midi2object(arr, assert) {
        var index = 0;
        var runner = null; // Status byte. Used for Running Status.

        function parseVariableLengthValue() {
            var value = 0;
            while (ui32(arr[index] & 0x80) > 0) {
                value = ui32(value << 7) + ui32(arr[index++] & 0x7F);
            }
            value = ui32(value << 7) + ui32(arr[index++] & 0x7F);
            assert(value < ui32(0x10000000));
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
            assert(chunk_id === "MThd");
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
                runner = null; // TODO: Verify running status doesn't persist.
            }
            assert(index === arr.length);
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
                assert(index === chunk_offset + chunk_size);
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
                assert(-1 < type && type < 256);
                assert(ui32(type & 0x80) > 0); // True for status bytes.
            }
            else {
                type = runner;
            }

            if (ui32(type & 0xF0) === 0xF0) {
                assert(runner === null);
                parameters = [];
                if (type === 0xF0) {
                    while (index < arr.length && arr[index] !== 0xF7) {
                        parameters.push(arr[index++]);
                    }
                    assert(index < arr.length && arr[index] === 0xF7);
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
                    type: type,
                    parameters: parameters,
                };
            }
        }
        return parseFile();
    }

    function object2midi(obj, assert) {
        var arr = [];
        var index = 0;

        function pushVariableLengthValue(value) {
            var src = ui32(value);
            var stack = [];
            assert(src === value);
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
            assert(obj.header.chunk_id === "MThd");
            for (var i = 0; i < obj.header.chunk_id.length; i++) {
                var code = obj.header.chunk_id.charCodeAt(i);
                arr.push(code);
            }

            // chunk_size
            var chunk_size = 6;
            arr.push(ui32(chunk_size & 0xFF000000) >>> 24);
            arr.push(ui32(chunk_size & 0x00FF0000) >>> 16);
            arr.push(ui32(chunk_size & 0x0000FF00) >>> 8);
            arr.push(ui32(chunk_size & 0x000000FF) >>> 0);

            // format_type
            arr.push(ui32(obj.header.format_type >>> 8) & 0xFF);
            arr.push(ui32(obj.header.format_type >>> 0) & 0xFF);

            // number_of_tracks
            arr.push(ui32(obj.tracks.length >>> 8) & 0xFF);
            arr.push(ui32(obj.tracks.length >>> 0) & 0xFF);

            // time_division
            arr.push(ui32(obj.header.time_division >>> 8) & 0xFF);
            arr.push(ui32(obj.header.time_division >>> 0) & 0xFF);

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
            arr.push(ui32(chunk_size & 0xFF000000) >>> 24);
            arr.push(ui32(chunk_size & 0x00FF0000) >>> 16);
            arr.push(ui32(chunk_size & 0x0000FF00) >>> 8);
            arr.push(ui32(chunk_size & 0x000000FF) >>> 0);

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

    return {
        midi2object: midi2object,
        object2midi: object2midi,
    };

})();
