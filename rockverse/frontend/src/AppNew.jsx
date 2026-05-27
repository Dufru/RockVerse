import { useEffect, useState } from "react";
import { request } from "./api";
import { withVisualFallback } from "./config/coverCatalog";
import { AuthScreen } from "./components/AuthScreen";
import { HeroRotator } from "./components/HeroRotator";
import { MediaRow } from "./components/MediaRow";
import { PlayerModal } from "./components/PlayerModal";
import { LeaderboardPanel } from "./components/LeaderboardPanel";
import { AdminPage } from "./components/AdminPage";

const normalizeSectionsPayload = (payload) => {
  const sections = (payload.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map(withVisualFallback)
  }));

  const highlights = (payload.highlights || []).map(withVisualFallback);
  const featured = payload.hero
    ? withVisualFallback(payload.hero)
    : highlights[0] || sections.find((row) => row.items.length)?.items[0] || null;

  return {
    featured,
    sections,
    highlights,
    highlightSettings: payload.highlightSettings || { heroAutoRotateSeconds: 10, heroMaxCount: 5 }
  };
};

const fallbackHome = (tracks) => {
  const live = tracks.filter((track) => track.mediaType === "live_show");
  const metal = tracks.filter((track) => track.subgenre === "metal");

  const mostCommented = [...tracks].sort((a, b) => (b.weeklyTrendingScore || 0) - (a.weeklyTrendingScore || 0));
  const mostLoved = [...tracks].sort((a, b) => (b.lovesCount || 0) - (a.lovesCount || 0));

  return {
    featured: live[0] || tracks[0] || null,
    highlights: live.slice(0, 5),
    highlightSettings: { heroAutoRotateSeconds: 10, heroMaxCount: 5 },
    sections: [
      { id: "live-shows", title: "Shows ao Vivo", items: live },
      { id: "metal", title: "Metal", items: metal },
      { id: "most-commented", title: "Mais Comentados", items: mostCommented },
      { id: "most-loved", title: "Mais Amei", items: mostLoved }
    ]
  };
};

const patchTrackInsideHome = (homeState, trackId, patch) => ({
  ...homeState,
  featured: homeState.featured?._id === trackId ? { ...homeState.featured, ...patch } : homeState.featured,
  highlights: homeState.highlights.map((item) => (item._id === trackId ? { ...item, ...patch } : item)),
  sections: homeState.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => (item._id === trackId ? { ...item, ...patch } : item))
  }))
});

