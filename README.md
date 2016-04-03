# Election Simulator

## Controls
Left Mouse Button: Add (and nominate) small city
Middle Mouse Button: Add (but do not nominate) large city
Right Mouse Button: Select city

## Context
This page can be used to simulate elections where voters choose the location of a new capital city. Voters prefer cities which are relatively close to the city in which they live, and express those preferences sincerely. During approval voting elections, the approval threshold for each voter is given by their average distance to potential capitals. Be aware that voters would behave differently in reality, and that the consequences of strategic voting vary widely between voting systems.

Election results are generally shown at the bottom of the page. Results for a given method can also be graphed on the state map, in which case the color of the map at a given location shows which city would be chosen if the selected city were moved to that location. Graphs cannot be generated if no city is selected.

## Details
The positions of voters relative to the cities in which they live follow a gaussian distribution. The standard deviation of the distribution can be set using the 'Pop. Sigma' field. Note that values other than zero will slow down the simulation when cities are large.

The resolution of graphs can be controlled with the 'Step' field. Lower step values give higher resolution.

New voting systems can be added to the simulator using the javascript console. Here's an example:
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
