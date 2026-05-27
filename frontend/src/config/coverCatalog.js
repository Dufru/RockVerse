export const COVER_CATALOG = {
  fallbackCover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=720&q=80",
  fallbackBanner: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80",
  bySubgenre: {
    metal: "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=720&q=80",
    grunge: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=720&q=80",
    punk: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=720&q=80",
    hard: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=720&q=80",
    classic: "https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?auto=format&fit=crop&w=720&q=80",
    prog: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=720&q=80",
    alt: "https://images.unsplash.com/photo-1521334726092-b509a19597a8?auto=format&fit=crop&w=720&q=80",
    indie: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=720&q=80"
  }
};

export const withVisualFallback = (track) => ({
  ...track,
  coverImage: track.coverImage || COVER_CATALOG.bySubgenre[track.subgenre] || COVER_CATALOG.fallbackCover,
  bannerImage: track.bannerImage || COVER_CATALOG.fallbackBanner
});
