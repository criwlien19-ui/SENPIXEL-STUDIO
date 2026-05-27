import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, Phone, CheckCircle2, AlertCircle, Camera, Video, MessageCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Booking } from '../types';

const PHOTO_PACKAGES = [
  { id: 'studio-5', label: '5 Photos - 5.000 FCFA (Studio)' },
  { id: 'studio-15', label: '15 Photos - 13.000 FCFA (Studio)' },
  { id: 'domicile-7', label: '7 Photos - 10.000 FCFA (À Domicile)' },
  { id: 'domicile-20', label: '20 Photos - 23.000 FCFA (À Domicile)' },
];

const VIDEO_OPTIONS = [
  { id: 'none', label: 'Aucune vidéo' },
  { id: 'cinematique', label: 'Vidéo Cinématographique - 15.000 FCFA' },
];

export default function BookingForm() {
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    day: 'Jour 1 de la Tabaski',
    photo_package: PHOTO_PACKAGES[0].label,
    video_option: VIDEO_OPTIONS[0].label
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '221782931468';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const newBooking = {
        name: formData.name,
        phone: formData.phone,
        day: formData.day,
        photo_package: formData.photo_package,
        video_option: formData.video_option,
        status: 'En attente',
      };

      let newId = '';
      if (isSupabaseConfigured) {
        const { data, error: supabaseError } = await supabase
          .from('bookings')
          .insert([newBooking])
          .select()
          .single();
          
        if (supabaseError) {
          console.warn("Supabase insert failed, falling back to local storage:", supabaseError);
          newId = saveToLocal(newBooking as Omit<Booking, 'id' | 'created_at'>);
        } else if (data) {
          newId = data.id;
        }
      } else {
        newId = saveToLocal(newBooking as Omit<Booking, 'id' | 'created_at'>);
      }

      setCreatedBookingId(newId);
      setIsSubmitted(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Error saving booking:', errorMessage);
      setError('Une erreur est survenue. Veuillez vérifier votre connexion ou réessayer plus tard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveToLocal = (booking: Omit<Booking, 'id' | 'created_at'>): string => {
    const existingStr = localStorage.getItem('senpixel_local_bookings');
    const existing: Booking[] = existingStr ? JSON.parse(existingStr) : [];
    const newId = `local-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const completeBooking: Booking = {
      ...booking,
      id: newId,
      created_at: new Date().toISOString()
    };
    localStorage.setItem('senpixel_local_bookings', JSON.stringify([completeBooking, ...existing]));
    return newId;
  };

  return (
    <section id="booking" className="py-24 px-4 md:px-6 relative z-10">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="glass-dark p-8 md:p-14 rounded-[2.5rem] relative overflow-hidden shadow-2xl"
        >
          {/* Decorative blur */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-400/20 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="text-center mb-10 relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">Réservez votre séance</h2>
            <p className="text-slate-700 text-lg font-medium">Remplissez ce formulaire pour bloquer votre créneau pendant la Tabaski.</p>
          </div>

          <AnimatePresence mode="wait">
            {isSubmitted ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-12 text-center relative z-10"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6 border border-orange-200 shadow-inner"
                >
                  <CheckCircle2 className="w-12 h-12 text-orange-500" />
                </motion.div>
                <h3 className="text-3xl font-extrabold text-slate-900 mb-3">Réservation Enregistrée !</h3>
                <p className="text-slate-700 text-lg max-w-md font-medium mb-2">Merci <span className="text-orange-600 font-bold">{formData.name}</span>.</p>
                <div className="mb-8 p-3 bg-white/60 border border-slate-200 rounded-xl flex items-center justify-center gap-2 font-mono text-sm shadow-sm backdrop-blur-sm mx-auto max-w-xs">
                  <span className="text-slate-500">Réf:</span>
                  <strong className="text-slate-900 uppercase tracking-widest">{createdBookingId?.slice(0, 8) || 'N/A'}</strong>
                </div>
                <p className="text-slate-700 text-lg max-w-md font-medium mb-8">Veuillez confirmer votre séance via WhatsApp pour la valider définitivement avec notre équipe.</p>
                
                <div className="flex flex-col items-center gap-4 w-full">
                  <a 
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Bonjour SENPIXEL, je souhaite confirmer ma réservation pour la Tabaski.\n\nRéf: ${createdBookingId?.slice(0, 8) || 'N/A'}\nNom: ${formData.name}\nTéléphone: ${formData.phone}\nJour: ${formData.day}\nFormule: ${formData.photo_package}\nVidéo: ${formData.video_option}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-all shadow-[0_8px_20px_rgba(34,197,94,0.4)] hover:shadow-[0_12px_25px_rgba(34,197,94,0.5)] hover:-translate-y-1"
                  >
                    <MessageCircle className="w-6 h-6 fill-white" />
                    Confirmer sur WhatsApp
                  </a>
                  
                  <button 
                    onClick={() => {
                        setIsSubmitted(false);
                        setFormData({ 
                          name: '', 
                          phone: '', 
                          day: 'Jour 1 de la Tabaski',
                          photo_package: PHOTO_PACKAGES[0].label,
                          video_option: VIDEO_OPTIONS[0].label
                        });
                    }}
                    className="mt-4 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors"
                  >
                    Faire une autre réservation
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit} 
                className="space-y-6 relative z-10"
              >
                <div className="space-y-2">
                  <label htmlFor="booking-name" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-500" /> Nom complet
                  </label>
                  <input 
                    id="booking-name"
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/60 border border-white/50 rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all shadow-sm"
                    placeholder="Ex: Aminata Diallo"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="booking-phone" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-orange-500" /> Numéro de téléphone
                  </label>
                  <input 
                    id="booking-phone"
                    type="tel" 
                    pattern="[0-9+\s\-]{7,15}"
                    title="Numéro de téléphone valide (7 à 15 chiffres)"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/60 border border-white/50 rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all shadow-sm"
                    placeholder="Ex: +221 77 123 45 67"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="booking-day" className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-orange-500" /> Jour de la Tabaski
                  </label>
                  <div id="booking-day" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Jour 1 de la Tabaski', 'Jour 2', 'Jour 3'].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setFormData({...formData, day})}
                        className={`px-4 py-4 rounded-2xl border transition-all text-sm font-bold ${
                          formData.day === day 
                            ? 'bg-orange-50 border-orange-400 text-orange-600 shadow-[0_4px_15px_rgba(251,146,60,0.2)] scale-[1.02]' 
                            : 'bg-white/60 border-white/50 text-slate-600 hover:bg-white/80 hover:border-orange-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="booking-photo-package" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-orange-500" /> Formule Photo
                  </label>
                  <select 
                    id="booking-photo-package"
                    value={formData.photo_package}
                    onChange={e => setFormData({...formData, photo_package: e.target.value})}
                    className="w-full bg-white/60 border border-white/50 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all shadow-sm appearance-none"
                  >
                    {PHOTO_PACKAGES.map(pkg => (
                      <option key={pkg.id} value={pkg.label}>{pkg.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="booking-video-option" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Video className="w-4 h-4 text-orange-500" /> Option Vidéo
                  </label>
                  <select 
                    id="booking-video-option"
                    value={formData.video_option}
                    onChange={e => setFormData({...formData, video_option: e.target.value})}
                    className="w-full bg-white/60 border border-white/50 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all shadow-sm appearance-none"
                  >
                    {VIDEO_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.label}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 text-sm font-medium border border-red-100">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white font-bold text-lg transition-all shadow-[0_8px_20px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_25px_rgba(251,146,60,0.6)] mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Valider ma réservation'}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
