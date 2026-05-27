import { useEffect, useMemo, useState } from "react";

const toEmbedSrc = (track) => {
  const fromId = track?.youtubeVideoId?.trim();
  if (fromId) return `https://www.youtube.com/embed/${fromId}?autoplay=1&rel=0`;

  const url = track?.youtubeUrl || "";
  const match = url.match(/(?:v=|be\/)([a-zA-Z0-9_-]{6,})/);
  if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;

  return "";
};

const formatDate = (value) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });

export function PlayerModal({
  track,
  user,
  comments,
  lovedByUser,
  loving,
  onToggleLove,
  onSendComment,
  onClose
}) {
  // Modal principal de consumo: vídeo + coração + comentários em um único fluxo.
  const [message, setMessage] = useState("");
  const embedSrc = useMemo(() => toEmbedSrc(track), [track]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!track) return null;

  const submitComment = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    await onSendComment(message.trim());
    setMessage("");
  };

  return (
    <div className="player-modal" role="dialog" aria-modal="true">
      <div className="player-backdrop" onClick={onClose} />
      <div className="player-shell">
        <button className="close-modal" onClick={onClose}>
          Fechar
        </button>

        <div className="player-column">
          <div className="player-frame">
            {embedSrc ? (
              <iframe
                src={embedSrc}
                title={`${track.title} - YouTube`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="player-fallback">Sem vídeo configurado para este item.</div>
            )}
          </div>

          <div className="player-details">
            <h3>{track.title}</h3>
            <h4>{track.artist}</h4>
            <p>{track.description || "Sem descrição cadastrada."}</p>

            <div className="player-meta">
              <span>{track.genre || "Rock"}</span>
              <span>{track.subgenre || "rock"}</span>
              <span>{track.year || "N/A"}</span>
            </div>

            <button
              className={lovedByUser ? "love-pill active" : "love-pill"}
              disabled={!user || loving}
              onClick={onToggleLove}
              aria-pressed={lovedByUser}
            >
              <span className="love-icon" aria-hidden="true">
                ❤
              </span>
              <span className="love-count">{Number(track.lovesCount || 0)}</span>
            </button>

            {!user ? <small>Faça login para comentar e marcar amei.</small> : null}
          </div>
        </div>

        <aside className="chat-column">
          <header>
            <h4>Comentários</h4>
            <small>{comments.length} mensagens</small>
          </header>

          <div className="chat-list">
            {comments.map((comment) => (
              <article key={comment._id} className="chat-message">
                <div className="chat-top">
                  <strong>@{comment.user?.username || "anonimo"}</strong>
                  <small>{formatDate(comment.createdAt)}</small>
                </div>
                <p>{comment.message}</p>
              </article>
            ))}
            {comments.length === 0 ? <div className="chat-empty">Seja o primeiro a comentar.</div> : null}
          </div>

          <form className="chat-form" onSubmit={submitComment}>
            <input
              placeholder={user ? "Comente o show ao vivo..." : "Entre para comentar"}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={!user}
            />
            <button type="submit" disabled={!user}>
              Enviar
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
