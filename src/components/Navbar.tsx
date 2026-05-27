import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-4 md:px-6"
    >
      <div className="max-w-7xl mx-auto glass rounded-2xl px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <img
            src="https://i.imgur.com/7T8OPHt.png"
            alt="SENPIXEL Logo"
            loading="lazy"
            className="h-8 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="text-xl font-black tracking-widest text-slate-900">SENPIXEL</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-700">
          <a href="#hero" className="hover:text-orange-500 transition-colors">Accueil</a>
          <a href="#gallery" className="hover:text-orange-500 transition-colors">Galerie</a>
          <a href="#booking" className="hover:text-orange-500 transition-colors">Réservation</a>
        </div>
      </div>
    </motion.nav>
  );
}
