import React from "react";

interface Props {
  leaderboard: { username: string; score: number }[];
}

const Leaderboard: React.FC<Props> = ({ leaderboard }) => {
  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      <ul>
        {leaderboard.map((p, idx) => (
          <li key={idx}>
            {p.username}: {p.score}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;
