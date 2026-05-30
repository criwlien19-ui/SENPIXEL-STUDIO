import { useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHighlights } from '../hooks/useHighlights';
import EmbeddedVideo from './EmbeddedVideo';

export default function Highlights() {
  const { highlights, toggleLike } = useHighlights();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollTo = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      if (!container) return;
      const cards = container.querySelectorAll<HTMLElement>('[data-card]');
      const card = cards[index];
      if (!card) return;
      const containerLeft = container.getBoundingClientRect().left;
      const cardLeft = card.getBoundingClientRect().left;
      container.scrollBy({ left: cardLeft - containerLeft, behavior: 'smooth' });
      setActiveIndex(index);
    },
    []
  );

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>('[data-card]');
    let closestIndex = 0;
    let closestDist = Infinity;
    cards.forEach((card, i) => {
      const dist = Math.abs(
        card.getBoundingClientRect().left - container.getBoundingClientRect().left
      );
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });
    setActiveIndex(closestIndex);
  }, []);

  const prev = useCallback(
    () => scrollTo(Math.max(0, activeIndex - 1)),
    [activeIndex, scrollTo]
  );
  const next = useCallback(
    () => scrollTo(Math.min(highlights.length - 1, activeIndex + 1)),
    [activeIndex, highlights.length, scrollTo]
  );

  if (highlights.length === 0) return null;

  return (
    <section id="highlights" className="py-20 md:py-28 relative z-10 glass-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-3">
            Moments Forts
          </h2>
          <p className="text-slate-700 max-w-2xl mx-auto text-base md:text-lg font-medium">
            Revivez l'ambiance festive des shootings depuis notre studio.
          </p>
        </motion.div>

        {/* ── MOBILE : carousel horizontal scroll-snap ── */}
        <div className="md:hidden relative">
          {/* Flèches navigation */}
          {highlights.length > 1 && (
            <>
              <button
                onClick={prev}
                disabled={activeIndex === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-white/60 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Précédent"
              >
                <ChevronLeft className="w-5 h-5 text-slate-700" />
              </button>
              <button
                onClick={next}
                disabled={activeIndex === highlights.length - 1}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-white/60 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Suivant"
              >
                <ChevronRight className="w-5 h-5 text-slate-700" />
              </button>
            </>
          )}

          {/* Scroll container */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 px-4 -mx-4 scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            {highlights.map((highlight, index) => (
              <div
                key={highlight.id}
                data-card
                className="snap-center flex-none w-[calc(100vw-2.5rem)] max-w-[380px] min-w-0"
              >
                <VideoCard
                  highlight={highlight}
                  index={index}
                  onLike={() => toggleLike(highlight.id)}
                  mobile
                />
              </div>
            ))}
          </div>

          {/* Indicateurs de pagination */}
          {highlights.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {highlights.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  className={`transition-all rounded-full touch-manipulation ${
                    i === activeIndex
                      ? 'w-6 h-2 bg-orange-500'
                      : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Aller à la vidéo ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── DESKTOP : grille 2–3 colonnes ── */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.map((highlight, index) => (
            <VideoCard
              key={highlight.id}
              highlight={highlight}
              index={index}
              onLike={() => toggleLike(highlight.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Carte vidéo ─────────────────────────────────────────────────────────────
interface VideoCardProps {
  highlight: {
    id: string;
    title?: string | null;
    url: string;
    likes: number;
  };
  index: number;
  onLike: () => void;
  mobile?: boolean;
}

function VideoCard({ highlight, index, onLike, mobile = false }: VideoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: mobile ? 0 : index * 0.1, duration: 0.5 }}
      className="relative rounded-3xl overflow-hidden glass shadow-xl border border-white/50 flex flex-col"
    >
      {/* Zone vidéo — aspect 16/9, largeur 100% explicite pour éviter l'écrasement mobile */}
      <div className="w-full aspect-video relative bg-black overflow-hidden">
        <EmbeddedVideo
          url={highlight.url}
          title={highlight.title ?? 'Moment Fort'}
        />
      </div>

      {/* Pied de carte */}
      <div className="px-4 py-3.5 flex items-center justify-between bg-white/50 backdrop-blur-md flex-1 min-h-[60px]">
        <h3 className="font-bold text-slate-800 truncate pr-3 text-sm md:text-base leading-snug">
          {highlight.title || 'Moment Fort'}
        </h3>
        <button
          onClick={onLike}
          className="flex-none flex items-center gap-1.5 bg-white/70 active:bg-rose-50 px-3 py-1.5 rounded-full border border-white/80 active:scale-95 transition-all shadow-sm touch-manipulation select-none"
          aria-label="J'aime"
        >
          <Heart className="w-4 h-4 md:w-5 md:h-5 text-rose-500 fill-rose-500 transition-transform active:scale-125" />
          <span className="font-bold text-slate-700 text-sm tabular-nums">
            {highlight.likes}
          </span>
        </button>
      </div>
    </motion.div>
  );
}