export default function AppNew() {
  // Esse componente é o "maestro" da interface: ele controla sessão, navegação e carregamento principal.
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("rockverse_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [authDismissed, setAuthDismissed] = useState(Boolean(localStorage.getItem("rockverse_guest")));
  const [activeView, setActiveView] = useState("home");

  const [home, setHome] = useState({
    featured: null,
    sections: [],
    highlights: [],
    highlightSettings: { heroAutoRotateSeconds: 10, heroMaxCount: 5 }
  });

  const [leaderboard, setLeaderboard] = useState({
    usersMostComments: [],
    usersMostLikes: [],
    videosMostCommented: [],
    videosMostLoved: []
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDidRun, setSearchDidRun] = useState(false);

  const [selectedTrack, setSelectedTrack] = useState(null);
  const [comments, setComments] = useState([]);
  const [lovedByUser, setLovedByUser] = useState(false);
  const [loving, setLoving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "admin";

  const syncSessionUser = async () => {
    const token = localStorage.getItem("rockverse_token");
    if (!token) return;

    try {
      const response = await request("/auth/me");
      localStorage.setItem("rockverse_user", JSON.stringify(response.user));
      setUser(response.user);
    } catch {
      localStorage.removeItem("rockverse_token");
      localStorage.removeItem("rockverse_user");
      setUser(null);
    }
  };

  const loadHome = async () => {
    try {
      const response = await request("/tracks/sections");
      setHome(normalizeSectionsPayload(response));
    } catch {
      const fallback = await request("/tracks?limit=60");
      const tracks = (fallback.items || []).map(withVisualFallback);
      setHome(fallbackHome(tracks));
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await request("/tracks/leaderboard");
      setLeaderboard(response);
    } catch {
      setLeaderboard({
        usersMostComments: [],
        usersMostLikes: [],
        videosMostCommented: [],
        videosMostLoved: []
      });
    }
  };

  const runSearch = async (term = "") => {
    setSearchLoading(true);
    setSearchDidRun(true);
    try {
      const query = String(term || "").trim();
      const path = query ? `/tracks?search=${encodeURIComponent(query)}&limit=40` : "/tracks?limit=24";
      const response = await request(path);
      setSearchResults((response.items || []).map(withVisualFallback));
    } finally {
      setSearchLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadHome(), loadLeaderboard()]);
    } catch (err) {
      setError(err.message || "Falha ao carregar o RockVerse.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      await syncSessionUser();
      await refreshData();
    };
    run();
  }, []);

  useEffect(() => {
    if (activeView !== "search") return;
    if (!searchDidRun) runSearch("");
  }, [activeView, searchDidRun]);

  const openPlayer = async (track) => {
    const normalized = withVisualFallback(track);
    setSelectedTrack(normalized);

    const [commentRes] = await Promise.all([
      request(`/tracks/${normalized._id}/comments?limit=70`),
      user
        ? request(`/tracks/${normalized._id}/love-status`)
            .then((res) => {
              setLovedByUser(Boolean(res.loved));
              setSelectedTrack((prev) => (prev ? { ...prev, lovesCount: res.lovesCount } : prev));
            })
            .catch(() => setLovedByUser(false))
        : Promise.resolve(setLovedByUser(false))
    ]);

    setComments(commentRes.items || []);
  };

  const sendComment = async (message) => {
    if (!selectedTrack || !user) return;

    const created = await request(`/tracks/${selectedTrack._id}/comments`, {
      method: "POST",
      body: JSON.stringify({ message })
    });

    setComments((prev) => [...prev, created]);
    await Promise.all([loadHome(), loadLeaderboard(), activeView === "search" ? runSearch(searchTerm) : Promise.resolve()]);
  };

  const toggleLove = async () => {
    if (!selectedTrack || !user || loving) return;

    setLoving(true);
    try {
      const response = await request(`/tracks/${selectedTrack._id}/love/toggle`, { method: "POST" });
      const nextCount = Number(response.lovesCount || 0);
      setLovedByUser(Boolean(response.liked));
      setSelectedTrack((prev) => (prev ? { ...prev, lovesCount: nextCount } : prev));
      setHome((prev) => patchTrackInsideHome(prev, selectedTrack._id, { lovesCount: nextCount }));
      setSearchResults((prev) => prev.map((track) => (track._id === selectedTrack._id ? { ...track, lovesCount: nextCount } : track)));
      await loadLeaderboard();
    } finally {
      setLoving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("rockverse_token");
    localStorage.removeItem("rockverse_user");
    setUser(null);
    setAuthDismissed(false);
    setActiveView("home");
  };

  const onAuth = async (nextUser) => {
    localStorage.setItem("rockverse_user", JSON.stringify(nextUser));
    setUser(nextUser);
    setAuthDismissed(true);
    localStorage.removeItem("rockverse_guest");
    await refreshData();
  };

  const continueAsGuest = () => {
    setAuthDismissed(true);
    localStorage.setItem("rockverse_guest", "1");
  };

  const safeView = activeView === "admin" && !isAdmin ? "home" : activeView;

  if (!user && !authDismissed) {
    return <AuthScreen onAuth={onAuth} onContinueAsGuest={continueAsGuest} />;
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">
          <span>RockVerse</span>
        </div>

        <div className="nav-actions">
          <button className={safeView === "home" ? "nav-active" : ""} onClick={() => setActiveView("home")}>
            Home
          </button>
          <button className={safeView === "search" ? "nav-active" : ""} onClick={() => setActiveView("search")}>
            Pesquisa
          </button>
          <button className={safeView === "leaderboard" ? "nav-active" : ""} onClick={() => setActiveView("leaderboard")}>
            Ranking
          </button>
          {isAdmin ? (
            <button className={safeView === "admin" ? "nav-active" : ""} onClick={() => setActiveView("admin")}>
              Admin
            </button>
          ) : null}
          {user ? (
            <button className="ghost-button" onClick={logout}>
              Sair @{user.username}
            </button>
          ) : (
            <button className="ghost-button" onClick={() => setAuthDismissed(false)}>
              Entrar
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        {loading ? <div className="status-box">Carregando experiência RockVerse...</div> : null}
        {error ? <div className="status-box error">{error}</div> : null}

        {safeView === "home" ? (
          <>
            <HeroRotator
              featured={home.featured}
              highlights={home.highlights}
              settings={home.highlightSettings}
              onOpenPlayer={openPlayer}
            />

            {home.sections.map((section) => (
              <MediaRow key={section.id} title={section.title} items={section.items} onOpenPlayer={openPlayer} />
            ))}
          </>
        ) : null}

        {safeView === "search" ? (
          <section className="search-view">
            <h2>Pesquisa</h2>
            <p className="muted">Busque por título, banda, álbum ou palavra-chave.</p>

            <form
              className="search-form"
              onSubmit={(event) => {
                event.preventDefault();
                runSearch(searchTerm);
              }}
            >
              <input
                value={searchTerm}
                placeholder="Ex.: Metallica, grunge, live..."
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <button type="submit" disabled={searchLoading}>
                {searchLoading ? "Buscando..." : "Buscar"}
              </button>
            </form>

            {searchDidRun && !searchLoading && searchResults.length === 0 ? (
              <div className="status-box">Nenhum vídeo encontrado para essa busca.</div>
            ) : null}

            <div className="search-results-grid">
              {searchResults.map((item) => (
                <article key={item._id} className="search-card" onClick={() => openPlayer(item)}>
                  <img src={item.coverImage} alt={`${item.title} - ${item.artist}`} loading="lazy" />
                  <div className="search-card-overlay" />
                  <div className="search-card-info">
                    <strong>{item.title}</strong>
                    <span>{item.artist}</span>
                    <small>
                      {item.subgenre || "rock"} | ❤ {Number(item.lovesCount || 0)}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {safeView === "leaderboard" ? <LeaderboardPanel data={leaderboard} /> : null}
        {safeView === "admin" ? <AdminPage /> : null}
      </main>

      <PlayerModal
        track={selectedTrack}
        user={user}
        comments={comments}
        lovedByUser={lovedByUser}
        loving={loving}
        onToggleLove={toggleLove}
        onSendComment={sendComment}
        onClose={() => setSelectedTrack(null)}
      />
    </div>
  );
}
