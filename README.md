# ESIM

## Context

This page can be used to simulate elections where voters choose the location of a new capital city.
Voters prefer cities which are relatively close to the city in which they live, and express those preferences sincerely.
The results of simulated elections will depend on the voting method used, e.g. approval voting or instant runoff voting.
This project exists to support comparison of different voting methods.
Voters do not respond to any of the strategic incentives associated with a given voting system.

Election results for the current conditions are generally shown at the bottom of the page.
Note that it is often helpful to see which city would win if the currently selected city were moved to a given position.
When graphs are generated, the color of the map at a given position will be used to represent this information.

## Controls

```
Left click on map: Add (and nominate) a small city.
Left click on city: Select or deselect the city.
Right click on city: Delete the city.
Scroll on city: Change the city population.
```

## Methods

### Plurality

Each voter chooses one candidate.
The candidate chosen by the most voters is elected.

### Approval

Each voter chooses some subset of the candidates.
The candidate chosen by the most voters is elected.
Note that in this simulation, voters approve all cities that they consider better than average.

### Instant Runoff Voting

Each voter ranks the candidates in order of preference.
Candidates are eliminated until only one candidate remains.
The candidate ranked higher than any remaining alternative by the fewest voters is eliminated, as needed.

### Condorcet (e.g. Schulze)

If there exists a candidate with majority support in every possible pairwise contest, that candidate is elected.

### Magic Best

Each voter rates the candidates using true (not normalized) preferences.
The candidate with the highest rating is elected.

## Details

The positions of voters relative to the cities in which they live follow a gaussian distribution.
The standard deviation of the distribution can be set using the 'Pop. Sigma' field.
Note that values other than zero will slow down the simulation when cities are large.

The resolution of graphs can be controlled with the 'Step' field.
Lower step values give higher resolution.

Patterns of alternating color are meant to indicate ties when generating graphs.
Strictly speaking, the simulator doesn't check for ties.
These patterns occur because the candidates are specified in a different order when requesting different parts of the graph.
Every possible ordering is used prior to repetition, so ties may not be obvious when the number of candidates is large.

New voting systems can be added to the simulator via javascript console (ctrl-shift-j in Chrome) as follows:

```javascript
function demo(candidates, ballots, cache) {
    var name2index = {};
    var ret = [];
    for (var i = 0; i < candidates.length; i++) {
        var candidate = candidates[i]; // Candidates are not sorted.
        name2index[candidate.name] = i;
        ret.push({candidate: candidate, score: 0});
    }
    for (var i = 0; i < ballots.length; i++) {
        var ballot = ballots[i]; // Ballots are not sorted.
        for (var j = 0; j < ballot.votes.length; j++) {
            var vote = ballot.votes[j]; // Votes are sorted by score.
            ret[name2index[vote.candidate.name]].score += vote.score * ballot.weight;
        }
    }
    ret.sort(function(a, b) {return a.score - b.score;});
    return ret.map(function(x) {return x.candidate;});
}
methods.push({name: "Magic Worst", fn: demo});
onUpdate();
```
# SYNTH

## Context

This is a simple tool for generating tones at specific frequencies.
The text field can be used to change the mapping from computer keyboard keys to tone frequencies.

# MIDIER

## Context

This is a simple tool for manipulating MIDI files.
When a MIDI file is loaded, the binary MIDI representation is translated into a plaintext JSON representation, which fills the text field.
When a MIDI file is saved, the plaintext JSON representation is translated back into the binary MIDI representation, which is saved to disk.

# MIDI

## Context

This is a rhythm game I wrote to make piano practice more enjoyable.
Realistically, it will not be useful unless you have a MIDI keyboard connected to your computer.
A default song is provided, but generally it makes more sense to load a MIDI file from local storage.
The game begins when you press the "Initialize" button.

Press the piano key associated with a given note when that note is between the two target lines to increase your score.
Hold the key as long as you want; the duration of notes is not currently relevant to gameplay.
When you avoid missing notes, your combo will increase.
Your badge represents the highest combo you've managed to achieve.

Game parameters can be set using the provided drop-down list, text field, and "Update" button.
The nature of these parameters is often esoteric, but many of them will be described below.

## Parameters

* anvil: The location of the left hand target line.
* badge: The current badge value.
* bass: If true, draw lines for the bass staff.
* colors: A list of colors to use for targets from different MIDI tracks.
* combo: The current combo value.
* debug: If true, draw lines to show the true location of targets.
* echo: If true, fill in targets associated with any piano key that is pressed.
* edge: The location of the boundary line at which targets disappear.
* filters: The list of MIDI tracks which should be ignored.
* hack: If true, the location of the right hand target line is constantly updated to allow hitting the next target.
* hammer: The position of the right hand target line.
* kmap: A mapping from computer keyboard keys to piano keys, to support testing without a MIDI keyboard.
* magic: If true, notes will be hit automatically, with sound, and so the game basically becomes a MIDI player.
* mode: This is one of two variables controlling the current (musical) key.
* octave: This variable controls the current octave.
* qdata: The Base64 representation of the current MIDI file.
* qhead: For internal use.
* qmeta: For internal use.
* qtime: For internal use.
* queue: A list of targets to be generated at the appropriate time.
* quiet: If true, do not produce sound when computer keyboard keys are pressed.
* score: The current score value.
* speed: The rate at which the game runs, in units of seconds per second.
* targets: A list of all current targets.
* tick\_counter: For internal use.
* ticks\_per\_frame: For internal use.
* ticks\_per\_second: For internal use.
* tonic: This is one of two variables controlling the current (musical) key.
* transpose: If true, transpose the song into the key specified by mode and tonic.
* treble: If true, draw lines for the bass staff.
* verbose: If true, log additional information to the JavaScript console.
* x\_velocity: The rate at which targets move, in percent-of-screen per second.

# CONTACT

Developer: Douglas Cantrell (cantrell.douglas@gmail.com)

# ATTRIBUTION

## Begin Preamble

It's not entirely clear to me what the best practices are for complying with attribution requirements in open source software licenses.
I suspect that this section isn't necessary, since I would probably be compliant without it, but I'm going to err on the side of caution.
To that end, the attribution details (and certain other information) for external files that I use will be listed below.


## Begin "alumidium/alumidium.js" Block

### Begin Comments

Attribution isn't actually necessary for this file, but it doesn't hurt.

### Begin License Info

```
alumidium.js - Functions for parsing/generating MIDI files.
Written in 2018 by Douglas Cantrell <cantrell.douglas@gmail.com>

To the extent possible under law, the author(s) have dedicated all
copyright and related and neighboring rights to this software to the
public domain worldwide.

This software is distributed without any warranty.

You should have received a copy of the CC0 Public Domain Dedication
along with this software.

If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.
```

## Begin "mersennetwister/src/MersenneTwister.js" Block

### Begin Comments

The original Mersenne Twister implementation can be attributed to Makoto Matsumoto and Takuji Nishimura.
The original translation from C to JavaScript can be attributed to Sean McCullough.
The revision that was merged into this project as a subtree can be attributed to Raphael Pigulla.

### Begin License Info

```
Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

 1. Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the
    documentation and/or other materials provided with the distribution.

 3. The names of its contributors may not be used to endorse or promote
    products derived from this software without specific prior written
    permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
