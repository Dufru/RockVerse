import { useEffect, useMemo, useState } from "react";

export function HeroRotator({ featured, highlights, settings, onOpenPlayer }) {
  // Hero no estilo streaming: junta destaque principal + rotação automática configurada pelo Admin.
  const items = useMemo(() => {
    const base = highlights?.length ? highlights : featured ? [featured] : [];
    if (!base.length) return [];

    const unique = [];
    const seen = new Set();
    for (const item of [featured, ...base].filter(Boolean)) {
      if (seen.has(item._id)) continue;
      seen.add(item._id);
      unique.push(item);
    }

    return unique;
  }, [featured, highlights]);

  const [index, setIndex] = useState(0);
  const intervalMs = Math.max(4000, Number(settings?.heroAutoRotateSeconds || 10) * 1000);

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % items.length), intervalMs);
    return () => clearInterval(timer);
  }, [items.length, intervalMs]);

  const active = items[index];
  if (!active) {
    return (
      <section className="hero-empty">
        <h2>Carregando destaque principal...</h2>
      </section>
    );
  }

  return (
    <section className="hero-banner" style={{ backgroundImage: `url(${active.bannerImage || active.coverImage})` }}>
      <div className="hero-overlay" />
      <div className="hero-content">
        <small className="pill">{active.mediaType === "live_show" ? "Show ao Vivo" : "Álbum Clássico"}</small>
        <h2>{active.title}</h2>
        <h3>{active.artist}</h3>
        <p>{active.description || "O melhor do rock em uma experiência simples e imersiva."}</p>

        <div className="hero-meta">
          <span>{active.genre || "Rock"}</span>
          <span>{active.subgenre || "rock"}</span>
          <span>{active.year || "N/A"}</span>
          <span>{Number(active.lovesCount || 0)} amei</span>
        </div>

        <button onClick={() => onOpenPlayer(active)}>Assistir agora</button>
      </div>

      <div className="hero-dots">
        {items.map((item, dotIndex) => (
          <button
            key={item._id}
            type="button"
            className={dotIndex === index ? "dot active" : "dot"}
            aria-label={`Destaque ${dotIndex + 1}`}
            onClick={() => setIndex(dotIndex)}
          />
        ))}
      </div>
    </section>
  );
}
