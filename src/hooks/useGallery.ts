import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type Photo = {
  id: string;
  url: string;
  span: string;
  isBest: boolean;
  likes: number;
  caption?: string;
};

// Type tel que stocké dans Supabase (snake_case)
type PhotoRow = {
  id: string;
  url: string;
  span: string;
  is_best: boolean;
  likes: number;
  caption?: string;
  created_at?: string;
};

const mapRow = (row: PhotoRow): Photo => ({
  id: row.id,
  url: row.url,
  span: row.span,
  isBest: row.is_best,
  likes: row.likes,
  caption: row.caption,
});

const DEFAULT_PHOTOS: Photo[] = [
  { id: 'img-0', url: 'https://i.imgur.com/G598cdL.jpeg', span: 'col-span-2 md:col-span-1 row-span-2', isBest: true, likes: 42 },
  { id: 'img-6', url: 'https://imgur.com/ExZWmFu.jpeg', span: 'col-span-2 md:col-span-1 row-span-2', isBest: true, likes: 38 },
  { id: 'img-7', url: 'https://imgur.com/Zv8iIJj.jpeg', span: 'col-span-2 md:col-span-1 row-span-2', isBest: false, likes: 15 },
  { id: 'img-8', url: 'https://imgur.com/gBuSJ3D.jpeg', span: 'col-span-2 md:col-span-1 row-span-2', isBest: true, likes: 56 },
  { id: 'img-1', url: 'https://i.imgur.com/X2wkok0.jpeg', span: 'col-span-1 row-span-2', isBest: false, likes: 23 },
  { id: 'img-2', url: 'https://i.imgur.com/DSFeSUa.jpeg', span: 'col-span-1 row-span-2', isBest: false, likes: 18 },
  { id: 'img-3', url: 'https://i.imgur.com/jt0YJ7z.jpeg', span: 'col-span-2 md:col-span-1 row-span-2', isBest: false, likes: 31 },
  { id: 'img-4', url: 'https://i.imgur.com/Ev40pNL.jpeg', span: 'col-span-2 md:col-span-3 row-span-2', isBest: false, likes: 89 },
  { id: 'img-5', url: 'https://imgur.com/y8W9rL7.jpeg', span: 'col-span-2 md:col-span-3 row-span-2', isBest: false, likes: 104 },
];

export function useGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // ─── Charger les photos depuis Supabase (ou fallback localStorage) ───────
  const loadPhotos = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('gallery_photos')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setPhotos((data as PhotoRow[]).map(mapRow));
          setIsLoaded(true);
          return;
        }
        if (error) {
          console.warn('[useGallery] Supabase fetch error:', error.message);
        }
      } catch (err) {
        console.warn('[useGallery] Supabase fetch failed:', err);
      }
    }

    // Fallback : localStorage
    const saved = localStorage.getItem('senpixel_gallery_val');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setPhotos(parsed);
          setIsLoaded(true);
          return;
        }
      } catch (_e) { /* ignore */ }
    }

    // Données par défaut
    setPhotos(DEFAULT_PHOTOS);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // ─── Realtime : écouter les changements de la table gallery_photos ────────
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('gallery_photos_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gallery_photos' },
        () => {
          // Recharger les photos à chaque changement (insert, update, delete)
          loadPhotos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPhotos]);

  // ─── toggleLike ──────────────────────────────────────────────────────────
  const toggleLike = async (id: string) => {
    const likedKey = `liked_${id}`;
    const alreadyLiked = sessionStorage.getItem(likedKey);
    const delta = alreadyLiked ? -1 : 1;

    if (alreadyLiked) {
      sessionStorage.removeItem(likedKey);
    } else {
      sessionStorage.setItem(likedKey, 'true');
    }

    // Optimistic update
    setPhotos(prev =>
      prev.map(p => p.id === id ? { ...p, likes: Math.max(0, p.likes + delta) } : p)
    );

    if (isSupabaseConfigured) {
      const current = photos.find(p => p.id === id);
      if (current) {
        await supabase
          .from('gallery_photos')
          .update({ likes: Math.max(0, current.likes + delta) })
          .eq('id', id);
      }
    }
  };

  // ─── toggleBestOfDay ─────────────────────────────────────────────────────
  const toggleBestOfDay = async (id: string) => {
    const current = photos.find(p => p.id === id);
    if (!current) return;
    const newValue = !current.isBest;

    // Optimistic update
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, isBest: newValue } : p));

    if (isSupabaseConfigured) {
      await supabase
        .from('gallery_photos')
        .update({ is_best: newValue })
        .eq('id', id);
    }
  };

  // ─── addPhoto : accepte un File → upload vers Supabase Storage ───────────
  const addPhoto = async (file: File): Promise<void> => {
    if (!isSupabaseConfigured) {
      // Fallback base64 local (si Supabase non configuré)
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const newPhoto: Photo = {
            id: `img-${Date.now()}`,
            url: dataUrl,
            span: 'col-span-1 row-span-2',
            isBest: false,
            likes: 0,
          };
          const next = [newPhoto, ...photos];
          try {
            localStorage.setItem('senpixel_gallery_val', JSON.stringify(next));
            setPhotos(next);
            resolve();
          } catch (err) {
            reject(new Error("Stockage local plein. Supprimez des photos avant d'en ajouter."));
          }
        };
        reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
        reader.readAsDataURL(file);
      });
    }

    // ── Upload vers Supabase Storage ──
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `photo_${Date.now()}.${ext}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('gallery')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      throw new Error(`Erreur upload Storage: ${uploadError.message}`);
    }

    // Récupérer l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from('gallery')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Insérer en base
    const { data, error: insertError } = await supabase
      .from('gallery_photos')
      .insert([{
        url: publicUrl,
        span: 'col-span-1 row-span-2',
        is_best: false,
        likes: 0,
      }])
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erreur insertion DB: ${insertError.message}`);
    }

    if (data) {
      setPhotos(prev => [mapRow(data as PhotoRow), ...prev]);
    }
  };

  // ─── deletePhoto ─────────────────────────────────────────────────────────
  const deletePhoto = async (id: string) => {
    // Optimistic update
    setPhotos(prev => prev.filter(p => p.id !== id));

    if (isSupabaseConfigured) {
      // Supprimer le fichier du Storage si c'est une URL Supabase
      const photo = photos.find(p => p.id === id);
      if (photo?.url.includes('supabase')) {
        const urlParts = photo.url.split('/public/gallery/');
        if (urlParts[1]) {
          await supabase.storage
            .from('gallery')
            .remove([`public/${urlParts[1]}`]);
        }
      }

      await supabase.from('gallery_photos').delete().eq('id', id);
    }
  };

  const updatePhotos = (newPhotos: Photo[]) => {
    setPhotos(newPhotos);
  };

  return { photos, isLoaded, toggleLike, toggleBestOfDay, updatePhotos, addPhoto, deletePhoto, reloadPhotos: loadPhotos };
}
