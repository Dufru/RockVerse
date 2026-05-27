import { useEffect, useMemo, useState } from "react";
import { request } from "../api";

const blankTrack = {
  title: "",
  artist: "",
  album: "",
  genre: "Rock",
  subgenre: "metal",
  mediaType: "live_show",
  youtubeVideoId: "",
  youtubeUrl: "",
  coverImage: "",
  bannerImage: "",
  description: "",
  year: new Date().getFullYear()
};

function Field({ title, help, children }) {
  return (
    <label className="admin-field">
      <span>{title}</span>
      {help ? <small>{help}</small> : null}
      {children}
    </label>
  );
}

export function AdminPage() {
  // Página focada em operação: cadastrar, ajustar destaques e editar/remover vídeos.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tracks, setTracks] = useState([]);
  const [trackForm, setTrackForm] = useState(blankTrack);
  const [editingTrackId, setEditingTrackId] = useState("");
  const [editingTrack, setEditingTrack] = useState(blankTrack);
  const [highlightConfig, setHighlightConfig] = useState({
    featuredTrackId: "",
    highlightTrackIds: [],
    heroAutoRotateSeconds: 10,
    heroMaxCount: 5
  });

  const loadAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [tracksRes, highlightsRes] = await Promise.all([request("/admin/tracks"), request("/admin/highlights")]);

      setTracks(tracksRes.items || []);
      setHighlightConfig({
        featuredTrackId: highlightsRes.config?.featuredTrackId ? String(highlightsRes.config.featuredTrackId) : "",
        highlightTrackIds: (highlightsRes.config?.highlightTrackIds || []).map((id) => String(id)),
        heroAutoRotateSeconds: Number(highlightsRes.config?.heroAutoRotateSeconds || 10),
        heroMaxCount: Number(highlightsRes.config?.heroMaxCount || 5)
      });
    } catch (err) {
      setError(err.message || "Falha ao carregar painel admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const tracksMap = useMemo(() => new Map(tracks.map((track) => [String(track._id), track])), [tracks]);

  const submitTrack = async (event) => {
    event.preventDefault();
    await request("/admin/tracks", {
      method: "POST",
      body: JSON.stringify(trackForm)
    });
    setTrackForm(blankTrack);
    await loadAll();
  };

  const saveTrackEdit = async () => {
    if (!editingTrackId) return;

    await request(`/admin/tracks/${editingTrackId}`, {
      method: "PUT",
      body: JSON.stringify(editingTrack)
    });

    setEditingTrackId("");
    await loadAll();
  };

  const saveHighlights = async () => {
    await request("/admin/highlights", {
      method: "PUT",
      body: JSON.stringify(highlightConfig)
    });

    await loadAll();
  };

  if (loading) return <div className="status-box">Carregando painel admin...</div>;

  return (
    <section className="admin-page">
      <h2>Painel Admin</h2>
      {error ? <div className="status-box error">{error}</div> : null}

      <article className="admin-card">
        <h3>Adicionar Vídeo</h3>
        <p className="muted admin-help">Preencha os campos abaixo para criar um novo item no catálogo principal.</p>

        <form onSubmit={submitTrack} className="admin-form">
          <div className="admin-grid">
            <Field title="Título" help="Nome que aparece nos cards e no player.">
              <input placeholder="Ex.: Live in Texas" value={trackForm.title} onChange={(event) => setTrackForm({ ...trackForm, title: event.target.value })} required />
            </Field>

            <Field title="Banda / Artista" help="Quem será exibido como autor do conteúdo.">
              <input placeholder="Ex.: Linkin Park" value={trackForm.artist} onChange={(event) => setTrackForm({ ...trackForm, artist: event.target.value })} required />
            </Field>

            <Field title="Álbum" help="Opcional, usado para contexto da obra.">
              <input placeholder="Ex.: Meteora" value={trackForm.album} onChange={(event) => setTrackForm({ ...trackForm, album: event.target.value })} />
            </Field>

            <Field title="Gênero" help="Texto livre para exibir no player.">
              <input placeholder="Ex.: Nu Metal" value={trackForm.genre} onChange={(event) => setTrackForm({ ...trackForm, genre: event.target.value })} />
            </Field>

            <Field title="Categoria" help="Define em qual trilha da Home pode aparecer.">
              <select value={trackForm.subgenre} onChange={(event) => setTrackForm({ ...trackForm, subgenre: event.target.value })}>
                <option value="metal">metal</option>
                <option value="grunge">grunge</option>
                <option value="punk">punk</option>
                <option value="hard">hard</option>
                <option value="classic">classic</option>
                <option value="prog">prog</option>
                <option value="alt">alt</option>
                <option value="indie">indie</option>
              </select>
            </Field>

            <Field title="Tipo" help="Show ao vivo ou álbum clássico.">
              <select value={trackForm.mediaType} onChange={(event) => setTrackForm({ ...trackForm, mediaType: event.target.value })}>
                <option value="live_show">live_show</option>
                <option value="classic_album">classic_album</option>
              </select>
            </Field>

            <Field title="YouTube Video ID" help="ID curto do vídeo (mais confiável para embed).">
              <input placeholder="Ex.: dQw4w9WgXcQ" value={trackForm.youtubeVideoId} onChange={(event) => setTrackForm({ ...trackForm, youtubeVideoId: event.target.value })} />
            </Field>

            <Field title="Link do YouTube" help="URL completa como alternativa ao ID.">
              <input placeholder="https://www.youtube.com/watch?v=..." value={trackForm.youtubeUrl} onChange={(event) => setTrackForm({ ...trackForm, youtubeUrl: event.target.value })} />
            </Field>

            <Field title="URL da capa" help="Imagem vertical do card.">
              <input placeholder="https://..." value={trackForm.coverImage} onChange={(event) => setTrackForm({ ...trackForm, coverImage: event.target.value })} />
            </Field>

            <Field title="URL do banner" help="Imagem grande do destaque principal.">
              <input placeholder="https://..." value={trackForm.bannerImage} onChange={(event) => setTrackForm({ ...trackForm, bannerImage: event.target.value })} />
            </Field>
          </div>

          <Field title="Descrição" help="Texto de contexto usado na Hero e no Player.">
            <textarea rows="3" placeholder="Conte um pouco sobre o show/álbum..." value={trackForm.description} onChange={(event) => setTrackForm({ ...trackForm, description: event.target.value })} />
          </Field>

          <button type="submit">Adicionar vídeo</button>
        </form>
      </article>

      <article className="admin-card">
        <h3>Destaques da Home</h3>
        <p className="muted admin-help">
          Esta área controla o banner principal e a rotação automática de destaques da página inicial.
        </p>

        <div className="admin-grid">
          <Field title="Destaque principal" help="Vídeo que abre no topo da Home.">
            <select
              value={highlightConfig.featuredTrackId}
              onChange={(event) => setHighlightConfig({ ...highlightConfig, featuredTrackId: event.target.value })}
            >
              <option value="">Selecionar</option>
              {tracks.map((track) => (
                <option key={track._id} value={track._id}>
                  {track.title} - {track.artist}
                </option>
              ))}
            </select>
          </Field>

          <Field title="Rotação (segundos)" help="Tempo para trocar de destaque automaticamente.">
            <input
              type="number"
              min="4"
              value={highlightConfig.heroAutoRotateSeconds}
              onChange={(event) =>
                setHighlightConfig({ ...highlightConfig, heroAutoRotateSeconds: Number(event.target.value) || 10 })
              }
            />
          </Field>

          <Field title="Quantidade de destaques" help="Número máximo de itens na rotação.">
            <input
              type="number"
              min="1"
              max="10"
              value={highlightConfig.heroMaxCount}
              onChange={(event) =>
                setHighlightConfig({ ...highlightConfig, heroMaxCount: Number(event.target.value) || 5 })
              }
            />
          </Field>
        </div>

        <p className="muted admin-help">Selecione abaixo quais vídeos entram no carrossel de destaque:</p>
        <div className="admin-tags-list">
          {tracks.map((track) => {
            const checked = highlightConfig.highlightTrackIds.includes(String(track._id));
            return (
              <label key={track._id} className={checked ? "chip active" : "chip"}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setHighlightConfig({
                        ...highlightConfig,
                        highlightTrackIds: [...highlightConfig.highlightTrackIds, String(track._id)]
                      });
                      return;
                    }

                    setHighlightConfig({
                      ...highlightConfig,
                      highlightTrackIds: highlightConfig.highlightTrackIds.filter((id) => id !== String(track._id))
                    });
                  }}
                />
                {track.title}
              </label>
            );
          })}
        </div>

        <button onClick={saveHighlights}>Salvar destaques</button>
      </article>

      <article className="admin-card">
        <h3>Gerenciar Vídeos</h3>
        <p className="muted admin-help">Edite rapidamente um item já cadastrado ou remova do catálogo.</p>

        <div className="admin-list">
          {tracks.map((track) => (
            <div key={track._id} className="admin-row">
              <div>
                <strong>{track.title}</strong>
                <small>{track.artist}</small>
              </div>

              <div className="admin-row-actions">
                <button
                  className="ghost-button"
                  onClick={() => {
                    setEditingTrackId(String(track._id));
                    setEditingTrack({
                      title: track.title || "",
                      artist: track.artist || "",
                      album: track.album || "",
                      genre: track.genre || "Rock",
                      subgenre: track.subgenre || "metal",
                      mediaType: track.mediaType || "live_show",
                      youtubeVideoId: track.youtubeVideoId || "",
                      youtubeUrl: track.youtubeUrl || "",
                      coverImage: track.coverImage || "",
                      bannerImage: track.bannerImage || "",
                      description: track.description || "",
                      year: track.year || new Date().getFullYear()
                    });
                  }}
                >
                  Editar
                </button>

                <button
                  className="ghost-button danger"
                  onClick={async () => {
                    await request(`/admin/tracks/${track._id}`, { method: "DELETE" });
                    await loadAll();
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        {editingTrackId ? (
          <div className="admin-edit-box">
            <h4>Editando: {tracksMap.get(editingTrackId)?.title}</h4>
            <div className="admin-grid">
              <Field title="Título">
                <input value={editingTrack.title} onChange={(event) => setEditingTrack({ ...editingTrack, title: event.target.value })} />
              </Field>
              <Field title="Banda / Artista">
                <input value={editingTrack.artist} onChange={(event) => setEditingTrack({ ...editingTrack, artist: event.target.value })} />
              </Field>
              <Field title="YouTube Video ID">
                <input value={editingTrack.youtubeVideoId} onChange={(event) => setEditingTrack({ ...editingTrack, youtubeVideoId: event.target.value })} />
              </Field>
              <Field title="Link do YouTube">
                <input value={editingTrack.youtubeUrl} onChange={(event) => setEditingTrack({ ...editingTrack, youtubeUrl: event.target.value })} />
              </Field>
              <Field title="URL da capa">
                <input value={editingTrack.coverImage} onChange={(event) => setEditingTrack({ ...editingTrack, coverImage: event.target.value })} />
              </Field>
              <Field title="URL do banner">
                <input value={editingTrack.bannerImage} onChange={(event) => setEditingTrack({ ...editingTrack, bannerImage: event.target.value })} />
              </Field>
              <Field title="Categoria">
                <select value={editingTrack.subgenre} onChange={(event) => setEditingTrack({ ...editingTrack, subgenre: event.target.value })}>
                  <option value="metal">metal</option>
                  <option value="grunge">grunge</option>
                  <option value="punk">punk</option>
                  <option value="hard">hard</option>
                  <option value="classic">classic</option>
                  <option value="prog">prog</option>
                  <option value="alt">alt</option>
                  <option value="indie">indie</option>
                </select>
              </Field>
              <Field title="Tipo">
                <select value={editingTrack.mediaType} onChange={(event) => setEditingTrack({ ...editingTrack, mediaType: event.target.value })}>
                  <option value="live_show">live_show</option>
                  <option value="classic_album">classic_album</option>
                </select>
              </Field>
            </div>

            <Field title="Descrição">
              <textarea rows="3" value={editingTrack.description} onChange={(event) => setEditingTrack({ ...editingTrack, description: event.target.value })} />
            </Field>

            <div className="admin-row-actions">
              <button onClick={saveTrackEdit}>Salvar edição</button>
              <button className="ghost-button" onClick={() => setEditingTrackId("")}>Cancelar</button>
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );
}
