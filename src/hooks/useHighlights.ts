import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type Highlight = {
  id: string;
  url: string;
  title: string;
  likes: number;
};

const DEFAULT_HIGHLIGHTS: Highlight[] = [
  {
    id: 'vid-1',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    title: 'Ambiance Studio Tabaski',
    likes: 42
  },
];

export function useHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charge les highlights depuis Supabase ou localStorage
  const loadHighlights = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('highlights')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setHighlights(data as Highlight[]);
          setIsLoaded(true);
          return;
        }
      } catch (err) {
        console.warn('Supabase highlights fetch failed, falling back to localStorage', err);
      }
    }

    // Fallback localStorage
    const saved = localStorage.getItem('senpixel_highlights_val');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setHighlights(parsed);
          setIsLoaded(true);
          return;
        }
      } catch (_e) {
        // ignore
      }
    }

    // Données par défaut
    setHighlights(DEFAULT_HIGHLIGHTS);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // Sauvegarde dans localStorage comme cache quand Supabase n'est pas configuré
  useEffect(() => {
    if (!isLoaded || isSupabaseConfigured) return;
    try {
      localStorage.setItem('senpixel_highlights_val', JSON.stringify(highlights));
    } catch (e) {
      console.error('localStorage quota exceeded', e);
    }
  }, [highlights, isLoaded]);

  const toggleLike = (id: string) => {
    const likedKey = `liked_vid_${id}`;
    const alreadyLiked = sessionStorage.getItem(likedKey);
    if (alreadyLiked) {
      sessionStorage.removeItem(likedKey);
      setHighlights((prev: Highlight[]) =>
        prev.map((p: Highlight) => p.id === id ? { ...p, likes: Math.max(0, p.likes - 1) } : p)
      );
    } else {
      sessionStorage.setItem(likedKey, 'true');
      setHighlights((prev: Highlight[]) =>
        prev.map((p: Highlight) => p.id === id ? { ...p, likes: p.likes + 1 } : p)
      );
    }
  };

  const addHighlight = async (videoUrl: string, title: string = '') => {
    const newHighlight: Highlight = {
      id: `vid-${Date.now()}`,
      url: videoUrl,
      title: title,
      likes: 0
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('highlights')
          .insert([newHighlight])
          .select()
          .single();

        if (!error && data) {
          setHighlights((prev: Highlight[]) => [data as Highlight, ...prev]);
          return;
        } else {
          console.error('Supabase insert error:', error);
        }
      } catch (err) {
        console.warn('Supabase insert failed, falling back to localStorage', err);
      }
    }

    // Fallback localStorage
    const next = [newHighlight, ...highlights];
    try {
      localStorage.setItem('senpixel_highlights_val', JSON.stringify(next));
      setHighlights(next);
    } catch (e) {
      alert("Stockage plein. Supprimez des vidéos avant d'en ajouter de nouvelles.");
    }
  };

  const deleteHighlight = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('highlights').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete failed', err);
      }
    }
    setHighlights((prev: Highlight[]) => prev.filter((p: Highlight) => p.id !== id));
  };

  return { highlights, toggleLike, addHighlight, deleteHighlight, reloadHighlights: loadHighlights };
}
