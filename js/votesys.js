"use strict";

var votesys = (function() {

    function plurality(candidates, ballots, cache) {
        var ret = [];
        var name2index = {};
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            name2index[candidate.name] = i;
            ret.push({candidate: candidate, score: 0});
        }
        for (var i = 0; i < ballots.length; i++) {
            var ballot = ballots[i];
            var vote = ballot.votes[0];
            ret[name2index[vote.candidate.name]].score += ballot.weight;
        }
        ret.sort(function(a, b) {
            return b.score - a.score;
        });
        return ret.map(function(x) {return x.candidate;});
    }

    function approval(candidates, ballots, cache) {
        var ret = [];
        var name2index = {};
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            name2index[candidate.name] = i;
            ret.push({candidate: candidate, score: 0});
        }
        for (var i = 0; i < ballots.length; i++) {
            var ballot = ballots[i];
            var sum = 0;
            for (var j = 0; j < ballot.votes.length; j++) {
                var vote = ballot.votes[j];
                sum += vote.score;
            }
            var avg = sum / ballot.votes.length;
            for (var j = 0; j < ballot.votes.length; j++) {
                var vote = ballot.votes[j];
                var candidate = vote.candidate;
                if (vote.score > avg) {
                    ret[name2index[candidate.name]].score += ballot.weight;
                }
                else if (vote.score === avg) {
                    ret[name2index[candidate.name]].score += ballot.weight / 2;
                }
            }
        }
        ret.sort(function(a, b) {
            return b.score - a.score;
        });
        return ret.map(function(x) {return x.candidate;});
    }

    function irv(candidates, ballots, cache) {
        if (candidates.length < 2) {
            return candidates;
        }
        var ret = [];
        var name2index = {};
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            name2index[candidate.name] = i;
            ret.push({candidate: candidate, score: 0});
        }
        for (var i = 0; i < ballots.length; i++) {
            var ballot = ballots[i];
            for (var j = 0; j < ballot.votes.length; j++) {
                var vote = ballot.votes[j];
                if (vote.candidate.name in name2index) {
                    ret[name2index[vote.candidate.name]].score += ballot.weight;
                    break;
                }
            }
        }
        var mindex = 0;
        for (var i = 1; i < ret.length; i++) {
            if (ret[i].score < ret[mindex].score) {
                mindex = i;
            }
        }
        var last = ret.splice(mindex, 1).map(function(x) {return x.candidate;});
        var nxtc = ret.map(function(x) {return x.candidate;});
        return irv(nxtc, ballots).concat(last);
    }

    function schulze(candidates, ballots, cache) {
        var pairs = {};
        for (var i = 0; i < candidates.length; i++) {
            var winner = candidates[i];
            pairs[winner.name] = {};
            for (var j = 0; j < candidates.length; j++) {
                var loser = candidates[j];
                pairs[winner.name][loser.name] = 0;
            }
        }
        for (var i = 0; i < ballots.length; i++) {
            var ballot = ballots[i];
            for (var j = 0; j < ballot.votes.length; j++) {
                var winner = ballot.votes[j].candidate;
                for (var k = j + 1; k < ballot.votes.length; k++) {
                    var loser = ballot.votes[k].candidate;
                    pairs[winner.name][loser.name] += ballot.weight;
                }
            }
        }
        var pathVals = {};
        for (var i = 0; i < candidates.length; i++) {
            var ci = candidates[i];
            pathVals[ci.name] = {};
            for (var j = 0; j < candidates.length; j++) {
                var cj = candidates[j];
                pathVals[ci.name][cj.name] = null;
            }
        }
        for (var i = 0; i < candidates.length; i++) {
            var ci = candidates[i];
            for (var j = 0; j < candidates.length; j++) {
                var cj = candidates[j];
                if (i !== j) {
                    if (pairs[ci.name][cj.name] > pairs[cj.name][ci.name]) {
                        pathVals[ci.name][cj.name] = pairs[ci.name][cj.name];
                    }
                    else {
                        pathVals[ci.name][cj.name] = 0;
                    }
                }
            }
        }
        var max = Math.max;
        for (var i = 0; i < candidates.length; i++) {
            var ci = candidates[i];
            for (var j = 0; j < candidates.length; j++) {
                var cj = candidates[j];
                if (i !== j) {
                    for (var k = 0; k < candidates.length; k++) {
                        var ck = candidates[k];
                        if (i !== k && j !== k) {
                            var pvjk = pathVals[cj.name][ck.name];
                            var pvji = pathVals[cj.name][ci.name];
                            var pvik = pathVals[ci.name][ck.name];
                            if (pvji < pvik) {
                                pathVals[cj.name][ck.name] = max(pvjk, pvji);
                            }
                            else {
                                pathVals[cj.name][ck.name] = max(pvjk, pvik);
                            }
                        }
                    }
                }
            }
        }
        var ret = candidates.slice(0);
        ret.sort(function(a, b) {
            return pathVals[b.name][a.name] - pathVals[a.name][b.name];
        });
        return ret;
    }

    function magic(candidates, ballots, cache) {
        var name2index = {};
        var ret = [];
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            name2index[candidate.name] = i;
            ret.push({candidate: candidate, score: 0});
        }
        for (var i = 0; i < ballots.length; i++) {
            var ballot = ballots[i];
            for (var j = 0; j < ballot.votes.length; j++) {
                var vote = ballot.votes[j];
                ret[name2index[vote.candidate.name]].score += vote.score * ballot.weight;
            }
        }
        ret.sort(function(a, b) {return b.score - a.score;});
        return ret.map(function(x) {return x.candidate;});
    }

    return {
        plurality: plurality,
        approval: approval,
        irv: irv,
        schulze: schulze,
        methods: [
            {name: "Plurality", fn: plurality},
            {name: "Approval", fn: approval},
            {name: "Instant Runoff Voting", fn: irv},
            {name: "Schulze", fn: schulze},
            {name: "Magic Best", fn: magic}
        ]
    };
})();
