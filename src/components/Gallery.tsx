import { motion } from 'motion/react';
import { Heart, Star } from 'lucide-react';
import { useGallery } from '../hooks/useGallery';

export default function Gallery() {
  const { photos, toggleLike } = useGallery();
  
  const bestPhotos = photos.filter(p => p.isBest);

  return (
    <section id="gallery" className="py-24 px-4 md:px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">Galerie & Coups de Cœur</h2>
          <p className="text-slate-700 max-w-2xl mx-auto text-lg font-medium">Découvrez notre style unique et laissez un cœur sur vos photos préférées de la Tabaski.</p>
        </motion.div>

        {bestPhotos.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-6 h-6 text-orange-500 fill-orange-500" />
              <h3 className="text-2xl font-bold text-slate-800">Sélection du Jour</h3>
            </div>
            
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 hide-scrollbar">
              {bestPhotos.map((photo) => (
                <motion.div 
                  key={`best-${photo.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="snap-center shrink-0 w-[280px] md:w-[320px] h-[400px] relative rounded-3xl overflow-hidden glass shadow-lg group"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo de galerie ${photo.id}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-80" />
                  
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                    <div className="text-white font-bold tracking-wide flex items-center gap-2">
                       <Star className="w-4 h-4 text-orange-400 fill-orange-400" /> Top Tabaski
                    </div>
                    <button 
                      onClick={() => toggleLike(photo.id)}
                      className="group/btn flex flex-col items-center gap-1 active:scale-95 transition-transform"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover/btn:bg-white/40 transition-colors shadow-lg">
                        <Heart className="w-6 h-6 text-rose-400 fill-rose-400 group-active/btn:scale-125 transition-transform duration-300" />
                      </div>
                      <span className="text-white text-sm font-bold drop-shadow-md">{photo.likes}</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-6">
           <h3 className="text-2xl font-bold text-slate-800">Toutes les photos</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[300px]">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: (index % 6) * 0.1 }}
              className={`relative group overflow-hidden rounded-3xl ${photo.span} glass shadow-md`}
            >
              <img
                src={photo.url}
                alt={photo.caption || `Photo portfolio ${photo.id}`}
                className="w-full h-full object-contain bg-slate-900/5 transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 border-2 border-orange-400/0 group-hover:border-orange-400/50 rounded-3xl transition-colors duration-500 shadow-[inset_0_0_20px_rgba(251,146,60,0)] group-hover:shadow-[inset_0_0_30px_rgba(251,146,60,0.4)]" />
              
              {/* Like Button overlay */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-4 group-hover:translate-y-0">
                <button 
                   onClick={() => toggleLike(photo.id)}
                   className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 hover:bg-white/40 active:scale-95 transition-all shadow-lg"
                >
                  <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
                  <span className="text-white font-bold">{photo.likes}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
