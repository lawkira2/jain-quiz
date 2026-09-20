export default function LeaderboardList({ entries, myId }) {
  return (
    <ol className="leaderboard-list">
      {entries.map((entry) => (
        <li key={entry.id} className={`leaderboard-row ${entry.id === myId ? 'me' : ''}`}>
          <span className={`rank-badge ${entry.rank <= 3 ? `rank-${entry.rank}` : ''}`}>{entry.rank}</span>
          <span className="leaderboard-name">{entry.name}</span>
          <span className="leaderboard-score">{entry.score}</span>
        </li>
      ))}
    </ol>
  );
}
