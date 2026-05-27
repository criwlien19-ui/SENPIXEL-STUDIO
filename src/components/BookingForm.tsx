import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, Phone, CheckCircle2, AlertCircle, Camera, Video, MessageCircle, Minus, Plus, MapPin, Building2, Clock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Booking } from '../types';

type ShootingType = 'studio' | 'exterieur';

const STUDIO_PACKAGES = [
  { id: 'studio-2',  photos: 2,  price: 2000 },
  { id: 'studio-5',  photos: 5,  price: 5000 },
  { id: 'studio-10', photos: 10, price: 10000 },
];

const EXTERIEUR_PACKAGES = [
  { id: 'ext-10', photos: 10, price: 14000 },
  { id: 'ext-20', photos: 20, price: 23000 },
  { id: 'ext-30', photos: 30, price: 30000 },
];

const PRICE_PER_PHOTO: Record<ShootingType, number> = {
  studio: 1000,
  exterieur: 1400,
};

const TIME_PERIODS = [
  {
    label: '🌅 Matin',
    slots: ['07h00','07h30','08h00','08h30','09h00','09h30','10h00','10h30','11h00','11h30'],
  },
  {
    label: '☀️ Après-midi',
    slots: ['12h00','12h30','13h00','13h30','14h00','14h30','15h00','15h30','16h00','16h30'],
  },
  {
    label: '🌆 Soir',
    slots: ['17h00','17h30','18h00','18h30','19h00','19h30','20h00','20h30','21h00','21h30','22h00'],
  },
];

const VIDEO_OPTIONS = [
  { id: 'none',        label: 'Aucune vidéo',  price: 0 },
  { id: 'bl-vue',      label: 'BL VUE',        price: 3000 },
  { id: 'cinematique', label: 'CINÉMATIQUE',   price: 5000 },
];

function formatPrice(xof: number): string {
  return new Intl.NumberFormat('fr-SN').format(xof) + ' XOF';
}

function pkgBtnClass(active: boolean): string {
  const base = 'relative flex flex-col items-center justify-center px-3 py-4 rounded-2xl border transition-all';
  const on  = 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-400 shadow-[0_4px_18px_rgba(251,146,60,0.25)] scale-[1.03]';
  const off = 'bg-white/60 border-white/50 text-slate-600 hover:bg-white/80 hover:border-orange-200';
  return base + ' ' + (active ? on : off);
}

function videoBtnClass(active: boolean): string {
  const base = 'flex flex-col items-center justify-center px-3 py-4 rounded-2xl border transition-all';
  const on  = 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-400 shadow-[0_4px_18px_rgba(20,184,166,0.2)] scale-[1.03]';
  const off = 'bg-white/60 border-white/50 text-slate-600 hover:bg-white/80 hover:border-teal-200';
  return base + ' ' + (active ? on : off);
}

function typeBtnClass(active: boolean): string {
  const base = 'flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all font-bold';
  const on  = 'bg-orange-50 border-orange-400 text-orange-600 shadow-[0_4px_15px_rgba(251,146,60,0.2)] scale-[1.02]';
  const off = 'bg-white/60 border-white/50 text-slate-600 hover:bg-white/80 hover:border-orange-200';
  return base + ' ' + (active ? on : off);
}

function dayBtnClass(active: boolean): string {
  const base = 'px-4 py-4 rounded-2xl border transition-all text-sm font-bold';
  const on  = 'bg-orange-50 border-orange-400 text-orange-600 shadow-[0_4px_15px_rgba(251,146,60,0.2)] scale-[1.02]';
  const off = 'bg-white/60 border-white/50 text-slate-600 hover:bg-white/80 hover:border-orange-200';
  return base + ' ' + (active ? on : off);
}

