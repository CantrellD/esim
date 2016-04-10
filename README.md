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
