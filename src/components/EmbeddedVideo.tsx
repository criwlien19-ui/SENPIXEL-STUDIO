import { useState, useCallback } from 'react';
import { Loader2, VideoOff } from 'lucide-react';

type EmbeddedVideoProps = {
  url: string;
  /** classe appliquée au wrapper — utilisez `absolute inset-0` si le parent est relative+aspect-ratio */
  className?: string;
  controls?: boolean;
};

type EmbedInfo = {
  type: 'drive' | 'youtube' | 'vimeo' | 'direct' | 'unknown';
  embedUrl: string;
};

function getEmbedInfo(url: string): EmbedInfo {
  if (!url) return { type: 'unknown', embedUrl: '' };

  // Google Drive
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  const driveMatch2 = url.match(/drive\.google\.com\/.*[?&]id=([^&]+)/);
  const driveId = driveMatch?.[1] ?? driveMatch2?.[1] ?? null;
  if (driveId) {
    return {
      type: 'drive',
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview?usp=sharing`,
    };
  }

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  if (ytMatch) {
    const videoId = ytMatch[1];
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      enablejsapi: '1',
    });
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?${params.toString()}`,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/);
  if (vimeoMatch) {
    const params = new URLSearchParams({
      playsinline: '1',
      dnt: '1',
    });
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?${params.toString()}`,
    };
  }

  // Lien direct mp4/webm/ogg/mov
  if (
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) ||
    url.startsWith('blob:') ||
    url.startsWith('data:video')
  ) {
    return { type: 'direct', embedUrl: url };
  }

  return { type: 'unknown', embedUrl: url };
}

export default function EmbeddedVideo({ url, className = '', controls = true }: EmbeddedVideoProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoading(false), []);
  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  if (!url) return null;

  const { type, embedUrl } = getEmbedInfo(url);

  // ── Vidéo directe (mp4, webm, mov…) ──────────────────────────────────────
  if (type === 'direct') {
    return (
      <div className={`absolute inset-0 bg-slate-900 ${className}`}>
        {loading && <LoadingOverlay />}
        {error ? (
          <ErrorOverlay />
        ) : (
          <video
            src={embedUrl}
            controls={controls}
            preload="metadata"
            playsInline
            className="w-full h-full object-contain"
            onLoadedMetadata={handleLoad}
            onError={handleError}
          />
        )}
      </div>
    );
  }

  // ── Iframe (YouTube, Vimeo, Google Drive) ─────────────────────────────────
  const iframeAllow =
    type === 'youtube'
      ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      : type === 'vimeo'
      ? 'autoplay; fullscreen; picture-in-picture'
      : 'autoplay';

  const iframeTitle =
    type === 'youtube'
      ? 'Vidéo YouTube'
      : type === 'vimeo'
      ? 'Vidéo Vimeo'
      : type === 'drive'
      ? 'Vidéo Google Drive'
      : 'Vidéo intégrée';

  return (
    <div className={`absolute inset-0 bg-slate-900 ${className}`}>
      {loading && !error && <LoadingOverlay />}
      {error ? (
        <ErrorOverlay />
      ) : (
        <iframe
          title={iframeTitle}
          src={embedUrl}
          allow={iframeAllow}
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900/80 backdrop-blur-sm">
      <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      <span className="text-slate-300 text-sm font-medium">Chargement…</span>
    </div>
  );
}

function ErrorOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900 text-slate-400">
      <VideoOff className="w-10 h-10 text-slate-500" />
      <span className="text-sm font-medium text-center px-4">
        Impossible de charger la vidéo
      </span>
    </div>
  );
}
