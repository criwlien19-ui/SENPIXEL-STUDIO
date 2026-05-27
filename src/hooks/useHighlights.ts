import { useState, useEffect } from 'react';

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
  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    const saved = localStorage.getItem('senpixel_highlights_val');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_HIGHLIGHTS;
      }
    }
    return DEFAULT_HIGHLIGHTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('senpixel_highlights_val', JSON.stringify(highlights));
    } catch (e) {
      console.error("Failed to save to localStorage, quota exceeded?", e);
    }
  }, [highlights]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'senpixel_highlights_val' && event.newValue) {
        try {
          setHighlights(JSON.parse(event.newValue));
        } catch (e) {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleLike = (id: string) => {
    const likedKey = `liked_vid_${id}`;
    const alreadyLiked = sessionStorage.getItem(likedKey);
    if (alreadyLiked) {
      // Déjà liké : retirer le like
      sessionStorage.removeItem(likedKey);
      setHighlights(prev => prev.map(p => p.id === id ? { ...p, likes: Math.max(0, p.likes - 1) } : p));
    } else {
      sessionStorage.setItem(likedKey, 'true');
      setHighlights(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
    }
  };

  const addHighlight = (videoUrl: string, title: string = '') => {
    const newHighlight: Highlight = {
      id: `vid-${Date.now()}`,
      url: videoUrl,
      title: title,
      likes: 0
    };
    const next = [newHighlight, ...highlights];
    try {
      localStorage.setItem('senpixel_highlights_val', JSON.stringify(next));
      setHighlights(next);
    } catch (e) {
      alert("Stockage plein. Supprimez des vidéos avant d'en ajouter de nouvelles.");
    }
  };

  const deleteHighlight = (id: string) => {
    setHighlights(prev => prev.filter(p => p.id !== id));
  };

  return { highlights, toggleLike, addHighlight, deleteHighlight };
}
