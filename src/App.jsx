import React, { useState, useMemo } from 'react';

// Pre-defined initial matchups for 3 players in a group (Round Robin)
const GROUP_MATCH_TEMPLATES = [
  { matchIndex: 0, p1Idx: 0, p2Idx: 1 }, // Player 1 vs Player 2
  { matchIndex: 1, p1Idx: 1, p2Idx: 2 }, // Player 2 vs Player 3
  { matchIndex: 2, p1Idx: 0, p2Idx: 2 }, // Player 1 vs Player 3
];

export default function App() {
  // Step 1: Player Registration
  const [players, setPlayers] = useState([
    'Player 1', 'Player 2', 'Player 3',
    'Player 4', 'Player 5', 'Player 6',
    'Player 7', 'Player 8', 'Player 9'
  ]);

  // Step 2: Group Stage Scores
  // Format: { matchKey: { score1: number, score2: number, played: boolean } }
  // matchKey format: "group-[A|B|C]-[0|1|2]"
  const [groupScores, setGroupScores] = useState({});

  // Step 3: Playoff Bracket Scores
  // Playoff keys: 'qf1', 'qf2', 'sf1', 'sf2', 'final'
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

    // Process Group Matches
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

    // Sort function: Points -> Goal Difference -> Name
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
    // Gather 2 qualifiers from each group
    const qualifiers = [
      { player: standings.A[0]?.name, group: 'A', rank: 1, pts: standings.A[0]?.points, gd: standings.A[0]?.gd },
      { player: standings.A[1]?.name, group: 'A', rank: 2, pts: standings.A[1]?.points, gd: standings.A[1]?.gd },
      { player: standings.B[0]?.name, group: 'B', rank: 1, pts: standings.B[0]?.points, gd: standings.B[0]?.gd },
      { player: standings.B[1]?.name, group: 'B', rank: 2, pts: standings.B[1]?.points, gd: standings.B[1]?.gd },
      { player: standings.C[0]?.name, group: 'C', rank: 1, pts: standings.C[0]?.points, gd: standings.C[0]?.gd },
      { player: standings.C[1]?.name, group: 'C', rank: 2, pts: standings.C[1]?.points, gd: standings.C[1]?.gd },
    ];

    // Sort qualifiers to find overall seed ranking (1-6)
    // First-placed teams (rank 1) always seed higher than second-placed teams (rank 2)
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
      return { name: `${p1}/${p2} (Tiebreaker)`, solved: false }; // Requires clear winner
    };

    const qf1Winner = getWinner(playoffs.qf1, seededPlayers[2], seededPlayers[5]); // Seed 3 vs Seed 6
    const qf2Winner = getWinner(playoffs.qf2, seededPlayers[3], seededPlayers[4]); // Seed 4 vs Seed 5

    const sf1Winner = getWinner(playoffs.sf1, seededPlayers[0], qf2Winner.name); // Seed 1 vs Winner QF2
    const sf2Winner = getWinner(playoffs.sf2, seededPlayers[1], qf1Winner.name); // Seed 2 vs Winner QF1

    const champion = getWinner(playoffs.final, sf1Winner.name, sf2Winner.name);

    return {
      qf1Winner,
      qf2Winner,
      sf1Winner,
      sf2Winner,
      champion,
    };
  }, [seededPlayers, playoffs]);

  // Handlers
  const handlePlayerNameChange = (index, value) => {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  };

  const handleGroupScoreChange = (key, field, value) => {
    setGroupScores((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
        played: true,
      },
    }));
  };

  const handlePlayoffScoreChange = (matchKey, field, value) => {
    setPlayoffs((prev) => ({
      ...prev,
      [matchKey]: {
        ...prev[matchKey],
        [field]: value,
        played: true,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
            Tournament Arena Manager
          </h1>
          <p className="text-gray-400 mt-2">9 Players • 3 Groups • 14 Matches Max to Champion</p>
        </header>

        {/* SECTION 1: Player Registration */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold text-orange-400 mb-4">1. Register Players</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {players.map((name, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-gray-500 text-sm w-6">P{idx + 1}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handlePlayerNameChange(idx, e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 focus:outline-none focus:border-orange-500 text-sm text-gray-200"
                />
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: Groups & Group Matches */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {['A', 'B', 'C'].map((gId, gIdx) => (
            <section key={gId} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-orange-400 mb-3">Group {gId}</h2>
                {/* Standings Table */}
                <table className="w-full text-left text-xs mb-6">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="py-1">Player</th>
                      <th className="py-1 text-center">PL</th>
                      <th className="py-1 text-center">W</th>
                      <th className="py-1 text-center">GD</th>
                      <th className="py-1 text-center font-bold">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings[gId].map((row, idx) => (
                      <tr key={idx} className={`border-b border-gray-800 ${idx < 2 ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>
                        <td className="py-1.5 truncate max-w-[100px]">{row.name}</td>
                        <td className="py-1.5 text-center">{row.played}</td>
                        <td className="py-1.5 text-center">{row.won}</td>
                        <td className="py-1.5 text-center">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                        <td className="py-1.5 text-center font-bold">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Group Fixtures */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Matches</h3>
                <div className="space-y-2">
                  {GROUP_MATCH_TEMPLATES.map((tmpl, idx) => {
                    const key = `group-${gId}-${idx}`;
                    const p1 = groups[gId][tmpl.p1Idx];
                    const p2 = groups[gId][tmpl.p2Idx];
                    const match = groupScores[key] || { score1: '', score2: '' };

                    return (
                      <div key={idx} className="flex items-center justify-between gap-2 bg-gray-950 p-2 rounded text-xs">
                        <span className="truncate w-24 text-left">{p1}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="0"
                            value={match.score1}
                            onChange={(e) => handleGroupScoreChange(key, 'score1', e.target.value)}
                            className="w-8 text-center bg-gray-800 border border-gray-700 rounded text-gray-100 py-0.5 focus:outline-none"
                          />
                          <span className="text-gray-500">:</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={match.score2}
                            onChange={(e) => handleGroupScoreChange(key, 'score2', e.target.value)}
                            className="w-8 text-center bg-gray-800 border border-gray-700 rounded text-gray-100 py-0.5 focus:outline-none"
                          />
                        </div>
                        <span className="truncate w-24 text-right">{p2}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* SECTION 3: Dynamic Playoff Brackets */}
        <section className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold text-orange-400 mb-6">2. Playoff Bracket</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch relative">
            
            {/* Column 1: Quarterfinals */}
            <div className="flex flex-col justify-around space-y-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Quarterfinals</h3>
              
              {/* QF 1: Seed 3 vs Seed 6 */}
              <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-3">
                <div className="text-[10px] text-orange-400 font-bold uppercase">Match 10 (QF 1)</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 truncate max-w-[120px]">Seed 3: {seededPlayers[2] || 'TBD'}</span>
                    <input
                      type="number"
                      value={playoffs.qf1.score1}
                      onChange={(e) => handlePlayoffScoreChange('qf1', 'score1', e.target.value)}
                      className="w-10 text-center bg-gray-800 rounded border border-gray-700 py-0.5"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 truncate max-w-[120px]">Seed 6: {seededPlayers[5] || 'TBD'}</span>
                    <input
                      type="number"
                      value={playoffs.qf1.score2}
                      onChange={(e) => handlePlayoffScoreChange('qf1', 'score2', e.target.value)}
                      className="w-10 text-center bg-gray-800 rounded border border-gray-700 py-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* QF 2: Seed 4 vs Seed 5 */}
              <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-3">
                <div className="text-[10px] text-orange-400 font-bold uppercase">Match 11 (QF 2)</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 truncate max-w-[120px]">Seed 4: {seededPlayers[3] || 'TBD'}</span>
                    <input
                      type="number"
                      value={playoffs.qf2.score1}
                      onChange={(e) => handlePlayoffScoreChange('qf2', 'score1', e.target.value)}
                      className="w-10 text-center bg-gray-800 rounded border border-gray-700 py-0.5"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 truncate max-w-[120px]">Seed 5: {seededPlayers[4] || 'TBD'}</span>
                    <input
                      type="number"
                      value={playoffs.qf2.score2}
                      onChange={(e) => handlePlayoffScoreChange('qf2', 'score2', e.target.value)}
                      className="w-10 text-center bg-gray-800 rounded border border-gray-700 py-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Semifinals */}
            <div className="flex flex-col justify-around space-y-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Semifinals</h3>

              {/* SF 1: Seed 1 vs Winner QF 2 */}
              <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-3">
                <div className="text-[10px] text-orange-400 font-bold uppercase">Match 12 (SF 1)</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 truncate max-w-[120px]">Seed 1: {seededPlayers[0] || 'TBD'}</span>
                    <input
                      type="number"
                      value={playoffs.sf1.score1}
                      onChange={(e) => handlePlayoffScoreChange('sf1', 'score1', e.target.value)}
                      className="w-10 text-center bg-gray-800 rounded border border-gray-700 py-0.5"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 truncate max-w-[120px]">Winner QF2: {bracketData.qf2Winner.name}</span>
                    <input
                      type="number"
                      value={playoffs.sf1.score2}
                      onChange={(e) => handlePlayoffScoreChange('sf1', 'score2', e.target.value)}
                      className="w-10 text-center bg-gray-800 rounded border border-gray-700 py-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* SF 2: Seed 2 vs Winner QF 1 */}
              <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 space-y-3">
                <div className="text-[10px] text-orange-400 font-bold uppercase">Match 13 (SF 2)</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 truncate max-w-[120px]">Seed 2: {seededPlayers[1] || 'TBD'}</span>
                    <input
                      type="number"
                      value={playoffs.sf2.score1}
                      onChange={(e) => handlePlayoffScoreChange('sf2', 'score1', e.target.value)}
                      className="w-10 text-center bg-gray-800 rounded border border-gray-700 py-0.5"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 truncate max-w-[120px]">Winner QF1: {bracketData.qf1Winner.name}</span>
                    <input
                      type="number"
                      value={playoffs.sf2.score2}
                      onChange={(e) => handlePlayoffScoreChange('sf2', 'score2', e.target.value)}
                      className="w-10 text-center bg-gray-800 rounded border border-gray-700 py-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Grand Final */}
            <div className="flex flex-col justify-center items-center">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">Grand Final</h3>
              
              <div className="bg-gray-950 p-6 rounded-xl border-2 border-orange-500 w-full max-w-xs text-center space-y-4 shadow-xl">
                <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Match 14 (Championship)</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300 font-medium truncate max-w-[120px]">{bracketData.sf1Winner.name}</span>
                    <input
                      type="number"
                      value={playoffs.final.score1}
                      onChange={(e) => handlePlayoffScoreChange('final', 'score1', e.target.value)}
                      className="w-12 text-center bg-gray-800 rounded border border-gray-700 py-1"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300 font-medium truncate max-w-[120px]">{bracketData.sf2Winner.name}</span>
                    <input
                      type="number"
                      value={playoffs.final.score2}
                      onChange={(e) => handlePlayoffScoreChange('final', 'score2', e.target.value)}
                      className="w-12 text-center bg-gray-800 rounded border border-gray-700 py-1"
                    />
                  </div>
                </div>

                {bracketData.champion.solved && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Tournament Winner</div>
                    <div className="text-xl font-black text-green-400 animate-bounce mt-1">
                      🏆 {bracketData.champion.name}
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