export default function BookingForm() {
  const [shootingType, setShootingType] = useState<ShootingType>('studio');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('studio-5');
  const [customPhotos, setCustomPhotos] = useState<number>(3);
  const [videoOption, setVideoOption] = useState(VIDEO_OPTIONS[0]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    day: 'Jour 1 de la Tabaski',
    time: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '221782931468';

  const packages = shootingType === 'studio' ? STUDIO_PACKAGES : EXTERIEUR_PACKAGES;

  const handleTypeChange = (type: ShootingType) => {
    setShootingType(type);
    setSelectedPackageId(type === 'studio' ? 'studio-5' : 'ext-10');
  };

  const photoPrice = useMemo(() => {
    if (selectedPackageId === 'custom') return customPhotos * PRICE_PER_PHOTO[shootingType];
    const pkg = packages.find(p => p.id === selectedPackageId);
    return pkg ? pkg.price : 0;
  }, [selectedPackageId, customPhotos, shootingType, packages]);

  const photoCount = useMemo(() => {
    if (selectedPackageId === 'custom') return customPhotos;
    const pkg = packages.find(p => p.id === selectedPackageId);
    return pkg ? pkg.photos : 0;
  }, [selectedPackageId, customPhotos, packages]);

  const totalPrice = photoPrice + videoOption.price;

  const photoPackageLabel = useMemo(() => {
    const type = shootingType === 'studio' ? 'Studio' : 'Extérieur';
    return `${type} — ${photoCount} Photo(s) — ${formatPrice(photoPrice)}`;
  }, [shootingType, photoCount, photoPrice]);

  const videoLabel = videoOption.id === 'none'
    ? 'Aucune vidéo'
    : `${videoOption.label} — ${formatPrice(videoOption.price)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const dayWithTime = formData.time ? `${formData.day} à ${formData.time}` : formData.day;
      const newBooking = {
        name: formData.name,
        phone: formData.phone,
        day: dayWithTime,
        photo_package: photoPackageLabel,
        video_option: videoLabel,
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
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Error saving booking:', msg);
      setError('Une erreur est survenue. Vérifiez votre connexion ou réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveToLocal = (booking: Omit<Booking, 'id' | 'created_at'>): string => {
    const existingStr = localStorage.getItem('senpixel_local_bookings');
    const existing: Booking[] = existingStr ? JSON.parse(existingStr) : [];
    const newId = `local-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const completeBooking: Booking = { ...booking, id: newId, created_at: new Date().toISOString() };
    localStorage.setItem('senpixel_local_bookings', JSON.stringify([completeBooking, ...existing]));
    return newId;
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setFormData({ name: '', phone: '', day: 'Jour 1 de la Tabaski', time: '' });
    setShootingType('studio');
    setSelectedPackageId('studio-5');
    setCustomPhotos(3);
    setVideoOption(VIDEO_OPTIONS[0]);
  };

  const waText = `Bonjour SENPIXEL STUDIO, je souhaite confirmer ma réservation Tabaski.\n\n📋 Réf: ${createdBookingId?.slice(0, 8) || 'N/A'}\n👤 Nom: ${formData.name}\n📞 Téléphone: ${formData.phone}\n📅 Jour: ${formData.day}${formData.time ? ' à ' + formData.time : ''}\n📷 Formule: ${photoPackageLabel}\n🎬 Vidéo: ${videoLabel}\n💰 Total: ${formatPrice(totalPrice)}`;

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
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6 border border-orange-200 shadow-inner"
                >
                  <CheckCircle2 className="w-12 h-12 text-orange-500" />
                </motion.div>

                <h3 className="text-3xl font-extrabold text-slate-900 mb-3">Réservation Enregistrée !</h3>
                <p className="text-slate-700 text-lg max-w-md font-medium mb-2">
                  Merci <span className="text-orange-600 font-bold">{formData.name}</span>.
                </p>
                <div className="mb-4 p-3 bg-white/60 border border-slate-200 rounded-xl flex items-center justify-center gap-2 font-mono text-sm shadow-sm backdrop-blur-sm mx-auto max-w-xs">
                  <span className="text-slate-500">Réf:</span>
                  <strong className="text-slate-900 uppercase tracking-widest">{createdBookingId?.slice(0, 8) || 'N/A'}</strong>
                </div>

                <div className="mb-8 w-full max-w-md bg-white/50 border border-slate-200 rounded-2xl p-5 text-left space-y-2 text-sm">
                  <p className="font-bold text-slate-800 mb-3">Récapitulatif :</p>
                  <div className="flex justify-between">
                    <span className="text-slate-600">📅 Jour</span>
                    <span className="font-semibold text-slate-900">{formData.day}</span>
                  </div>
                  {formData.time && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">🕐 Heure</span>
                      <span className="font-semibold text-orange-600">{formData.time}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">📷 Photos</span>
                    <span className="font-semibold text-slate-900">{photoPackageLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">🎬 Vidéo</span>
                    <span className="font-semibold text-slate-900">{videoLabel}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between">
                    <span className="font-bold text-slate-800">TOTAL</span>
                    <span className="font-extrabold text-orange-600 text-base">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <p className="text-slate-700 text-lg max-w-md font-medium mb-8">
                  Confirmez votre séance via WhatsApp pour la valider définitivement.
                </p>

                <div className="flex flex-col items-center gap-4 w-full">
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-all shadow-[0_8px_20px_rgba(34,197,94,0.4)] hover:shadow-[0_12px_25px_rgba(34,197,94,0.5)] hover:-translate-y-1"
                  >
                    <MessageCircle className="w-6 h-6 fill-white" />
                    Confirmer sur WhatsApp
                  </a>
                  <button onClick={resetForm} className="mt-2 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">
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
                className="space-y-7 relative z-10"
              >
                {/* Nom */}
                <div className="space-y-2">
                  <label htmlFor="booking-name" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-500" /> Nom complet
                  </label>
                  <input
                    id="booking-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/60 border border-white/50 rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all shadow-sm"
                    placeholder="Ex: Aminata Diallo"
                  />
                </div>

                {/* Téléphone */}
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
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white/60 border border-white/50 rounded-2xl px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all shadow-sm"
                    placeholder="Ex: +221 77 123 45 67"
                  />
                </div>

                {/* Jour */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-500" /> Jour de la Tabaski
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['Jour 1 de la Tabaski', 'Jour 2', 'Jour 3'].map(day => (
                      <button key={day} type="button" onClick={() => setFormData({ ...formData, day })} className={dayBtnClass(formData.day === day)}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Heure de réservation */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" /> Heure souhaitée
                    <span className="text-xs font-normal text-slate-400">(optionnel)</span>
                  </label>
                  <div className="space-y-3">
                    {TIME_PERIODS.map(period => (
                      <div key={period.label}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{period.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {period.slots.map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setFormData({ ...formData, time: formData.time === slot ? '' : slot })}
                              className={formData.time === slot
                                ? 'px-3 py-2 rounded-xl text-sm font-bold border bg-orange-400 text-white border-orange-400 shadow-[0_3px_10px_rgba(251,146,60,0.35)] scale-105 transition-all'
                                : 'px-3 py-2 rounded-xl text-sm font-semibold border bg-white/60 border-white/50 text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all'}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {formData.time && (
                    <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                      <p className="text-sm text-orange-700 font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Créneau : <strong>{formData.time}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, time: '' })}
                        className="text-xs text-orange-400 hover:text-orange-600 font-semibold transition-colors"
                      >
                        Effacer
                      </button>
                    </div>
                  )}
                </div>

                {/* Type de shooting */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-orange-500" /> Type de shooting
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => handleTypeChange('studio')} className={typeBtnClass(shootingType === 'studio')}>
                      <Building2 className="w-5 h-5 flex-shrink-0" />
                      <span className="text-left">
                        <span className="block text-sm">Studio</span>
                        <span className="block text-xs font-normal opacity-70">Fond neutre</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => handleTypeChange('exterieur')} className={typeBtnClass(shootingType === 'exterieur')}>
                      <MapPin className="w-5 h-5 flex-shrink-0" />
                      <span className="text-left">
                        <span className="block text-sm">Extérieur</span>
                        <span className="block text-xs font-normal opacity-70">En décor naturel</span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* Packages prédéfinis */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Choisissez votre formule</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {packages.map(pkg => (
                      <button key={pkg.id} type="button" onClick={() => setSelectedPackageId(pkg.id)} className={pkgBtnClass(selectedPackageId === pkg.id)}>
                        <span className={selectedPackageId === pkg.id ? 'text-2xl font-extrabold text-orange-600' : 'text-2xl font-extrabold text-slate-800'}>
                          {pkg.photos}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 mb-1">photos</span>
                        <span className={selectedPackageId === pkg.id ? 'text-sm font-bold text-orange-500' : 'text-sm font-bold text-slate-700'}>
                          {formatPrice(pkg.price)}
                        </span>
                        {selectedPackageId === pkg.id && (
                          <span className="absolute top-2 right-2 w-2 h-2 bg-orange-400 rounded-full" />
                        )}
                      </button>
                    ))}

                    {/* Bouton "Mon nombre" */}
                    <button type="button" onClick={() => setSelectedPackageId('custom')} className={pkgBtnClass(selectedPackageId === 'custom')}>
                      <span className="text-xl mb-1">✏️</span>
                      <span className={selectedPackageId === 'custom' ? 'text-xs font-bold text-orange-600' : 'text-xs font-bold text-slate-700'}>
                        Mon nombre
                      </span>
                      <span className="text-xs font-normal text-slate-400 mt-0.5">perso</span>
                    </button>
                  </div>
                </div>

                {/* Compteur personnalisé */}
                <AnimatePresence>
                  {selectedPackageId === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-5">
                        <p className="text-sm font-bold text-slate-700 mb-4 text-center">
                          Combien de photos souhaitez-vous ?
                        </p>
                        <div className="flex items-center justify-center gap-5">
                          <button
                            type="button"
                            onClick={() => setCustomPhotos(n => Math.max(1, n - 1))}
                            className="w-12 h-12 rounded-full bg-white border border-orange-200 flex items-center justify-center text-orange-500 hover:bg-orange-100 hover:border-orange-400 transition-all shadow-sm"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <div className="text-center min-w-[80px]">
                            <span className="text-5xl font-extrabold text-orange-600 leading-none">{customPhotos}</span>
                            <p className="text-xs text-slate-500 mt-1">{customPhotos > 1 ? 'photos' : 'photo'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomPhotos(n => n + 1)}
                            className="w-12 h-12 rounded-full bg-white border border-orange-200 flex items-center justify-center text-orange-500 hover:bg-orange-100 hover:border-orange-400 transition-all shadow-sm"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Raccourcis rapides */}
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                          {[5, 10, 15, 20, 25, 30].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setCustomPhotos(n)}
                              className={customPhotos === n
                                ? 'px-3 py-1.5 rounded-full text-xs font-bold border bg-orange-400 text-white border-orange-400'
                                : 'px-3 py-1.5 rounded-full text-xs font-bold border bg-white text-slate-600 border-slate-200 hover:border-orange-300'}
                            >
                              {n}
                            </button>
                          ))}
                        </div>

                        <p className="text-center text-sm font-bold text-orange-600 mt-4">
                          {formatPrice(customPhotos * PRICE_PER_PHOTO[shootingType])}
                          <span className="text-xs text-slate-400 ml-1">
                            ({formatPrice(PRICE_PER_PHOTO[shootingType])}/photo)
                          </span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Option Vidéo */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Video className="w-4 h-4 text-orange-500" /> Option Vidéo
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {VIDEO_OPTIONS.map(opt => (
                      <button key={opt.id} type="button" onClick={() => setVideoOption(opt)} className={videoBtnClass(videoOption.id === opt.id)}>
                        {opt.id === 'none' && <span className="text-slate-400 text-2xl mb-1">✕</span>}
                        {opt.id === 'bl-vue' && <span className="text-2xl mb-1">🎥</span>}
                        {opt.id === 'cinematique' && <span className="text-2xl mb-1">🎬</span>}
                        <span className={videoOption.id === opt.id ? 'text-sm font-bold text-teal-700' : 'text-sm font-bold text-slate-700'}>
                          {opt.label}
                        </span>
                        {opt.price > 0 && (
                          <span className={videoOption.id === opt.id ? 'text-xs font-semibold mt-0.5 text-teal-500' : 'text-xs font-semibold mt-0.5 text-slate-500'}>
                            {formatPrice(opt.price)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Récapitulatif prix */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Récapitulatif</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">📷 {shootingType === 'studio' ? 'Studio' : 'Extérieur'} — {photoCount} photo{photoCount > 1 ? 's' : ''}</span>
                    <span className="font-bold text-slate-800">{formatPrice(photoPrice)}</span>
                  </div>
                  {videoOption.price > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">🎬 Vidéo {videoOption.label}</span>
                      <span className="font-bold text-slate-800">{formatPrice(videoOption.price)}</span>
                    </div>
                  )}
                  <div className="border-t border-orange-200 pt-2 flex justify-between">
                    <span className="font-bold text-slate-800">TOTAL ESTIMÉ</span>
                    <span className="font-extrabold text-orange-600 text-lg">{formatPrice(totalPrice)}</span>
                  </div>
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
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white font-bold text-lg transition-all shadow-[0_8px_20px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_25px_rgba(251,146,60,0.6)] mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Valider ma réservation →'}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
