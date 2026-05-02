import { useState, useEffect, useCallback, Component } from "react";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────────
const sanitize = (str) => str.replace(/[<>]/g, "").trim();

const fetchCharacters = async (page = 1, pageSize = 20) => {
  const res = await fetch(`${BASE_URL}/characters?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) throw new Error("Failed to load characters. Please try again.");
  return res.json();
};

const searchCharacters = async (name) => {
  const clean = sanitize(name);
  if (!clean) throw new Error("Please enter a valid search term.");
  const res = await fetch(`${BASE_URL}/characters/search?name=${encodeURIComponent(clean)}`);
  if (!res.ok) throw new Error("Search failed. Please try again.");
  return res.json();
};

// ─────────────────────────────────────────────
// CUSTOM HOOK — manages all data fetching state
// ─────────────────────────────────────────────
const useCharacters = (page, searchQuery) => {
  const [characters, setCharacters] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setCharacters([]);
      await new Promise(r => setTimeout(r, 600));
      try {
        if (searchQuery.trim()) {
          const data = await searchCharacters(searchQuery);
          const items = data.data
            ? Array.isArray(data.data) ? data.data : [data.data]
            : [];
          setCharacters(items);
          setTotalPages(1);
        } else {
          const data = await fetchCharacters(page);
          setCharacters(data.data || []);
          setTotalPages(data.info?.totalPages || 1);
        }
      } catch (err) {
        setError(err.message || "Something went wrong.");
        setCharacters([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, searchQuery]);

  return { characters, totalPages, loading, error };
};

// ─────────────────────────────────────────────
// COMPONENT: SkeletonCard — placeholder while loading
// ─────────────────────────────────────────────
const SkeletonCard = ({ index }) => (
  <div className="skeleton-card" style={{ animationDelay: `${index * 0.07}s` }}>
    <div className="skeleton-img" />
    <div className="skeleton-body">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-tag" />
      <div className="skeleton-line skeleton-tag short" />
    </div>
  </div>
);

// ─────────────────────────────────────────────
// COMPONENT: ErrorMessage
// ─────────────────────────────────────────────
const ErrorMessage = ({ message }) => (
  <div className="error-wrapper">
    <span className="error-icon">✦</span>
    <p className="error-text">{message || "Something went wrong. Please try again."}</p>
  </div>
);

// ─────────────────────────────────────────────
// COMPONENT: SearchBar — with ripple + shake animation
// ─────────────────────────────────────────────
const SearchBar = ({ onSearch, onClear }) => {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);
  const [ripple, setRipple] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = value.replace(/[<>]/g, "").trim();
    if (!clean) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (clean.length > 50) return;
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
    onSearch(clean);
  };

  const handleClear = () => {
    setValue("");
    onClear();
  };

  return (
    <div className="searchbar-wrapper">
      <form className={`searchbar ${shake ? "shake" : ""}`} onSubmit={handleSubmit}>
        <span className="searchbar__icon">🔮</span>
        <input
          className="searchbar__input"
          type="text"
          placeholder="Search a Disney character..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={50}
        />
        {value && (
          <button type="button" className="searchbar__clear" onClick={handleClear}>
            ✕
          </button>
        )}
        <button type="submit" className={`searchbar__btn ${ripple ? "ripple" : ""}`}>
          Search
        </button>
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────
// COMPONENT: Modal — full detail view on card click
// ─────────────────────────────────────────────
const Modal = ({ character, onClose }) => {
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const sections = [
    { label: "🎬 Films", items: character.films },
    { label: "📺 TV Shows", items: character.tvShows },
    { label: "🎮 Video Games", items: character.videoGames },
    { label: "🤝 Allies", items: character.allies },
    { label: "⚔️ Enemies", items: character.enemies },
  ].filter((s) => s.items?.length > 0);

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal">
        <button className="modal__close" onClick={onClose}>✕</button>
        <div className="modal__inner">
          <div className="modal__img-wrap">
            <img
              className="modal__img"
              src={character.imageUrl || "https://upload.wikimedia.org/wikipedia/en/4/4d/Disney_wordmark.svg"}
              alt={character.name}
              onError={(e) => { e.target.src = "https://upload.wikimedia.org/wikipedia/en/4/4d/Disney_wordmark.svg"; }}
            />
            <div className="modal__img-glow" />
          </div>
          <div className="modal__details">
            <h2 className="modal__name">{character.name}</h2>
            {sections.length === 0 ? (
              <p className="modal__empty">No additional details available.</p>
            ) : (
              sections.map((section) => (
                <div key={section.label} className="modal__section">
                  <h4 className="modal__section-title">{section.label}</h4>
                  <ul className="modal__list">
                    {section.items.map((item, i) => (
                      <li key={i} className="modal__list-item">{item}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// COMPONENT: CharacterCard
// ─────────────────────────────────────────────
const CharacterCard = ({ character, index, onClick }) => {
  const films = character.films?.slice(0, 2) || [];
  const hasMore = (character.films?.length || 0) > 2;

  return (
    <div
      className="card"
      style={{ animationDelay: `${index * 0.06}s` }}
      onClick={() => onClick(character)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(character)}
    >
      <div className="card__img-wrap">
        <img
          className="card__img"
          src={character.imageUrl || "https://upload.wikimedia.org/wikipedia/en/4/4d/Disney_wordmark.svg"}
          alt={character.name}
          onError={(e) => { e.target.src = "https://upload.wikimedia.org/wikipedia/en/4/4d/Disney_wordmark.svg"; }}
        />
        <div className="card__overlay" />
        <h3 className="card__name-overlay">{character.name}</h3>
        <div className="card__hover-hint">View Details</div>
      </div>
      <div className="card__body">
        {films.length > 0 ? (
          <ul className="card__films">
            {films.map((film, i) => (
              <li key={i} className="card__film-tag">{film}</li>
            ))}
            {hasMore && <li className="card__film-tag card__film-more">+more</li>}
          </ul>
        ) : (
          <p className="card__no-films">No films listed</p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// COMPONENT: Pagination — with bounce animation
// ─────────────────────────────────────────────
const Pagination = ({ page, totalPages, onPrev, onNext }) => {
  const [bounce, setBounce] = useState(null);

  const handlePrev = () => {
    setBounce("prev");
    setTimeout(() => setBounce(null), 400);
    onPrev();
  };

  const handleNext = () => {
    setBounce("next");
    setTimeout(() => setBounce(null), 400);
    onNext();
  };

  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    if (page <= 2) end = Math.min(5, totalPages);
    if (page >= totalPages - 1) start = Math.max(1, totalPages - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="pagination">
      <button
        className={`pagination__btn ${bounce === "prev" ? "bounce" : ""}`}
        onClick={handlePrev}
        disabled={page <= 1}
      >
        ← Prev
      </button>
      <div className="pagination__numbers">
        {getPageNumbers().map((p) => (
          <button
            key={p}
            className={`pagination__num ${p === page ? "active" : ""}`}
            onClick={() => {
              if (p < page) onPrev();
              else if (p > page) onNext();
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        className={`pagination__btn ${bounce === "next" ? "bounce" : ""}`}
        onClick={handleNext}
        disabled={page >= totalPages}
      >
        Next →
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// COMPONENT: ErrorBoundary — catches React crashes
// ─────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="boundary-error">
          <p className="boundary-icon">✦</p>
          <h2>Something went wrong</h2>
          <p>Please refresh the page to try again.</p>
          <button onClick={() => window.location.reload()} className="boundary-btn">
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────
// COMPONENT: Dashboard — main page
// ─────────────────────────────────────────────
const Dashboard = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChar, setSelectedChar] = useState(null);

  const { characters, totalPages, loading, error } = useCharacters(page, searchQuery);

  const handleSearch = (query) => { setSearchQuery(query); setPage(1); };
  const handleClear = () => { setSearchQuery(""); setPage(1); };
  const handleCardClick = useCallback((char) => setSelectedChar(char), []);
  const handleCloseModal = useCallback(() => setSelectedChar(null), []);

  return (
    <div className="dashboard">
      {/* Animated background particles */}
      <div className="bg-particles" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
          <span key={i} className="particle" style={{
            left: `${(i * 5.3) % 100}%`,
            animationDelay: `${(i * 0.4) % 8}s`,
            animationDuration: `${6 + (i % 6)}s`,
            fontSize: `${8 + (i % 8)}px`,
            opacity: 0.3 + (i % 4) * 0.1
          }}>✦</span>
        ))}
      </div>

      {/* Header */}
      <header className="dashboard__header">
        <div className="header__badge">✦ The Magical World ✦</div>
        <h1 className="dashboard__title">
          Disney <span className="title-accent">Universe</span>
        </h1>
        <p className="dashboard__subtitle">Explore your favourite Disney characters</p>
      </header>

      {/* Main */}
      <main className="dashboard__main">
        <SearchBar onSearch={handleSearch} onClear={handleClear} />

        {error && <ErrorMessage message={error} />}

        {/* Skeleton loading */}
        {loading && (
          <div className="dashboard__grid">
            {[...Array(10)].map((_, i) => <SkeletonCard key={i} index={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && characters.length === 0 && searchQuery && (
          <div className="dashboard__empty">
            <p className="empty-icon">🔮</p>
            <p>No characters found. Try a different search!</p>
          </div>
        )}

        {/* Character grid */}
        {!loading && !error && characters.length > 0 && (
          <>
            <div className="dashboard__grid">
              {characters.map((char, i) => (
                <CharacterCard
                  key={char._id}
                  character={char}
                  index={i}
                  onClick={handleCardClick}
                />
              ))}
            </div>
            {!searchQuery && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            )}
          </>
        )}
      </main>

      {/* Modal */}
      {selectedChar && (
        <Modal character={selectedChar} onClose={handleCloseModal} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}