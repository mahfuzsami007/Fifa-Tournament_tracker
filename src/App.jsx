import React, { useState, useMemo, useEffect } from 'react';

// STAGE CONSTANTS FOR FLOW CONTROL
const STAGES = {
  REGISTRATION: 0,
  GROUP_STAGE: 1,
  QUARTERFINALS: 2,
  SEMIFINALS: 3,
  FINAL: 4,
};

// Fixture generator templates for Group Stage
const GROUP_FIXTURES_TEMPLATE = [
  { p1Idx: 0, p2Idx: 1 },
  { p1Idx: 1, p2Idx: 2 },
  { p1Idx: 0, p2Idx: 2 },
];

// Local Storage Helper
const getLocalStorageOrDefault = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error("Failed to read localStorage data:", e);
    return defaultValue;
  }
};

export default function App() {
  // Persistent States
  const [currentStage, setCurrentStage] = useState(() => 
    getLocalStorageOrDefault('fifa_stage_v3', STAGES.REGISTRATION)
  );
  
  const [playerInputs, setPlayerInputs] = useState(() => 
    getLocalStorageOrDefault('fifa_player_inputs_v3', Array(9).fill("").map((_, i) => `Competitor ${i + 1}`))
  );
  
  const [randomizedSquads, setRandomizedSquads] = useState(() => 
    getLocalStorageOrDefault('fifa_randomized_squads_v3', { A: [], B: [], C: [] })
  );

  const [groupScores, setGroupScores] = useState(() => 
    getLocalStorageOrDefault('fifa_group_scores_v3', {})
  );

  // Locked Random Quarterfinal Pairings: Stores indices/names of who plays whom
  const [qfFixtures, setQfFixtures] = useState(() =>
    getLocalStorageOrDefault('fifa_qf_fixtures_v3', null)
  );
  
  const [qfScores, setQfScores] = useState(() => 
    getLocalStorageOrDefault('fifa_qf_scores_v3', {
      qf1: { s1: '', s2: '', played: false },
      qf2: { s1: '', s2: '', played: false },
    })
  );
  
  const [knockoutScores, setKnockoutScores] = useState(() => 
    getLocalStorageOrDefault('fifa_knockout_scores_v3', {
      sf1: { s1: '', s2: '', played: false },
      sf2: { s1: '', s2: '', played: false },
      final: { s1: '', s2: '', played: false },
    })
  );

  // --- EFFECT SYNCHRONIZATION ---
  useEffect(() => { localStorage.setItem('fifa_stage_v3', JSON.stringify(currentStage)); }, [currentStage]);
  useEffect(() => { localStorage.setItem('fifa_player_inputs_v3', JSON.stringify(playerInputs)); }, [playerInputs]);
  useEffect(() => { localStorage.setItem('fifa_randomized_squads_v3', JSON.stringify(randomizedSquads)); }, [randomizedSquads]);
  useEffect(() => { localStorage.setItem('fifa_group_scores_v3', JSON.stringify(groupScores)); }, [groupScores]);
  useEffect(() => { localStorage.setItem('fifa_qf_fixtures_v3', JSON.stringify(qfFixtures)); }, [qfFixtures]);
  useEffect(() => { localStorage.setItem('fifa_qf_scores_v3', JSON.stringify(qfScores)); }, [qfScores]);
  useEffect(() => { localStorage.setItem('fifa_knockout_scores_v3', JSON.stringify(knockoutScores)); }, [knockoutScores]);

  // --- PURGE / RESET ENGINE ---
  const handleEndTournament = () => {
    if (window.confirm("Are you certain you wish to end this tournament? All logged data will be permanently wiped.")) {
      localStorage.clear();
      setCurrentStage(STAGES.REGISTRATION);
      setPlayerInputs(Array(9).fill("").map((_, i) => `Competitor ${i + 1}`));
      setRandomizedSquads({ A: [], B: [], C: [] });
      setGroupScores({});
      setQfFixtures(null);
      setQfScores({ qf1: { s1: '', s2: '', played: false }, qf2: { s1: '', s2: '', played: false } });
      setKnockoutScores({
        sf1: { s1: '', s2: '', played: false },
        sf2: { s1: '', s2: '', played: false },
        final: { s1: '', s2: '', played: false },
      });
    }
  };

  const handleShuffleAndLock = () => {
    const pool = [...playerInputs].map(p => p.trim() || "Anonymous Pro");
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setRandomizedSquads({
      A: [pool[0], pool[1], pool[2]],
      B: [pool[3], pool[4], pool[5]],
      C: [pool[6], pool[7], pool[8]],
    });
    setCurrentStage(STAGES.GROUP_STAGE);
  };

  // --- DYNAMIC SEED COMPUTATIONS ---
  const groupStandings = useMemo(() => {
    if (currentStage < STAGES.GROUP_STAGE) return { A: [], B: [], C: [] };

    const initNode = (squad) => squad.reduce((acc, name) => {
      acc[name] = { name, p: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0 };
      return acc;
    }, {});

    const metrics = {
      A: initNode(randomizedSquads.A),
      B: initNode(randomizedSquads.B),
      C: initNode(randomizedSquads.C),
    };

    ['A', 'B', 'C'].forEach(groupId => {
      GROUP_FIXTURES_TEMPLATE.forEach((f, idx) => {
        const key = `G-${groupId}-${idx}`;
        const data = groupScores[key];
        if (data && data.played) {
          const p1 = randomizedSquads[groupId][f.p1Idx];
          const p2 = randomizedSquads[groupId][f.p2Idx];
          const s1 = parseInt(data.s1) || 0;
          const s2 = parseInt(data.s2) || 0;

          metrics[groupId][p1].p += 1; metrics[groupId][p2].p += 1;
          metrics[groupId][p1].gd += (s1 - s2); metrics[groupId][p2].gd += (s2 - s1);

          if (s1 > s2) {
            metrics[groupId][p1].w += 1; metrics[groupId][p1].pts += 3;
            metrics[groupId][p2].l += 1;
          } else if (s2 > s1) {
            metrics[groupId][p2].w += 1; metrics[groupId][p2].pts += 3;
            metrics[groupId][p1].l += 1;
          } else {
            metrics[groupId][p1].d += 1; metrics[groupId][p1].pts += 1;
            metrics[groupId][p2].d += 1; metrics[groupId][p2].pts += 1;
          }
        }
      });
    });

    const sortFn = (obj) => Object.values(obj).sort((a, b) => b.pts - a.pts || b.gd - a.gd || a.name.localeCompare(b.name));
    return { A: sortFn(metrics.A), B: sortFn(metrics.B), C: sortFn(metrics.C) };
  }, [randomizedSquads, groupScores, currentStage]);

  // Global ranking of the 6 advancing players
  const seedRankings = useMemo(() => {
    if (currentStage < STAGES.GROUP_STAGE) return [];
    const rawQualifiers = [];
    ['A', 'B', 'C'].forEach(g => {
      if (groupStandings[g][0]) rawQualifiers.push({ ...groupStandings[g][0], grpRank: 1 });
      if (groupStandings[g][1]) rawQualifiers.push({ ...groupStandings[g][1], grpRank: 2 });
    });

    return rawQualifiers.sort((a, b) => {
      if (a.grpRank !== b.grpRank) return a.grpRank - b.grpRank;
      return b.pts - a.pts || b.gd - a.gd || a.name.localeCompare(b.name);
    });
  }, [groupStandings, currentStage]);

  // --- STAGE ADVANCEMENT HANDLING AND KNOCKOUT COUPLING ---
  const advanceToQuarterfinals = () => {
    // Generate locked, completely random pairings from Seeds 3, 4, 5, 6
    const bottomFour = [seedRankings[2].name, seedRankings[3].name, seedRankings[4].name, seedRankings[5].name];
    for (let i = bottomFour.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bottomFour[i], bottomFour[j]] = [bottomFour[j], bottomFour[i]];
    }
    
    setQfFixtures({
      qf1: { p1: bottomFour[0], p2: bottomFour[1] },
      qf2: { p1: bottomFour[2], p2: bottomFour[3] }
    });
    setCurrentStage(STAGES.QUARTERFINALS);
  };

  const finalFourPairings = useMemo(() => {
    if (seedRankings.length < 2) {
      return { sf1: ['TBD', 'TBD'], sf2: ['TBD', 'TBD'], final: ['TBD', 'TBD'], champ: 'TBD' };
    }

    const sf1_p1 = seedRankings[0].name; // Seed 1
    const sf2_p1 = seedRankings[1].name; // Seed 2

    const getWinner = (scoreNode, fallbackP1, fallbackP2) => {
      if (!scoreNode || !scoreNode.played) return 'TBD';
      const s1 = parseInt(scoreNode.s1) || 0;
      const s2 = parseInt(scoreNode.s2) || 0;
      return s1 > s2 ? fallbackP1 : fallbackP2; // Knockouts require clear winners
    };

    const sf1_p2 = qfFixtures ? getWinner(qfScores.qf1, qfFixtures.qf1.p1, qfFixtures.qf1.p2) : 'TBD';
    const sf2_p2 = qfFixtures ? getWinner(qfScores.qf2, qfFixtures.qf2.p1, qfFixtures.qf2.p2) : 'TBD';

    const f_p1 = getWinner(knockoutScores.sf1, sf1_p1, sf1_p2);
    const f_p2 = getWinner(knockoutScores.sf2, sf2_p1, sf2_p2);
    const champion = getWinner(knockoutScores.final, f_p1, f_p2);

    return { sf1: [sf1_p1, sf1_p2], sf2: [sf2_p1, sf2_p2], final: [f_p1, f_p2], champ: champion };
  }, [seedRankings, qfFixtures, qfScores, knockoutScores]);

  const isStageComplete = () => {
    if (currentStage === STAGES.GROUP_STAGE) {
      return ['A', 'B', 'C'].every(g => [0, 1, 2].every(idx => groupScores[`G-${g}-${idx}`]?.played));
    }
    if (currentStage === STAGES.QUARTERFINALS) {
      return qfScores.qf1.played && qfScores.qf2.played && qfScores.qf1.s1 !== qfScores.qf1.s2 && qfScores.qf2.s1 !== qfScores.qf2.s2;
    }
    if (currentStage === STAGES.SEMIFINALS) {
      return knockoutScores.sf1.played && knockoutScores.sf2.played && knockoutScores.sf1.s1 !== knockoutScores.sf1.s2 && knockoutScores.sf2.s1 !== knockoutScores.sf2.s2;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-lime-400 selection:text-black">
      <div className="h-1.5 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-500 w-full" />
      
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* HEADER */}
        <header className="relative flex flex-col md:flex-row justify-between items-center bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-2xl gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-lime-500/10 text-lime-400 border border-lime-500/20 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">
              ⚙️ KNOCKOUT ENGINE v3
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-white italic">
              PRO MATCH <span className="text-lime-400">TRACKER</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {currentStage > STAGES.REGISTRATION && (
              <button
                onClick={handleEndTournament}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider text-red-400 border border-red-500/30 hover:border-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl cursor-pointer transition-all"
              >
                🚨 End Tournament
              </button>
            )}
          </div>
        </header>

        {/* STAGE 0: SQUAD REGISTRATION */}
        {currentStage === STAGES.REGISTRATION && (
          <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-lime-400 rounded" />
              <h2 className="text-lg font-black uppercase italic tracking-tight text-white">1. Core Roster Inputs</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {playerInputs.map((val, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const arr = [...playerInputs];
                    arr[idx] = e.target.value;
                    setPlayerInputs(arr);
                  }}
                  className="bg-slate-950 border border-slate-800 focus:border-lime-400 text-white font-semibold text-sm px-4 py-3 rounded-xl focus:outline-none transition-colors"
                />
              ))}
            </div>
            <button
              onClick={handleShuffleAndLock}
              className="w-full py-4 bg-gradient-to-r from-lime-400 to-emerald-500 text-black font-black text-sm uppercase tracking-wider rounded-xl cursor-pointer"
            >
              🎲 Run Random Allocation & Generate Fixtures
            </button>
          </section>
        )}

        {/* STAGE 1: GROUP OPERATIONS */}
        {currentStage >= STAGES.GROUP_STAGE && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {['A', 'B', 'C'].map((gId) => (
                <section key={gId} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tight mb-4 border-b border-slate-800 pb-2">
                      GROUP {gId}
                    </h2>
                    <table className="w-full text-xs text-left mb-6">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800">
                          <th className="py-2">MANAGER</th>
                          <th className="py-2 text-center">GD</th>
                          <th className="py-2 text-right text-lime-400 font-bold">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {groupStandings[gId]?.map((row, idx) => (
                          <tr key={idx} className={idx < 2 ? 'text-lime-400 font-bold' : 'text-slate-400'}>
                            <td className="py-2 text-white truncate max-w-[110px]">{row.name}</td>
                            <td className="py-2 text-center font-mono">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                            <td className="py-2 text-right text-slate-200 font-black">{row.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {currentStage === STAGES.GROUP_STAGE && (
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                      {GROUP_FIXTURES_TEMPLATE.map((f, idx) => {
                        const key = `G-${gId}-${idx}`;
                        const p1 = randomizedSquads[gId][f.p1Idx];
                        const p2 = randomizedSquads[gId][f.p2Idx];
                        const score = groupScores[key] || { s1: '', s2: '' };

                        return (
                          <div key={idx} className="flex items-center justify-between text-xs bg-slate-950 p-2 border border-slate-800 rounded-lg">
                            <span className="truncate w-20 text-slate-300 font-semibold">{p1}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="0"
                                value={score.s1}
                                onChange={(e) => setGroupScores(p => ({ ...p, [key]: { ...p[key], s1: e.target.value, played: true } }))}
                                className="w-7 h-6 text-center bg-slate-900 text-lime-400 font-black border border-slate-800 rounded focus:outline-none"
                              />
                              <span className="text-slate-600 font-bold">:</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={score.s2}
                                onChange={(e) => setGroupScores(p => ({ ...p, [key]: { ...p[key], s2: e.target.value, played: true } }))}
                                className="w-7 h-6 text-center bg-slate-900 text-lime-400 font-black border border-slate-800 rounded focus:outline-none"
                              />
                            </div>
                            <span className="truncate w-20 text-right text-slate-300 font-semibold">{p2}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* SEED ADVANCEMENT LEDGER */}
            {currentStage >= STAGES.GROUP_STAGE && (
              <section className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-lime-400" />
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">Advancing Competitors Leaderboard</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {seedRankings.map((p, idx) => (
                    <div key={idx} className={`p-3 border rounded-xl text-center transition-all ${
                      idx < 2 ? 'bg-lime-500/10 border-lime-400/60 text-lime-400' : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}>
                      <span className="block text-[9px] uppercase tracking-widest text-slate-500 font-bold">Seed #{idx + 1}</span>
                      <span className="text-sm font-black truncate block mt-0.5">{p.name}</span>
                      <span className="text-[10px] block opacity-70 mt-1 font-mono">{p.pts} PTS | GD {p.gd > 0 ? `+${p.gd}` : p.gd}</span>
                      {idx < 2 && (
                        <span className="inline-block mt-2 text-[8px] font-black bg-lime-400 text-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                          ⏩ Semifinalist
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {currentStage === STAGES.GROUP_STAGE && (
              <button
                disabled={!isStageComplete()}
                onClick={advanceToQuarterfinals}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 ${
                  isStageComplete() ? 'bg-lime-400 text-black shadow-lg cursor-pointer' : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
                }`}
              >
                {isStageComplete() ? "🎲 Lock Standings & Generate Random Knockout Quarterfinals" : "🔒 Resolve All Group Matches to Advance"}
              </button>
            )}
          </div>
        )}

        {/* STAGE 2: QUARTERFINALS KNOCKOUT MODULE */}
        {currentStage >= STAGES.QUARTERFINALS && qfFixtures && (
          <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-1.5 h-6 bg-cyan-400 rounded" />
              <h2 className="text-lg font-black uppercase italic tracking-tight text-white">2. Random Single-Elimination Quarterfinals</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['qf1', 'qf2'].map((key, index) => {
                const match = qfFixtures[key];
                const scores = qfScores[key];
                return (
                  <div key={key} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase bg-cyan-500/10 px-2 py-0.5 rounded">
                      QUARTERFINAL MATCH #{index + 1}
                    </span>
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="font-bold text-slate-200 truncate">{match.p1}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          disabled={currentStage > STAGES.QUARTERFINALS}
                          value={scores.s1}
                          onChange={(e) => setQfScores(p => ({ ...p, [key]: { ...p[key], s1: e.target.value, played: true } }))}
                          className="w-10 h-8 text-center bg-slate-900 text-cyan-400 font-black border border-slate-800 rounded-lg focus:outline-none"
                        />
                        <span className="text-slate-600 font-bold">:</span>
                        <input
                          type="number"
                          disabled={currentStage > STAGES.QUARTERFINALS}
                          value={scores.s2}
                          onChange={(e) => setQfScores(p => ({ ...p, [key]: { ...p[key], s2: e.target.value, played: true } }))}
                          className="w-10 h-8 text-center bg-slate-900 text-cyan-400 font-black border border-slate-800 rounded-lg focus:outline-none"
                        />
                      </div>
                      <span className="font-bold text-slate-200 truncate text-right">{match.p2}</span>
                    </div>
                    {scores.played && scores.s1 === scores.s2 && (
                      <span className="text-[10px] text-rose-400 block font-semibold">⚠️ Knockout format: Matches cannot end in a draw. Use penalties to determine winner.</span>
                    )}
                  </div>
                );
              })}
            </div>

            {currentStage === STAGES.QUARTERFINALS && (
              <button
                disabled={!isStageComplete()}
                onClick={() => setCurrentStage(STAGES.SEMIFINALS)}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 ${
                  isStageComplete() ? 'bg-cyan-400 text-black shadow-lg cursor-pointer' : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
                }`}
              >
                {isStageComplete() ? "🔓 Advance Winners to Semifinals Arena" : "🔒 Resolve All Decisive Quarterfinals to Advance"}
              </button>
            )}
          </section>
        )}

        {/* STAGE 3 & 4: ADVANCED CHRONOLOGICAL BRACKET */}
        {currentStage >= STAGES.SEMIFINALS && (
          <section className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-2xl relative backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-pink-500 rounded" />
              <h2 className="text-xl font-black uppercase tracking-tight italic text-white">3. Final Championship Knockout</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="block text-center text-[10px] font-black tracking-widest text-slate-500 uppercase border-b border-slate-800 pb-2">Semifinal Duels</span>
                
                {/* SF1 */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="text-[9px] font-black text-pink-500 uppercase">MATCH 12 • SF 1</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-300">{finalFourPairings.sf1[0]} (Seed 1)</span>
                      <input
                        type="number"
                        disabled={currentStage > STAGES.SEMIFINALS}
                        value={knockoutScores.sf1.s1}
                        onChange={(e) => setKnockoutScores(p => ({ ...p, sf1: { ...p.sf1, s1: e.target.value, played: true } }))}
                        className="w-8 h-7 text-center bg-slate-900 border border-slate-800 text-white font-black rounded"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-300">{finalFourPairings.sf1[1]} (QF Winner)</span>
                      <input
                        type="number"
                        disabled={currentStage > STAGES.SEMIFINALS}
                        value={knockoutScores.sf1.s2}
                        onChange={(e) => setKnockoutScores(p => ({ ...p, sf1: { ...p.sf1, s2: e.target.value, played: true } }))}
                        className="w-8 h-7 text-center bg-slate-900 border border-slate-800 text-white font-black rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* SF2 */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="text-[9px] font-black text-pink-500 uppercase">MATCH 13 • SF 2</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-300">{finalFourPairings.sf2[0]} (Seed 2)</span>
                      <input
                        type="number"
                        disabled={currentStage > STAGES.SEMIFINALS}
                        value={knockoutScores.sf2.s1}
                        onChange={(e) => setKnockoutScores(p => ({ ...p, sf2: { ...p.sf2, s1: e.target.value, played: true } }))}
                        className="w-8 h-7 text-center bg-slate-900 border border-slate-800 text-white font-black rounded"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-300">{finalFourPairings.sf2[1]} (QF Winner)</span>
                      <input
                        type="number"
                        disabled={currentStage > STAGES.SEMIFINALS}
                        value={knockoutScores.sf2.s2}
                        onChange={(e) => setKnockoutScores(p => ({ ...p, sf2: { ...p.sf2, s2: e.target.value, played: true } }))}
                        className="w-8 h-7 text-center bg-slate-900 border border-slate-800 text-white font-black rounded"
                      />
                    </div>
                  </div>
                </div>

                {currentStage === STAGES.SEMIFINALS && (
                  <button
                    disabled={!isStageComplete()}
                    onClick={() => setCurrentStage(STAGES.FINAL)}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                      isStageComplete() ? 'bg-pink-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    Lock Winners & Lock Grand Final
                  </button>
                )}
              </div>

              {/* Grand Final Arena Module */}
              <div className="flex flex-col items-center justify-center">
                <span className="block text-center text-[10px] font-black tracking-widest text-slate-500 uppercase border-b border-slate-800 pb-2 mb-4 w-full">Championship Match</span>
                
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-lime-400 p-6 rounded-2xl text-center shadow-2xl w-full max-w-xs space-y-4">
                  <span className="text-[9px] font-black px-2 py-0.5 bg-lime-400 text-black rounded tracking-widest uppercase">MATCH 14 • FINALS</span>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">{finalFourPairings.final[0]}</span>
                      <input
                        type="number"
                        disabled={currentStage < STAGES.FINAL}
                        value={knockoutScores.final.s1}
                        onChange={(e) => setKnockoutScores(p => ({ ...p, final: { ...p.final, s1: e.target.value, played: true } }))}
                        className="w-10 h-8 text-center bg-slate-900 border border-slate-800 text-lime-400 font-black text-md rounded"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-200">{finalFourPairings.final[1]}</span>
                      <input
                        type="number"
                        disabled={currentStage < STAGES.FINAL}
                        value={knockoutScores.final.s2}
                        onChange={(e) => setKnockoutScores(p => ({ ...p, final: { ...p.final, s2: e.target.value, played: true } }))}
                        className="w-10 h-8 text-center bg-slate-900 border border-slate-800 text-lime-400 font-black text-md rounded"
                      />
                    </div>
                  </div>

                  {knockoutScores.final.played && knockoutScores.final.s1 !== knockoutScores.final.s2 && finalFourPairings.champ !== 'TBD' && (
                    <div className="pt-4 border-t border-slate-800 bg-lime-400/5 rounded-xl p-2 border border-lime-400/10">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">CHAMPION DECLARED</span>
                      <span className="text-xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400 uppercase">
                        👑 {finalFourPairings.champ}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}