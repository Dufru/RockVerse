const medalFor = (index) => {
  if (index === 0) return "1º";
  if (index === 1) return "2º";
  if (index === 2) return "3º";
  return `${index + 1}º`;
};

function RankingCard({ title, items, renderLabel }) {
  return (
    <div className="ranking-card">
      <h4>{title}</h4>
      {items.length === 0 ? <p className="muted">Sem dados ainda.</p> : null}
      <ol>
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>
            <span className="medal">{medalFor(index)}</span>
            <span className="rank-label">{renderLabel(item)}</span>
            <span className="rank-score">{item.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function LeaderboardPanel({ data }) {
  return (
    <section className="leaderboard-panel">
      <h2>Ranking RockVerse</h2>
      <div className="ranking-grid">
        <RankingCard
          title="Usuários que Mais Comentam"
          items={data.usersMostComments || []}
          renderLabel={(item) => `@${item.username}`}
        />
        <RankingCard
          title="Usuários que Mais Amei"
          items={data.usersMostLikes || []}
          renderLabel={(item) => `@${item.username}`}
        />
        <RankingCard
          title="Vídeos Mais Comentados"
          items={data.videosMostCommented || []}
          renderLabel={(item) => item.track?.title || "Vídeo indisponível"}
        />
        <RankingCard
          title="Vídeos Mais Amei"
          items={data.videosMostLoved || []}
          renderLabel={(item) => item.track?.title || "Vídeo indisponível"}
        />
      </div>
    </section>
  );
}
