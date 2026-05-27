import { motion } from 'motion/react';

export default function Hero() {
  const scrollToBooking = () => {
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-20 px-4 md:px-6">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        <img
          src="https://i.imgur.com/Ev40pNL.jpeg"
          alt=""
          role="presentation"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 p-8 md:p-14 rounded-[2.5rem] text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="inline-block mb-6 px-5 py-2 rounded-full border border-orange-300/50 bg-orange-500/20 text-orange-100 text-sm font-bold tracking-wider uppercase shadow-sm backdrop-blur-sm"
          >
            Édition Spéciale Tabaski
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Venez fêter la <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
              Tabaski chez SENPIXEL
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            Réservez votre shooting photo en famille pour la fête de la Tabaski dans notre tout nouveau studio au confort royal.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToBooking}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white font-bold text-lg transition-all shadow-[0_8px_20px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_25px_rgba(251,146,60,0.6)]"
          >
            Réservation
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
