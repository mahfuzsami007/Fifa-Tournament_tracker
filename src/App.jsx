import React, { useState, useMemo } from 'react';

// Pre-defined initial matchups for 3 players in a group (Round Robin)
const GROUP_MATCH_TEMPLATES = [
  { matchIndex: 0, p1Idx: 0, p2Idx: 1 },
  { matchIndex: 1, p1Idx: 1, p2Idx: 2 },
  { matchIndex: 2, p1Idx: 0, p2Idx: 2 },
];

export default function App() {
  // Player Registration State
  const [players, setPlayers] = useState([
    'Sami', 'Mahfuz', 'Player 3',
    'Player 4', 'Player 5', 'Player 6',
    'Player 7', 'Player 8', 'Player 9'
  ]);

  // Group Stage Scores State
  const [groupScores, setGroupScores] = useState({});

  // Playoff Bracket Scores State
  const [playoffs, setPlayoffs] = useState({
    qf1: { score1: '', score2: '', played: false },
    qf2: { score1: '', score2: '', played: false },
    sf1: { score1: '', score2: '', played: false },
    sf2: { score1: '', score2: '', played: false },
    final: { score1: '', score2: '', played: false },
  });

  const groups = useMemo(() => {
    return {
      A: [players[0], players[1], players[2]],
      B: [players[3], players[4], players[5]],
      C: [players[6], players[7], players[8]],
    };
  }, [players]);

  // Calculate Group Standings
  const standings = useMemo(() => {
    const initStanding = (playerList) =>
      playerList.reduce((acc, player) => {
        acc[player] = { name: player, played: 0, won: 0, drawn: 0, lost: 0, points: 0, gd: 0 };
        return acc;
      }, {});

    const stats = {
      A: initStanding(groups.A),
      B: initStanding(groups.B),
      C: initStanding(groups.C),
    };

    ['A', 'B', 'C'].forEach((gId) => {
      GROUP_MATCH_TEMPLATES.forEach((tmpl, idx) => {
        const key = `group-${gId}-${idx}`;
        const match = groupScores[key];
        if (match && match.played) {
          const p1 = groups[gId][tmpl.p1Idx];
          const p2 = groups[gId][tmpl.p2Idx];
          const s1 = parseInt(match.score1) || 0;
          const s2 = parseInt(match.score2) || 0;

          stats[gId][p1].played += 1;
          stats[gId][p2].played += 1;
          stats[gId][p1].gd += s1 - s2;
          stats[gId][p2].gd += s2 - s1;

          if (s1 > s2) {
            stats[gId][p1].won += 1;
            stats[gId][p1].points += 3;
            stats[gId][p2].lost += 1;
          } else if (s2 > s1) {
            stats[gId][p2].won += 1;
            stats[gId][p2].points += 3;
            stats[gId][p1].lost += 1;
          } else {
            stats[gId][p1].drawn += 1;
            stats[gId][p1].points += 1;
            stats[gId][p2].drawn += 1;
            stats[gId][p2].points += 1;
          }
        }
      });
    });

    const sortStandings = (groupObj) =>
      Object.values(groupObj).sort((a, b) => b.points - a.points || b.gd - a.gd);

    return {
      A: sortStandings(stats.A),
      B: sortStandings(stats.B),
      C: sortStandings(stats.C),
    };
  }, [groups, groupScores]);

  // Seeding the Playoff Bracket (Top 2 from each group)
  const seededPlayers = useMemo(() => {
    const qualifiers = [
      { player: standings.A[0]?.name, group: 'A', rank: 1, pts: standings.A[0]?.points, gd: standings.A[0]?.gd },
      { player: standings.A[1]?.name, group: 'A', rank: 2, pts: standings.A[1]?.points, gd: standings.A[1]?.gd },
      { player: standings.B[0]?.name, group: 'B', rank: 1, pts: standings.B[0]?.points, gd: standings.B[0]?.gd },
      { player: standings.B[1]?.name, group: 'B', rank: 2, pts: standings.B[1]?.points, gd: standings.B[1]?.gd },
      { player: standings.C[0]?.name, group: 'C', rank: 1, pts: standings.C[0]?.points, gd: standings.C[0]?.gd },
      { player: standings.C[1]?.name, group: 'C', rank: 2, pts: standings.C[1]?.points, gd: standings.C[1]?.gd },
    ];

    return qualifiers.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.pts - a.pts || b.gd - a.gd;
    }).map((q) => q.player);
  }, [standings]);

  // Dynamic Playoff Winners Calculation
  const bracketData = useMemo(() => {
    const getWinner = (match, p1, p2) => {
      if (!match.played) return { name: 'TBD', solved: false };
      const s1 = parseInt(match.score1) || 0;
      const s2 = parseInt(match.score2) || 0;
      if (s1 > s2) return { name: p1, solved: true };
      if (s2 > s1) return { name: p2, solved: true };
      return { name: 'TBD', solved: false };
    };

    const qf1Winner = getWinner(playoffs.qf1, seededPlayers[2], seededPlayers[5]);
    const qf2Winner = getWinner(playoffs.qf2, seededPlayers[3], seededPlayers[4]);

    const sf1Winner = getWinner(playoffs.sf1, seededPlayers[0], qf2Winner.name);
    const sf2Winner = getWinner(playoffs.sf2, seededPlayers[1], qf1Winner.name);

    const champion = getWinner(playoffs.final, sf1Winner.name, sf2Winner.name);

    return { qf1Winner, qf2Winner, sf1Winner, sf2Winner, champion };
  }, [seededPlayers, playoffs]);

  const handlePlayerNameChange = (index, value) => {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  };

  const handleGroupScoreChange = (key, field, value) => {
    setGroupScores((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value, played: true },
    }));
  };

  const handlePlayoffScoreChange = (matchKey, field, value) => {
    setPlayoffs((prev) => ({
      ...prev,
      [matchKey]: { ...prev[matchKey], [field]: value, played: true },
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-lime-400 selection:text-black">
      {/* Sporty Top Accent Bar */}
      <div className="h-1.5 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-500 w-full" />

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* HEADER */}
        <header className="relative flex flex-col md:flex-row justify-between items-center bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl -z-10" />
          <div className="text-center md:text-left space-y-1">
            <div className="inline-flex items-center gap-2 bg-lime-500/10 text-lime-400 border border-lime-500/20 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase">
              ⚡ LIVE TRACKER
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-white italic">
              FIFA TOURNAMENT <span className="text-lime-400">HUB</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              9 Contenders • 3 Groups • Single-Elimination Finals
            </p>
          </div>
          <div className="mt-4 md:mt-0 bg-slate-950/80 border border-slate-800 px-6 py-3 rounded-xl text-center">
            <span className="block text-[10px] text-slate-500 font-bold tracking-widest uppercase">Total Fixtures</span>
            <span className="text-2xl font-extrabold text-lime-400 tracking-tight">14 MATCHES</span>
          </div>
        </header>

        {/* SECTION 1: Player Registration */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800/80 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-lime-400 rounded" />
            <h2 className="text-lg font-black uppercase tracking-tight italic text-white">Squad Selection</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {players.map((name, idx) => (
              <div key={idx} className="group relative flex items-center bg-slate-950 border border-slate-800 focus-within:border-lime-400 rounded-xl transition-all duration-200 shadow-md">
                <span className="flex items-center justify-center bg-slate-900 text-slate-400 group-focus-within:text-lime-400 font-bold text-xs px-3 h-full rounded-l-xl border-r border-slate-800">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handlePlayerNameChange(idx, e.target.value)}
                  className="w-full bg-transparent px-4 py-3 text-sm text-white font-semibold focus:outline-none placeholder-slate-600"
                  placeholder={`Enter Competitor ${idx + 1}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: Groups & Standings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {['A', 'B', 'C'].map((gId) => (
            <section key={gId} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-sm group hover:border-slate-700/60 transition-colors">
              <div>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tight">GROUP {gId}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 rounded text-slate-400 uppercase tracking-widest">Table</span>
                </div>
                
                {/* Standings Table */}
                <table className="w-full text-left text-xs mb-6">
                  <thead>
                    <tr className="text-slate-500 font-bold border-b border-slate-800">
                      <th className="py-2">MANAGER</th>
                      <th className="py-2 text-center">P</th>
                      <th className="py-2 text-center">W</th>
                      <th className="py-2 text-center">GD</th>
                      <th className="py-2 text-right text-lime-400 font-black">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {standings[gId].map((row, idx) => (
                      <tr key={idx} className={`group/row ${idx < 2 ? 'text-lime-400 font-bold bg-lime-500/[0.02]' : 'text-slate-400'}`}>
                        <td className="py-2.5 font-semibold truncate max-w-[120px] text-slate-200">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${idx < 2 ? 'bg-lime-400 shadow-[0_0_8px_#ccff00]' : 'bg-slate-700'}`} />
                          {row.name || `P${idx+1}`}
                        </td>
                        <td className="py-2.5 text-center text-slate-400">{row.played}</td>
                        <td className="py-2.5 text-center text-slate-400">{row.won}</td>
                        <td className="py-2.5 text-center font-mono">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                        <td className="py-2.5 text-right font-black text-white">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Group Fixtures */}
              <div className="space-y-2 pt-4 border-t border-slate-800/60">
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Fixtures</span>
                {GROUP_MATCH_TEMPLATES.map((tmpl, idx) => {
                  const key = `group-${gId}-${idx}`;
                  const p1 = groups[gId][tmpl.p1Idx];
                  const p2 = groups[gId][tmpl.p2Idx];
                  const match = groupScores[key] || { score1: '', score2: '' };

                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 bg-slate-950/80 border border-slate-800/60 p-2.5 rounded-xl text-xs transition-colors hover:border-slate-800">
                      <span className="truncate w-24 text-left font-bold text-slate-300">{p1 || 'TBD'}</span>
                      <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                        <input
                          type="number"
                          placeholder="0"
                          value={match.score1}
                          onChange={(e) => handleGroupScoreChange(key, 'score1', e.target.value)}
                          className="w-7 text-center bg-transparent font-black text-lime-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-slate-600 font-bold">:</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={match.score2}
                          onChange={(e) => handleGroupScoreChange(key, 'score2', e.target.value)}
                          className="w-7 text-center bg-transparent font-black text-lime-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <span className="truncate w-24 text-right font-bold text-slate-300">{p2 || 'TBD'}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* SECTION 3: Tournament Bracket */}
        <section className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 -translate-x-1/2" />
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-6 bg-lime-400 rounded" />
            <h2 className="text-xl font-black uppercase tracking-tight italic text-white">Championship Playoff Arena</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* Column 1: Quarterfinals */}
            <div className="space-y-6">
              <div className="text-center font-black text-[11px] uppercase text-slate-500 tracking-widest border-b border-slate-800/80 pb-2 mb-4">Quarterfinals</div>
              
              {/* QF 1 */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3 relative group hover:border-slate-700 transition-colors">
                <div className="text-[9px] font-black tracking-wider text-lime-400 uppercase bg-lime-500/10 px-2 py-0.5 rounded inline-block">MATCH 10 • QF 1</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-300 truncate max-w-[140px]">🏆 {seededPlayers[2] || 'Seed 3'}</span>
                    <input
                      type="number"
                      value={playoffs.qf1.score1}
                      onChange={(e) => handlePlayoffScoreChange('qf1', 'score1', e.target.value)}
                      className="w-9 h-8 text-center bg-slate-900 rounded-xl border border-slate-800 focus:border-lime-400 focus:outline-none font-black text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-300 truncate max-w-[140px]">⚡ {seededPlayers[5] || 'Seed 6'}</span>
                    <input
                      type="number"
                      value={playoffs.qf1.score2}
                      onChange={(e) => handlePlayoffScoreChange('qf1', 'score2', e.target.value)}
                      className="w-9 h-8 text-center bg-slate-900 rounded-xl border border-slate-800 focus:border-lime-400 focus:outline-none font-black text-white"
                    />
                  </div>
                </div>
              </div>

              {/* QF 2 */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3 relative group hover:border-slate-700 transition-colors">
                <div className="text-[9px] font-black tracking-wider text-lime-400 uppercase bg-lime-500/10 px-2 py-0.5 rounded inline-block">MATCH 11 • QF 2</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-300 truncate max-w-[140px]">🏆 {seededPlayers[3] || 'Seed 4'}</span>
                    <input
                      type="number"
                      value={playoffs.qf2.score1}
                      onChange={(e) => handlePlayoffScoreChange('qf2', 'score1', e.target.value)}
                      className="w-9 h-8 text-center bg-slate-900 rounded-xl border border-slate-800 focus:border-lime-400 focus:outline-none font-black text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-300 truncate max-w-[140px]">⚡ {seededPlayers[4] || 'Seed 5'}</span>
                    <input
                      type="number"
                      value={playoffs.qf2.score2}
                      onChange={(e) => handlePlayoffScoreChange('qf2', 'score2', e.target.value)}
                      className="w-9 h-8 text-center bg-slate-900 rounded-xl border border-slate-800 focus:border-lime-400 focus:outline-none font-black text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Semifinals */}
            <div className="space-y-6">
              <div className="text-center font-black text-[11px] uppercase text-slate-500 tracking-widest border-b border-slate-800/80 pb-2 mb-4">Semifinals</div>

              {/* SF 1 */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3 relative group hover:border-slate-700 transition-colors">
                <div className="text-[9px] font-black tracking-wider text-cyan-400 uppercase bg-cyan-500/10 px-2 py-0.5 rounded inline-block">MATCH 12 • SF 1</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-300 truncate max-w-[140px]">⭐ {seededPlayers[0] || 'Seed 1'}</span>
                    <input
                      type="number"
                      value={playoffs.sf1.score1}
                      onChange={(e) => handlePlayoffScoreChange('sf1', 'score1', e.target.value)}
                      className="w-9 h-8 text-center bg-slate-900 rounded-xl border border-slate-800 focus:border-cyan-400 focus:outline-none font-black text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500 truncate max-w-[140px] italic">{bracketData.qf2Winner.name}</span>
                    <input
                      type="number"
                      value={playoffs.sf1.score2}
                      onChange={(e) => handlePlayoffScoreChange('sf1', 'score2', e.target.value)}
                      className="w-9 h-8 text-center bg-slate-900 rounded-xl border border-slate-800 focus:border-cyan-400 focus:outline-none font-black text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SF 2 */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3 relative group hover:border-slate-700 transition-colors">
                <div className="text-[9px] font-black tracking-wider text-cyan-400 uppercase bg-cyan-500/10 px-2 py-0.5 rounded inline-block">MATCH 13 • SF 2</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-300 truncate max-w-[140px]">⭐ {seededPlayers[1] || 'Seed 2'}</span>
                    <input
                      type="number"
                      value={playoffs.sf2.score1}
                      onChange={(e) => handlePlayoffScoreChange('sf2', 'score1', e.target.value)}
                      className="w-9 h-8 text-center bg-slate-900 rounded-xl border border-slate-800 focus:border-cyan-400 focus:outline-none font-black text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500 truncate max-w-[140px] italic">{bracketData.qf1Winner.name}</span>
                    <input
                      type="number"
                      value={playoffs.sf2.score2}
                      onChange={(e) => handlePlayoffScoreChange('sf2', 'score2', e.target.value)}
                      className="w-9 h-8 text-center bg-slate-900 rounded-xl border border-slate-800 focus:border-cyan-400 focus:outline-none font-black text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Grand Finale Box */}
            <div className="flex flex-col justify-center items-center pt-4 md:pt-0">
              <div className="text-center font-black text-[11px] uppercase text-slate-500 tracking-widest border-b border-slate-800/80 pb-2 mb-8 w-full">Championship Final</div>
              
              <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-2xl border-2 border-lime-400 w-full max-w-sm shadow-[0_0_30px_rgba(204,255,0,0.15)] text-center space-y-5">
                <div className="absolute top-0 right-4 transform -translate-y-1/2 bg-lime-400 text-black font-black text-[9px] tracking-widest uppercase px-3 py-0.5 rounded-full shadow-md">
                  MATCH 14
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-slate-200 truncate max-w-[160px]">{bracketData.sf1Winner.name}</span>
                    <input
                      type="number"
                      value={playoffs.final.score1}
                      onChange={(e) => handlePlayoffScoreChange('final', 'score1', e.target.value)}
                      className="w-12 h-9 text-center bg-slate-900 rounded-xl border border-slate-700 text-lime-400 font-black text-lg focus:outline-none focus:border-lime-400"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-slate-200 truncate max-w-[160px]">{bracketData.sf2Winner.name}</span>
                    <input
                      type="number"
                      value={playoffs.final.score2}
                      onChange={(e) => handlePlayoffScoreChange('final', 'score2', e.target.value)}
                      className="w-12 h-9 text-center bg-slate-900 rounded-xl border border-slate-700 text-lime-400 font-black text-lg focus:outline-none focus:border-lime-400"
                    />
                  </div>
                </div>

                {bracketData.champion.solved && (
                  <div className="mt-4 pt-4 border-t border-slate-800 animate-fadeIn">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">🏆 GRAND CHAMPION 🏆</div>
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400 uppercase tracking-tighter italic mt-1 drop-shadow-md">
                      {bracketData.champion.name}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}