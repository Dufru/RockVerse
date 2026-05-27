import { useEffect, useMemo, useRef, useState } from "react";
import { COVER_CATALOG } from "../config/coverCatalog";

const VISIBLE_CARDS = 4;

export function MediaRow({ title, items = [], onOpenPlayer, autoScrollMs = 4200 }) {
  // Carrossel no estilo streaming: 4 cards visíveis, snap por card e loop suave.
  const viewportRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const dragState = useRef({
    active: false,
    startX: 0,
    startLeft: 0,
    moved: false
  });

  const canLoop = items.length > VISIBLE_CARDS;
  const loopItems = useMemo(() => {
    if (!items.length) return [];
    return canLoop ? [...items, ...items] : items;
  }, [items, canLoop]);

  const getCardStep = () => {
    const viewport = viewportRef.current;
    if (!viewport) return 280;

    const first = viewport.querySelector(".media-card-wrap");
    if (!first) return 280;

    const second = first.nextElementSibling;
    if (second) return second.offsetLeft - first.offsetLeft;

    const styles = getComputedStyle(viewport);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "16") || 16;
    return first.getBoundingClientRect().width + gap;
  };

  const getLoopWidth = () => {
    if (!canLoop || !items.length) return 0;
    return getCardStep() * items.length;
  };

  const normalizeLoop = () => {
    const viewport = viewportRef.current;
    if (!viewport || !canLoop) return;

    const step = getCardStep();
    const loopWidth = getLoopWidth();
    if (!step || !loopWidth) return;

    if (viewport.scrollLeft >= loopWidth * 2 - step * 0.5) viewport.scrollLeft -= loopWidth;
    if (viewport.scrollLeft < step * 0.5) viewport.scrollLeft += loopWidth;
  };

  const snapToClosestCard = (behavior = "smooth") => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const step = getCardStep();
    if (!step) return;

    const snapped = Math.round(viewport.scrollLeft / step) * step;
    viewport.scrollTo({ left: snapped, behavior });
  };

  const scrollOneCard = (direction) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    normalizeLoop();
    const step = getCardStep();
    viewport.scrollBy({ left: direction * step, behavior: "smooth" });

    setTimeout(() => {
      normalizeLoop();
      snapToClosestCard("auto");
    }, 300);
  };

  const onMouseDown = (event) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    dragState.current.active = true;
    dragState.current.moved = false;
    dragState.current.startX = event.clientX;
    dragState.current.startLeft = viewport.scrollLeft;
    viewport.classList.add("dragging");
  };

  const onMouseMove = (event) => {
    const viewport = viewportRef.current;
    if (!viewport || !dragState.current.active) return;

    const delta = event.clientX - dragState.current.startX;
    if (Math.abs(delta) > 3) dragState.current.moved = true;

    viewport.scrollLeft = dragState.current.startLeft - delta;
    normalizeLoop();
  };

  const stopDrag = () => {
    const viewport = viewportRef.current;
    if (viewport && dragState.current.moved) {
      normalizeLoop();
      snapToClosestCard("smooth");
      setTimeout(normalizeLoop, 220);
    }

    dragState.current.active = false;
    if (viewport) viewport.classList.remove("dragging");
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (canLoop) {
      requestAnimationFrame(() => {
        const loopWidth = getLoopWidth();
        if (loopWidth > 0) {
          viewport.scrollLeft = loopWidth;
          snapToClosestCard("auto");
        }
      });
      return;
    }

    viewport.scrollLeft = 0;
  }, [canLoop, items.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !canLoop) return undefined;

    const timer = setInterval(() => {
      if (hovering || dragState.current.active) return;
      scrollOneCard(1);
    }, autoScrollMs);

    return () => clearInterval(timer);
  }, [autoScrollMs, canLoop, hovering]);

  if (!items.length) return null;

  return (
    <section className="media-row">
      <div className="row-header">
        <h3>{title}</h3>
      </div>

      <div
        className="media-row-shell"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          type="button"
          className="row-nav row-nav-left"
          onClick={() => scrollOneCard(-1)}
          aria-label={`Voltar ${title}`}
          disabled={!canLoop}
        >
          {"<"}
        </button>

        <div
          ref={viewportRef}
          className="media-scroll"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          {loopItems.map((item, index) => (
            <div className="media-card-wrap" key={`${item._id}-${index}`}>
              <article
                className="media-card"
                onClick={() => {
                  if (dragState.current.moved) return;
                  onOpenPlayer(item);
                }}
              >
                <img
                  src={item.coverImage}
                  alt={`${item.title} - ${item.artist}`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = COVER_CATALOG.bySubgenre[item.subgenre] || COVER_CATALOG.fallbackCover;
                  }}
                />
                <div className="media-gradient" />
                <div className="media-info">
                  <strong>{item.title}</strong>
                  <span>{item.artist}</span>
                  <small>
                    {item.subgenre || "rock"} | {item.genre || "Rock"}
                  </small>
                </div>
                <button type="button" className="card-action">
                  Abrir player
                </button>
              </article>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="row-nav row-nav-right"
          onClick={() => scrollOneCard(1)}
          aria-label={`Avançar ${title}`}
          disabled={!canLoop}
        >
          {">"}
        </button>
      </div>
    </section>
  );
}
