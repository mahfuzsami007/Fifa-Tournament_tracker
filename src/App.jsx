import React, { useState, useMemo, useEffect } from 'react';

// STAGE CONSTANTS FOR FLOW CONTROL
const STAGES = {
  REGISTRATION: 0,
  GROUP_STAGE: 1,
  PLAYOFF_TABLE: 2,
  SEMIFINALS: 3,
  FINAL: 4,
};

// Fixture generator templates
const GROUP_FIXTURES_TEMPLATE = [
  { p1Idx: 0, p2Idx: 1 },
  { p1Idx: 1, p2Idx: 2 },
  { p1Idx: 0, p2Idx: 2 },
];

const ROUND_TABLE_TEMPLATE = [
  { p1Idx: 0, p2Idx: 1, label: "Match R1-A" },
  { p1Idx: 2, p2Idx: 3, label: "Match R1-B" },
  { p1Idx: 0, p2Idx: 2, label: "Match R2-A" },
  { p1Idx: 1, p2Idx: 3, label: "Match R2-B" },
  { p1Idx: 0, p2Idx: 3, label: "Match R3-A" },
  { p1Idx: 1, p2Idx: 2, label: "Match R3-B" },
];

// Local Storage Helper to fetch initial state or fallback gracefully
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
  // Persistent States synced to LocalStorage
  const [currentStage, setCurrentStage] = useState(() => 
    getLocalStorageOrDefault('fifa_stage', STAGES.REGISTRATION)
  );
  
  const [playerInputs, setPlayerInputs] = useState(() => 
    getLocalStorageOrDefault('fifa_player_inputs', Array(9).fill("").map((_, i) => `Competitor ${i + 1}`))
  );
  
  const [randomizedSquads, setRandomizedSquads] = useState(() => 
    getLocalStorageOrDefault('fifa_randomized_squads', { A: [], B: [], C: [] })
  );

  const [groupScores, setGroupScores] = useState(() => 
    getLocalStorageOrDefault('fifa_group_scores', {})
  );
  
  const [roundTableScores, setRoundTableScores] = useState(() => 
    getLocalStorageOrDefault('fifa_round_table_scores', {})
  );
  
  const [knockoutScores, setKnockoutScores] = useState(() => 
    getLocalStorageOrDefault('fifa_knockout_scores', {
      sf1: { s1: '', s2: '', played: false },
      sf2: { s1: '', s2: '', played: false },
      final: { s1: '', s2: '', played: false },
    })
  );

  // --- EFFECT COUPLING FOR DATA PERSISTENCE ---
  useEffect(() => { localStorage.setItem('fifa_stage', JSON.stringify(currentStage)); }, [currentStage]);
  useEffect(() => { localStorage.setItem('fifa_player_inputs', JSON.stringify(playerInputs)); }, [playerInputs]);
  useEffect(() => { localStorage.setItem('fifa_randomized_squads', JSON.stringify(randomizedSquads)); }, [randomizedSquads]);
  useEffect(() => { localStorage.setItem('fifa_group_scores', JSON.stringify(groupScores)); }, [groupScores]);
  useEffect(() => { localStorage.setItem('fifa_round_table_scores', JSON.stringify(roundTableScores)); }, [roundTableScores]);
  useEffect(() => { localStorage.setItem('fifa_knockout_scores', JSON.stringify(knockoutScores)); }, [knockoutScores]);

  // --- TOURNEY RENEWAL DESTRUCT ENGINE ---
  const handleEndTournament = () => {
    if (window.confirm("Are you absolute certain you wish to terminate this tournament? All logged results will be permanently purged.")) {
      localStorage.clear();
      setCurrentStage(STAGES.REGISTRATION);
      setPlayerInputs(Array(9).fill("").map((_, i) => `Competitor ${i + 1}`));
      setRandomizedSquads({ A: [], B: [], C: [] });
      setGroupScores({});
      setRoundTableScores({});
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

  // --- DYNAMIC DATA AGGREGATORS (MEMOIZED) ---
  const groupStandings = useMemo(() => {
    if (currentStage < STAGES.GROUP_STAGE) return { A: [], B: [], C: [] };

    const initializeStandingsNode = (squad) => 
      squad.reduce((acc, name) => {
        acc[name] = { name, p: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0 };
        return acc;
      }, {});

    const metrics = {
      A: initializeStandingsNode(randomizedSquads.A),
      B: initializeStandingsNode(randomizedSquads.B),
      C: initializeStandingsNode(randomizedSquads.C),
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

          metrics[groupId][p1].p += 1;
          metrics[groupId][p2].p += 1;
          metrics[groupId][p1].gd += (s1 - s2);
          metrics[groupId][p2].gd += (s2 - s1);

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

    const sortStandings = (obj) => Object.values(obj).sort((a, b) => b.pts - a.pts || b.gd - a.gd || a.name.localeCompare(b.name));

    return {
      A: sortStandings(metrics.A),
      B: sortStandings(metrics.B),
      C: sortStandings(metrics.C),
    };
  }, [randomizedSquads, groupScores, currentStage]);

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
    }).map(item => item.name);
  }, [groupStandings, currentStage]);

  const intermediateTableStandings = useMemo(() => {
    if (seedRankings.length < 6) return [];
    const tableContenders = [seedRankings[2], seedRankings[3], seedRankings[4], seedRankings[5]];

    const structure = tableContenders.reduce((acc, name) => {
      acc[name] = { name, p: 0, w: 0, d: 0, l: 0, gd: 0, pts: 0 };
      return acc;
    }, {});

    ROUND_TABLE_TEMPLATE.forEach((f, idx) => {
      const key = `RT-${idx}`;
      const data = roundTableScores[key];
      if (data && data.played) {
        const p1 = tableContenders[f.p1Idx];
        const p2 = tableContenders[f.p2Idx];
        const s1 = parseInt(data.s1) || 0;
        const s2 = parseInt(data.s2) || 0;

        structure[p1].p += 1; structure[p2].p += 1;
        structure[p1].gd += (s1 - s2); structure[p2].gd += (s2 - s1);

        if (s1 > s2) {
          structure[p1].w += 1; structure[p1].pts += 3;
          structure[p2].l += 1;
        } else if (s2 > s1) {
          structure[p2].w += 1; structure[p2].pts += 3;
          structure[p1].l += 1;
        } else {
          structure[p1].d += 1; structure[p1].pts += 1;
          structure[p2].d += 1; structure[p2].pts += 1;
        }
      }
    });

    return Object.values(structure).sort((a, b) => b.pts - a.pts || b.gd - a.gd || a.name.localeCompare(b.name));
  }, [seedRankings, roundTableScores]);

  const finalFourPairings = useMemo(() => {
    if (seedRankings.length < 2 || intermediateTableStandings.length < 2) {
      return { sf1: ['TBD', 'TBD'], sf2: ['TBD', 'TBD'], final: ['TBD', 'TBD'], champ: 'TBD' };
    }

    const sf1_p1 = seedRankings[0];
    const sf1_p2 = intermediateTableStandings[1]?.name || 'TBD';
    const sf2_p1 = seedRankings[1];
    const sf2_p2 = intermediateTableStandings[0]?.name || 'TBD';

    const getMatchWinner = (scoreNode, fallbackP1, fallbackP2) => {
      if (!scoreNode || !scoreNode.played) return 'TBD';
      const s1 = parseInt(scoreNode.s1) || 0;
      const s2 = parseInt(scoreNode.s2) || 0;
      return s1 > s2 ? fallbackP1 : s2 > s1 ? fallbackP2 : 'TBD';
    };

    const f_p1 = getMatchWinner(knockoutScores.sf1, sf1_p1, sf1_p2);
    const f_p2 = getMatchWinner(knockoutScores.sf2, sf2_p1, sf2_p2);
    const champion = getMatchWinner(knockoutScores.final, f_p1, f_p2);

    return {
      sf1: [sf1_p1, sf1_p2],
      sf2: [sf2_p1, sf2_p2],
      final: [f_p1, f_p2],
      champ: champion
    };
  }, [seedRankings, intermediateTableStandings, knockoutScores]);

  const isStageComplete = () => {
    if (currentStage === STAGES.GROUP_STAGE) {
      return ['A', 'B', 'C'].every(g => 
        [0, 1, 2].every(idx => groupScores[`G-${g}-${idx}`]?.played)
      );
    }
    if (currentStage === STAGES.PLAYOFF_TABLE) {
      return [0, 1, 2, 3, 4, 5].every(idx => roundTableScores[`RT-${idx}`]?.played);
    }
    if (currentStage === STAGES.SEMIFINALS) {
      return knockoutScores.sf1.played && knockoutScores.sf2.played;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-lime-400 selection:text-black">
      <div className="h-1.5 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-500 w-full" />
      
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* HEADER BRANDING */}
        <header className="relative flex flex-col md:flex-row justify-between items-center bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-2xl gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-lime-500/10 text-lime-400 border border-lime-500/20 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">
              🛡️ PERSISTENT STORAGE ACTIVE
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-white italic">
              PRO MATCH <span className="text-lime-400">ENGINE v2</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {Object.keys(STAGES).map((name, val) => (
                <span 
                  key={name}
                  className={`text-[9px] px-2.5 py-1.5 font-bold rounded-lg tracking-wider transition-all ${
                    currentStage === val 
                      ? 'bg-lime-400 text-black font-black' 
                      : 'text-slate-500'
                  }`}
                >
                  {name}
                </span>
              ))}
            </div>

            {/* CRITICAL END TOURNAMENT TERMINATOR BUTTON */}
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
                  placeholder={`Player Name ${idx + 1}`}
                />
              ))}
            </div>
            <button
              onClick={handleShuffleAndLock}
              className="w-full py-4 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-black font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
            >
              🎲 Run Random Allocation & Generate Fixtures
            </button>
          </section>
        )}

        {/* STAGE 1: GROUP OPERATIONS MODULE */}
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
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Inputs Matrix</span>
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

            {currentStage === STAGES.GROUP_STAGE && (
              <button
                disabled={!isStageComplete()}
                onClick={() => setCurrentStage(STAGES.PLAYOFF_TABLE)}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 ${
                  isStageComplete() 
                    ? 'bg-lime-400 text-black shadow-lg cursor-pointer' 
                    : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
                }`}
              >
                {isStageComplete() ? "🔓 Advance to Playoff Round Table (Unlock Seeds 3-6)" : "🔒 Resolve All Group Matches to Advance"}
              </button>
            )}
          </div>
        )}

        {/* STAGE 2: INTERMEDIATE RE-SEEDING ROUND TABLE */}
        {currentStage >= STAGES.PLAYOFF_TABLE && (
          <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-cyan-400 rounded" />
                <h2 className="text-lg font-black uppercase italic tracking-tight text-white">2. Playoff Repêchage Table (Seeds 3-6)</h2>
              </div>
              <div className="bg-slate-950 px-3 py-1 border border-slate-800 rounded text-xs text-slate-400">
                ⭐ <span className="text-lime-400 font-bold">{seedRankings[0]}</span> & <span className="text-lime-400 font-bold">{seedRankings[1]}</span> directly seed into Semifinals
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
                <span className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">Live Table Matrix</span>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="py-2">MANAGER</th>
                      <th className="py-2 text-center">PL</th>
                      <th className="py-2 text-center">GD</th>
                      <th className="py-2 text-right text-cyan-400 font-bold">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {intermediateTableStandings.map((row, idx) => (
                      <tr key={idx} className={idx < 2 ? 'text-cyan-400 font-bold bg-cyan-500/[0.01]' : 'text-slate-500'}>
                        <td className="py-3 text-white font-semibold">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${idx < 2 ? 'bg-cyan-400' : 'bg-slate-800'}`} />
                          {row.name}
                        </td>
                        <td className="py-3 text-center text-slate-400">{row.p}</td>
                        <td className="py-3 text-center font-mono text-slate-400">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                        <td className="py-3 text-right text-slate-200 font-black">{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {currentStage === STAGES.PLAYOFF_TABLE && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-4 border border-slate-800 rounded-xl max-h-[280px] overflow-y-auto">
                  {ROUND_TABLE_TEMPLATE.map((f, idx) => {
                    const key = `RT-${idx}`;
                    const pool = [seedRankings[2], seedRankings[3], seedRankings[4], seedRankings[5]];
                    const p1 = pool[f.p1Idx];
                    const p2 = pool[f.p2Idx];
                    const score = roundTableScores[key] || { s1: '', s2: '' };

                    return (
                      <div key={idx} className="flex flex-col p-2 bg-slate-900 border border-slate-800/60 rounded-lg justify-between space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{f.label}</span>
                        <div className="flex items-center justify-between gap-1 text-xs">
                          <span className="truncate w-16 text-slate-300 font-bold">{p1}</span>
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              value={score.s1}
                              onChange={(e) => setRoundTableScores(p => ({ ...p, [key]: { ...p[key], s1: e.target.value, played: true } }))}
                              className="w-6 h-5 text-center bg-slate-950 text-cyan-400 font-bold border border-slate-800 rounded text-xs"
                            />
                            <span className="text-slate-600">:</span>
                            <input
                              type="number"
                              value={score.s2}
                              onChange={(e) => setRoundTableScores(p => ({ ...p, [key]: { ...p[key], s2: e.target.value, played: true } }))}
                              className="w-6 h-5 text-center bg-slate-950 text-cyan-400 font-bold border border-slate-800 rounded text-xs"
                            />
                          </div>
                          <span className="truncate w-16 text-right text-slate-300 font-bold">{p2}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {currentStage === STAGES.PLAYOFF_TABLE && (
              <button
                disabled={!isStageComplete()}
                onClick={() => setCurrentStage(STAGES.SEMIFINALS)}
                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 ${
                  isStageComplete() 
                    ? 'bg-cyan-400 text-black shadow-lg cursor-pointer' 
                    : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed opacity-50'
                }`}
              >
                {isStageComplete() ? "🔓 Unlock Semifinals Bracket" : "🔒 Complete Round Table Fixtures to Advance"}
              </button>
            )}
          </section>
        )}

        {/* STAGE 3 & 4: CHRONOLOGICAL KNOCKOUT ARENA */}
        {currentStage >= STAGES.SEMIFINALS && (
          <section className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-2xl relative backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-pink-500 rounded" />
              <h2 className="text-xl font-black uppercase tracking-tight italic text-white">3. Final Knockout Stage</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="block text-center text-[10px] font-black tracking-widest text-slate-500 uppercase border-b border-slate-800 pb-2">Semifinal Duels</span>
                
                {/* SF1 Card */}
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
                      <span className="font-bold text-slate-300">{finalFourPairings.sf1[1]} (Table Rank 2)</span>
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

                {/* SF2 Card */}
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
                      <span className="font-bold text-slate-300">{finalFourPairings.sf2[1]} (Table Rank 1)</span>
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
                  <span className="text-[9px] font-black px-2 py-0.5 bg-lime-400 text-black rounded tracking-widest uppercase">MATCH 14 • CONCLUDED</span>
                  
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

                  {finalFourPairings.champ !== 'TBD' && (
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