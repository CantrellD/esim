"use strict";

var votesys = (function() {

    function plurality(candidates, ballots, cache) {
        let ret = [];
        let name2index = {};
        for (let i = 0; i < candidates.length; i++) {
            let candidate = candidates[i];
            name2index[candidate.name] = i;
            ret.push({candidate: candidate, score: 0});
        }
        for (let ballot of ballots) {
            let vote = ballot.votes[0];
            ret[name2index[vote.candidate.name]].score += ballot.weight;
        }
        ret.sort(function(a, b) {
            return b.score - a.score;
        });
        return ret.map(function(x) {return x.candidate;});
    }

    function approval(candidates, ballots, cache) {
        let ret = [];
        let name2index = {};
        for (let i = 0; i < candidates.length; i++) {
            let candidate = candidates[i];
            name2index[candidate.name] = i;
            ret.push({candidate: candidate, score: 0});
        }
        for (let ballot of ballots) {
            let sum = 0;
            for (let vote of ballot.votes) {
                sum += vote.score;
            }
            let avg = sum / ballot.votes.length;
            for (let vote of ballot.votes) {
                let candidate = vote.candidate;
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
        let ret = [];
        let name2index = {};
        for (let i = 0; i < candidates.length; i++) {
            let candidate = candidates[i];
            name2index[candidate.name] = i;
            ret.push({candidate: candidate, score: 0});
        }
        for (let ballot of ballots) {
            for (let vote of ballot.votes) {
                if (vote.candidate.name in name2index) {
                    ret[name2index[vote.candidate.name]].score += ballot.weight;
                    break;
                }
            }
        }
        let mindex = 0;
        for (let i = 1; i < ret.length; i++) {
            if (ret[i].score < ret[mindex].score) {
                mindex = i;
            }
        }
        let last = ret.splice(mindex, 1).map(function(x) {return x.candidate;});
        let nxtc = ret.map(function(x) {return x.candidate;});
        return irv(nxtc, ballots).concat(last);
    }

    function schulze(candidates, ballots, cache) {
        let pairs = {};
        for (let winner of candidates) {
            pairs[winner.name] = {};
            for (let loser of candidates) {
                pairs[winner.name][loser.name] = 0;
            }
        }
        for (let ballot of ballots) {
            for (let i = 0; i < ballot.votes.length; i++) {
                let winner = ballot.votes[i].candidate;
                for (let j = i + 1; j < ballot.votes.length; j++) {
                    let loser = ballot.votes[j].candidate;
                    pairs[winner.name][loser.name] += ballot.weight;
                }
            }
        }
        let pathVals = {};
        for (let ci of candidates) {
            pathVals[ci.name] = {};
            for (let cj of candidates) {
                pathVals[ci.name][cj.name] = null;
            }
        }
        for (let i = 0; i < candidates.length; i++) {
            let ci = candidates[i];
            for (let j = 0; j < candidates.length; j++) {
                let cj = candidates[j];
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
        let max = Math.max;
        for (let i = 0; i < candidates.length; i++) {
            let ci = candidates[i];
            for (let j = 0; j < candidates.length; j++) {
                let cj = candidates[j];
                if (i !== j) {
                    for (let k = 0; k < candidates.length; k++) {
                        let ck = candidates[k];
                        if (i !== k && j !== k) {
                            let pvjk = pathVals[cj.name][ck.name];
                            let pvji = pathVals[cj.name][ci.name];
                            let pvik = pathVals[ci.name][ck.name];
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
        let ret = candidates.slice(0);
        ret.sort(function(a, b) {
            return pathVals[b.name][a.name] - pathVals[a.name][b.name];
        });
        return ret;
    }

    return {
        plurality: plurality,
        approval: approval,
        irv: irv,
        schulze: schulze,
        methods: ["plurality", "approval", "irv", "schulze"]
    };
})();
