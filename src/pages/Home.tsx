import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import Gallery from '../components/Gallery';
import Highlights from '../components/Highlights';
import BookingForm from '../components/BookingForm';
import Navbar from '../components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* Fixed Background Image for the whole site */}
      <div className="fixed inset-0 z-0 bg-slate-50">
      </div>

      {/* Background ambient light effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-amber-400/20 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-400/20 blur-[120px] pointer-events-none z-0" />
      
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Gallery />
        <Highlights />
        <BookingForm />
      </main>
      
      <footer className="py-8 text-center text-slate-600 text-sm glass border-t border-white/50 mt-20 relative z-10">
        <p>&copy; {new Date().getFullYear()} SENPIXEL. Tous droits réservés.</p>
        <p className="mt-2 text-orange-500 font-bold tracking-wider">Édition Spéciale Tabaski</p>
        {/* Lien admin masqué du rendu public — décommenter pour tests locaux */}
        {/* <div className="mt-6">
          <Link to="/admin" className="text-slate-300 hover:text-slate-400 text-xs transition-colors">
            Accès Réservé
          </Link>
        </div> */}
      </footer>
    </div>
  );
}
