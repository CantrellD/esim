/*
    votesys.js - Voting system algorithm implementations.
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

    function condorcet(candidates, ballots, cache) {
        // Find pairwise scores.
        var pairs = null;
        if (cache.hasOwnProperty("pairs")) {
            pairs = cache.pairs;
        }
        else {
            pairs = {};
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
        }

        // Base case and shortcut.
        if (candidates.length === 1) {
            return candidates;
        }
        else if (candidates.length === 2) {
            var c0 = candidates[0];
            var c1 = candidates[1];
            if (pairs[c0.name][c1.name] > pairs[c1.name][c0.name]) {
                return [c0, c1];
            }
            else {
                return [c1, c0];
            }
        }

        // Find winner, if any. Just return first candidate otherwise.
        var winner = null;
        for (var i = 0; i < candidates.length; i++) {
            var ci = candidates[i];
            winner = ci.name;
            for (var j = 0; j < candidates.length; j++) {
                var cj = candidates[j];
                if (pairs[cj.name][ci.name] > pairs[ci.name][cj.name]) {
                    winner = null;
                }
            }
            if (winner !== null) {
                break;
            }
        }
        if (winner === null) {
            winner = candidates[0].name;
        }

        // Recurse.
        var ret = [];
        var losers = [];
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            if (candidate.name === winner) {
                ret.push(candidate);
            }
            else {
                losers.push(candidate);
            }
        }
        return ret.concat(condorcet(losers, ballots, {pairs: pairs}));
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
        condorcet: condorcet,
        magic: magic,
        methods: [
            {name: "Plurality", fn: plurality},
            {name: "Approval", fn: approval},
            {name: "Instant Runoff Voting", fn: irv},
            {name: "Condorcet", fn: condorcet},
            {name: "Magic Best", fn: magic}
        ]
    };
})();
