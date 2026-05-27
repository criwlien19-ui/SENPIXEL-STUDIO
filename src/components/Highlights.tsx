import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { useHighlights } from '../hooks/useHighlights';
import EmbeddedVideo from './EmbeddedVideo';

export default function Highlights() {
  const { highlights, toggleLike } = useHighlights();

  if (highlights.length === 0) return null;

  return (
    <section id="highlights" className="py-24 px-4 md:px-6 relative z-10 glass-dark">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">Moments Forts</h2>
          <p className="text-slate-700 max-w-2xl mx-auto text-lg font-medium">Revivez l'ambiance festive des shootings depuis notre studio.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.map((highlight, index) => (
            <motion.div
              key={highlight.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="relative group rounded-3xl overflow-hidden glass shadow-lg border border-white/50"
            >
              {/* Le conteneur doit être relative + overflow-hidden pour que EmbeddedVideo (absolute inset-0) s'y insère */}
              <div className="aspect-[4/3] md:aspect-video relative bg-slate-900 overflow-hidden">
                <EmbeddedVideo url={highlight.url} />
              </div>
              <div className="p-5 flex items-center justify-between bg-white/40 backdrop-blur-md">
                <h3 className="font-bold text-slate-800 truncate pr-4">{highlight.title || 'Moment Fort'}</h3>
                <button 
                  onClick={() => toggleLike(highlight.id)}
                  className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full border border-white/80 hover:bg-white active:scale-95 transition-all shadow-sm"
                >
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500 transition-transform active:scale-125" />
                  <span className="font-bold text-slate-700">{highlight.likes}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
