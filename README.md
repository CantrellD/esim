# Election Simulator

## Controls
```
Left click on map: Add (and nominate) small city
Left click on city: Select / deselect city
Middle click on city: Toggle city nomination
Right click on city: Delete city
Scroll on city: Change city population
```

## Context
This page can be used to simulate elections where voters choose the location of a new capital city. Voters prefer cities which are relatively close to the city in which they live, and express those preferences sincerely. (During approval voting elections, the approval threshold for each voter is given by their average distance to potential capitals.) Voters do not respond to any of the strategic incentives inherent to a given voting system.

Election results are generally shown at the bottom of the page. Results for a given method can also be graphed on the state map, in which case the color of the map at a given location shows which city would be chosen if the selected city were moved to that location. Graphs cannot be generated if no city is selected.

## Methods

### Plurality
Each voter chooses one candidate. The candidate chosen by the most voters is elected.

### Approval
Each voter chooses some subset of the candidates. The candidate chosen by the most voters is elected.

### Instant Runoff Voting
Each voter ranks the candidates in order of preference. Candidates are eliminated until only one candidate remains. The candidate ranked higher than any remaining alternative by the fewest voters is eliminated, as needed.

### Condorcet (e.g. Schulze)
If there exists a candidate with majority support in every possible pairwise contest, that candidate is elected.

### Magic Best
Each voter rates the candidates using true (not normalized) preferences. The candidate with the highest rating is elected.

## Details
The positions of voters relative to the cities in which they live follow a gaussian distribution. The standard deviation of the distribution can be set using the 'Pop. Sigma' field. Note that values other than zero will slow down the simulation when cities are large.

The resolution of graphs can be controlled with the 'Step' field. Lower step values give higher resolution.

Patterns of alternating color are meant to indicate ties when generating graphs. Strictly speaking the simulator doesn't check for ties, so the patterns occur because the candidates are specified in a different order when requesting different parts of the graph. Every possible ordering is used prior to repetition, so the patterns break down as the number of candidates becomes large.

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

# CONTACT
cantrell.douglas@gmail.com

# MODIFIED CODE ATTRIBUTION

## Begin "mt19937.js" Block

### Begin License

   A C-program for MT19937, with initialization improved 2002/1/26.
   Coded by Takuji Nishimura and Makoto Matsumoto.

   Before using, initialize the state by using init\_genrand(seed)
   or init\_by\_array(init\_key, key\_length).

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
   A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
   OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


   Any feedback is very welcome.
   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)

