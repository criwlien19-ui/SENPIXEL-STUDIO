import { useState, useEffect } from 'react';

export type Photo = {
  id: string;
  url: string;
  span: string;
  isBest: boolean;
  likes: number;
  caption?: string;
};

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
  const [photos, setPhotos] = useState<Photo[]>(() => {
    const saved = localStorage.getItem('senpixel_gallery_val');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_PHOTOS;
      }
    }
    return DEFAULT_PHOTOS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('senpixel_gallery_val', JSON.stringify(photos));
    } catch (e) {
      console.error("Failed to save to localStorage, quota exceeded?", e);
    }
  }, [photos]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'senpixel_gallery_val' && event.newValue) {
        try {
          setPhotos(JSON.parse(event.newValue));
        } catch (e) {
          // ignore parsing error
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleLike = (id: string) => {
    const likedKey = `liked_${id}`;
    const alreadyLiked = sessionStorage.getItem(likedKey);
    if (alreadyLiked) {
      // Déjà liké : retirer le like
      sessionStorage.removeItem(likedKey);
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, likes: Math.max(0, p.likes - 1) } : p));
    } else {
      sessionStorage.setItem(likedKey, 'true');
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
    }
  };

  const toggleBestOfDay = (id: string) => {
    setPhotos(prev => prev.map(p => 
      p.id === id ? { ...p, isBest: !p.isBest } : p
    ));
  };

  const updatePhotos = (newPhotos: Photo[]) => {
    setPhotos(newPhotos);
  };

  const addPhoto = (base64Url: string) => {
    const newPhoto: Photo = {
      id: `img-${Date.now()}`,
      url: base64Url,
      span: 'col-span-1 row-span-2',
      isBest: false,
      likes: 0
    };
    const next = [newPhoto, ...photos];
    try {
      localStorage.setItem('senpixel_gallery_val', JSON.stringify(next));
      setPhotos(next);
    } catch (e) {
      alert("Stockage plein. Supprimez des photos avant d'en ajouter de nouvelles.");
    }
  };

  const deletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  return { photos, toggleLike, toggleBestOfDay, updatePhotos, addPhoto, deletePhoto };
}
