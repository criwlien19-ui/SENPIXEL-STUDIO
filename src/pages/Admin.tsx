import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Phone, User, Lock, RefreshCw, AlertCircle, Image as ImageIcon, Heart, Star, Upload, Trash2, MessageCircle, Film } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useGallery } from '../hooks/useGallery';
import { useHighlights } from '../hooks/useHighlights';
import EmbeddedVideo from '../components/EmbeddedVideo';
import type { Booking } from '../types';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'gallery' | 'highlights'>('bookings');
  const [isUploading, setIsUploading] = useState(false);
  const { photos, toggleBestOfDay, addPhoto, deletePhoto } = useGallery();
  const { highlights, addHighlight, deleteHighlight } = useHighlights();
  
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  const handleAddHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVideoUrl) {
      addHighlight(newVideoUrl, newVideoTitle);
      setNewVideoUrl('');
      setNewVideoTitle('');
    }
  };

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    let remoteBookings: Booking[] = [];
    
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
           remoteBookings = data;
        } else if (error) {
           console.warn("Supabase fetch failed", error);
        }
      }
      
      const localStr = localStorage.getItem('senpixel_local_bookings');
      const localBookings: Booking[] = localStr ? JSON.parse(localStr) : [];
      
      // Déduplications : on garde les locaux et on n'ajoute que les distants absents localement
      const localIds = new Set(localBookings.map((b: Booking) => b.id));
      const remoteOnly = remoteBookings.filter((b: Booking) => !localIds.has(b.id));
      const allBookings = [...localBookings, ...remoteOnly].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setBookings(allBookings);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Error fetching bookings:', errorMessage);
      // Fallback
      const localStr = localStorage.getItem('senpixel_local_bookings');
      if (localStr) setBookings(JSON.parse(localStr));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const auth = sessionStorage.getItem('senpixel_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchBookings();
    }
  }, [fetchBookings]);

  const adminUser = import.meta.env.VITE_ADMIN_USER || 'Admin';
  const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSupabaseConfigured) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });
      if (!authError) {
        setIsAuthenticated(true);
        setError('');
        fetchBookings();
      } else {
        setError('Identifiants incorrects');
      }
    } else {
      // Fallback : vérifier via variables d'environnement
      if (username === adminUser && password === adminPass) {
        setIsAuthenticated(true);
        sessionStorage.setItem('senpixel_admin_auth', 'true');
        setError('');
        fetchBookings();
      } else {
        setError('Identifiants incorrects');
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('senpixel_admin_auth');
    setUsername('');
    setPassword('');
    setBookings([]);
  };

  const updateStatus = async (id: string, newStatus: Booking['status']) => {
    try {
      // Optimistic update
      const updated = bookings.map(b => b.id === id ? { ...b, status: newStatus } : b);
      setBookings(updated);

      if (id.startsWith('local-')) {
         const localStr = localStorage.getItem('senpixel_local_bookings');
         if (localStr) {
            const localBooks: Booking[] = JSON.parse(localStr);
            const newLocalBooks = localBooks.map(b => b.id === id ? { ...b, status: newStatus } : b);
            localStorage.setItem('senpixel_local_bookings', JSON.stringify(newLocalBooks));
         }
      } else if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('bookings')
          .update({ status: newStatus })
          .eq('id', id);

        if (error) {
          throw error;
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Error updating status:', errorMessage);
      // Revert on error
      fetchBookings();
      alert("Erreur lors de la mise à jour du statut.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'En attente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Confirmé': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Traité': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        try {
          addPhoto(dataUrl);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
          console.error('Error adding photo:', errorMessage);
          alert("Erreur lors de l'ajout de l'image. Le fichier est peut-être trop volumineux pour le stockage local (quota).");
        }
        setIsUploading(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/20 blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-400/20 blur-[120px] pointer-events-none z-0" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark p-8 rounded-3xl border border-white/50 shadow-xl w-full max-w-md relative z-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200 mb-4 shadow-sm">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Accès Réservé</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Veuillez vous identifier</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-username" className="block text-sm font-bold text-slate-700 mb-1">Identifiant</label>
              <input 
                id="admin-username"
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all font-medium"
                placeholder="Votre identifiant"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-bold text-slate-700 mb-1">Mot de passe</label>
              <input 
                id="admin-password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all font-medium"
                placeholder="Votre mot de passe"
                autoComplete="current-password"
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-sm font-bold text-center">{error}</p>
            )}

            <button 
              type="submit"
              className="w-full py-3 px-6 rounded-xl bg-slate-900 text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20 mt-4"
            >
              Se connecter
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm font-bold text-slate-500 hover:text-orange-500 transition-colors inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour au site
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-12 relative overflow-hidden">
      {/* Fixed Background Image for the whole site */}
      <div className="fixed inset-0 z-0">
        <img 
          src="/senpixel-bg.jpg" 
          alt="Senpixel Background" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
      </div>

      {/* Background ambient light effects */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/20 blur-[120px] pointer-events-none z-0" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-orange-600 transition-colors mb-4 text-sm font-bold">
              <ArrowLeft className="w-4 h-4" /> Retour au site
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Dashboard Admin</h1>
            <p className="text-slate-600 mt-2 font-medium">Gestion Tabaski: Réservations & Galerie</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors shadow-sm text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm ${activeTab === 'bookings' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            <Calendar className="w-5 h-5" />
            Réservations
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm ${activeTab === 'gallery' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            <ImageIcon className="w-5 h-5" />
            Galerie & Cœurs
          </button>
          <button 
            onClick={() => setActiveTab('highlights')}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm ${activeTab === 'highlights' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            <Film className="w-5 h-5" />
            Moments Forts
          </button>
        </div>

        {activeTab === 'bookings' && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="glass-dark rounded-3xl border border-white/50 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-200/50 flex justify-between items-center bg-white/40">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200">
                  <Calendar className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <div className="text-3xl font-black text-orange-600">{bookings.length}</div>
                  <div className="text-sm font-bold text-slate-500">Total Réservations</div>
                </div>
              </div>
              <button 
                onClick={fetchBookings}
                disabled={isLoading}
                className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
              </button>
            </div>
            
            {fetchError && (
              <div className="p-4 m-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 text-sm font-medium border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{fetchError}</p>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200/50 bg-white/40">
                    <th className="p-5 text-sm font-bold text-slate-700">Client</th>
                    <th className="p-5 text-sm font-bold text-slate-700">Contact</th>
                    <th className="p-5 text-sm font-bold text-slate-700">Jour choisi</th>
                    <th className="p-5 text-sm font-bold text-slate-700">Formule</th>
                    <th className="p-5 text-sm font-bold text-slate-700">Vidéo</th>
                    <th className="p-5 text-sm font-bold text-slate-700">Date de demande</th>
                    <th className="p-5 text-sm font-bold text-slate-700">Statut</th>
                    <th className="p-5 text-sm font-bold text-slate-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <Calendar className="w-12 h-12 text-slate-400 opacity-50" />
                          <p className="font-medium">Aucune réservation pour le moment.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking, i) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={booking.id} 
                        className="border-b border-slate-200/50 hover:bg-white/40 transition-colors"
                      >
                        <td className="p-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-orange-500 border border-orange-100 shadow-sm">
                                <User className="w-5 h-5" />
                              </div>
                              <span className="font-bold text-slate-900">{booking.name}</span>
                            </div>
                            <span className="text-[10px] uppercase text-slate-400 font-mono pl-14 flex-shrink-0 tracking-wider">Réf: {booking.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <a 
                            href={`https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${booking.name}, concernant votre réservation chez SENPIXEL (Réf: ${booking.id.slice(0, 8)}) pour le ${booking.day}...`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-slate-700 text-sm font-medium hover:text-green-600 transition-colors cursor-pointer group"
                            title="Ouvrir WhatsApp avec ce client"
                          >
                            <MessageCircle className="w-4 h-4 text-green-500 group-hover:fill-green-500 transition-colors" />
                            {booking.phone}
                          </a>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            {booking.day}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="text-slate-700 text-sm font-bold">
                            {booking.photo_package || '-'}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="text-slate-500 text-sm font-medium">
                            {booking.video_option || '-'}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="text-slate-500 text-sm font-medium">
                            {new Date(booking.created_at || new Date()).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <select 
                            value={booking.status}
                            onChange={(e) => updateStatus(booking.id, e.target.value as Booking['status'])}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all cursor-pointer shadow-sm"
                          >
                            <option value="En attente">En attente</option>
                            <option value="Confirmé">Confirmé</option>
                            <option value="Traité">Traité</option>
                          </select>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'gallery' && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Gestion de la Galerie</h2>
              
              <div className="relative">
                <input 
                  type="file" 
                  id="photo-upload" 
                  accept="image/*" 
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <label 
                  htmlFor="photo-upload"
                  className={`px-4 py-2 rounded-xl bg-orange-600 text-white font-bold flex items-center gap-2 cursor-pointer hover:bg-orange-700 transition-colors shadow-sm ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-5 h-5" />
                  {isUploading ? 'Traitement...' : 'Ajouter une photo'}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo) => (
                <div key={photo.id} className="glass border border-white/50 rounded-2xl overflow-hidden shadow-lg flex flex-col group relative">
                  <div className="h-64 relative bg-slate-900/10">
                    <img 
                      src={photo.url} 
                      alt={`Photo ${photo.id}`} 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                       <div className="bg-white/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 shadow-sm font-bold text-sm">
                         <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                         {photo.likes}
                       </div>
                    </div>
                    
                    {/* Delete button (visible on hover or focus) */}
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="absolute top-4 left-4 p-2 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-red-600 shadow-md backdrop-blur-sm"
                      title="Supprimer la photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 bg-white/40 flex items-center justify-between">
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-slate-800 text-sm mb-1 truncate">Image ID: {photo.id.replace('img-', '')}</h4>
                      <p className="text-slate-500 text-xs">Visibilité & Likes</p>
                    </div>
                    <button
                      onClick={() => toggleBestOfDay(photo.id)}
                      className={`flex-shrink-0 ml-2 px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-xs transition-all shadow-sm ${photo.isBest ? 'bg-orange-100 text-orange-700 border border-orange-300 shadow-orange-500/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                      <Star className={`w-4 h-4 ${photo.isBest ? 'text-orange-500 fill-orange-500' : 'text-slate-400'}`} />
                      {photo.isBest ? 'À la Une' : 'Standard'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'highlights' && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Gestion des Moments Forts (Vidéos)</h2>
            </div>
        
            <div className="glass border border-white/50 rounded-3xl p-6 mb-8 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Film className="w-5 h-5 text-orange-500" />
                Ajouter une nouvelle vidéo
              </h3>
              <form onSubmit={handleAddHighlight} className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full text-left">
                     <label htmlFor="video-title" className="block text-sm font-bold text-slate-700 mb-2">Titre de la vidéo</label>
                     <input id="video-title" type="text" required value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} placeholder="Ex: Coulisses Famille Diallo" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-shadow" />
                  </div>
                  <div className="flex-1 w-full text-left">
                     <div className="flex items-center justify-between mb-2">
                       <label htmlFor="video-url" className="block text-sm font-bold text-slate-700">URL de la vidéo ou fichier local</label>
                     </div>
                     <div className="relative">
                       <input 
                         id="video-url"
                         type="url" 
                         value={newVideoUrl} 
                         onChange={e => setNewVideoUrl(e.target.value)} 
                         placeholder="https://..." 
                         className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-shadow" 
                         disabled={isUploading}
                       />
                       <input 
                         type="file" 
                         accept="video/*" 
                         id="video-upload" 
                         className="hidden" 
                         onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (!file) return;
                           
                           setIsUploading(true);
                           const reader = new FileReader();
                           reader.onload = (ev) => {
                             try {
                               const base64Url = ev.target?.result as string;
                               setNewVideoUrl(base64Url);
                               if (!newVideoTitle) {
                                 setNewVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
                               }
                             } catch (err: unknown) {
                               const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
                               console.error('Error processing video:', errorMessage);
                               alert("Erreur lors du traitement de la vidéo.");
                             } finally {
                               setIsUploading(false);
                             }
                           };
                           reader.onerror = () => {
                             alert("Erreur lors de la lecture du fichier vidéo.");
                             setIsUploading(false);
                           };
                           reader.readAsDataURL(file);
                         }}
                       />
                       <label 
                         htmlFor="video-upload"
                         className={`absolute right-2 top-2 p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                         title="Parcourir"
                       >
                         {isUploading ? 'Chargement...' : <><Upload className="w-3 h-3" /> Fichier</>}
                       </label>
                     </div>
                  </div>
                  <button type="submit" disabled={isUploading} className="w-full md:w-auto px-8 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50 transition shadow-sm active:scale-95">
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
        
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {highlights.map(vid => (
                <div key={vid.id} className="glass border border-white/50 rounded-2xl overflow-hidden shadow-lg flex flex-col group relative">
                  <div className="aspect-video relative bg-slate-900 flex items-center justify-center overflow-hidden">
                    <EmbeddedVideo url={vid.url} className="w-full h-full object-contain" />
                  </div>
                  <div className="p-4 bg-white/40 flex items-center justify-between">
                    <div className="overflow-hidden pr-2">
                      <h4 className="font-bold text-slate-800 text-sm mb-1 truncate">{vid.title || 'Sans titre'}</h4>
                      <p className="text-slate-500 text-xs flex items-center gap-1 font-medium"><Heart className="w-3 h-3 text-rose-500 fill-rose-500"/> {vid.likes} j'aimes</p>
                    </div>
                    <button
                       onClick={() => deleteHighlight(vid.id)}
                       className="p-3 rounded-xl bg-red-100/50 text-red-600 hover:bg-red-100 transition shadow-sm"
                       title="Supprimer la vidéo"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {highlights.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 flex flex-col items-center">
                  <Film className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="font-medium">Aucune vidéo ajoutée pour le moment.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
