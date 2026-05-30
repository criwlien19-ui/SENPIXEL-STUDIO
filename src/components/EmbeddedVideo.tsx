import { useState, useCallback, useRef } from 'react';
import { Loader2, VideoOff, Play, RefreshCw, Maximize2 } from 'lucide-react';

type EmbeddedVideoProps = {
  url: string;
  className?: string;
  controls?: boolean;
  title?: string;
};

type EmbedInfo = {
  type: 'drive' | 'youtube' | 'vimeo' | 'direct' | 'unknown';
  embedUrl: string;
  thumbnailUrl?: string;
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
      autoplay: '1',
    });
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?${params.toString()}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/);
  if (vimeoMatch) {
    const params = new URLSearchParams({
      playsinline: '1',
      dnt: '1',
      autoplay: '1',
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

// ─── Lecteur vidéo directe (mp4, webm…) ──────────────────────────────────────
function DirectVideoPlayer({
  src,
  controls,
  title,
}: {
  src: string;
  controls: boolean;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // "started" = l'utilisateur a tapé une fois → on cache le bouton play définitivement
  const [started, setStarted] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleLoad = useCallback(() => setLoading(false), []);
  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const handleStart = useCallback(() => {
    setStarted(true);
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);

  const handleFullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
    else if ((v as any).webkitEnterFullscreen) (v as any).webkitEnterFullscreen();
  }, []);

  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    setStarted(false);
    setRetryKey((k) => k + 1);
  }, []);

  return (
    <div className="absolute inset-0 bg-black">
      {loading && !error && <LoadingOverlay />}
      {error ? (
        <ErrorOverlay onRetry={handleRetry} />
      ) : (
        <>
          <video
            key={retryKey}
            ref={videoRef}
            src={src}
            controls={controls}
            preload="metadata"
            playsInline
            // attributs propriétaires iOS / WeChat
            {...({ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' } as any)}
            className="absolute inset-0 w-full h-full object-contain"
            onLoadedMetadata={handleLoad}
            onError={handleError}
            aria-label={title}
          />

          {/* Bouton "tap to play" — disparaît après le premier tap (state one-shot) */}
          {!started && !loading && (
            <button
              onClick={handleStart}
              className="absolute inset-0 flex items-center justify-center z-10 bg-black/25 touch-manipulation"
              aria-label="Lire la vidéo"
            >
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/60 shadow-2xl active:scale-95 transition-transform">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </span>
            </button>
          )}

          {/* Bouton plein écran flottant (uniquement sans contrôles natifs) */}
          {started && !controls && (
            <button
              onClick={handleFullscreen}
              className="absolute bottom-3 right-3 z-20 p-2 rounded-full bg-black/50 text-white active:scale-95 transition-transform touch-manipulation"
              aria-label="Plein écran"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Lecteur iframe (YouTube, Vimeo, Drive) ───────────────────────────────────
function IframePlayer({
  embedUrl,
  allow,
  title,
  thumbnailUrl,
}: {
  embedUrl: string;
  allow: string;
  title: string;
  thumbnailUrl?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // "activated" = iframe chargé après tap sur miniature (évite autoplay bloqué iOS)
  const [activated, setActivated] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleLoad = useCallback(() => setLoading(false), []);
  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);
  const handleRetry = useCallback(() => {
    setError(false);
    setLoading(true);
    setActivated(false);
    setRetryKey((k) => k + 1);
  }, []);
  const handleActivate = useCallback(() => setActivated(true), []);

  return (
    <div className="absolute inset-0 bg-black">
      {/* ── Avant activation : miniature + bouton play ── */}
      {!activated && !error && (
        <button
          onClick={handleActivate}
          className="absolute inset-0 w-full h-full touch-manipulation group/play"
          aria-label={`Lire ${title}`}
        >
          {thumbnailUrl ? (
            <>
              <img
                src={thumbnailUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/30 group-hover/play:bg-black/20 transition-colors" />
            </>
          ) : (
            <div className="absolute inset-0 bg-slate-900" />
          )}

          {/* Bouton play central */}
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className={`flex items-center justify-center w-16 h-16 rounded-full border-2 border-white/50 shadow-2xl transition-transform active:scale-95 group-hover/play:scale-110 ${
                thumbnailUrl ? 'bg-red-600/90' : 'bg-white/20 backdrop-blur-md border-white/60'
              }`}
            >
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </span>
          </span>
        </button>
      )}

      {/* ── Après activation : iframe ── */}
      {activated && !error && (
        <>
          {loading && <LoadingOverlay />}
          <iframe
            key={retryKey}
            title={title}
            src={embedUrl}
            allow={allow}
            allowFullScreen
            loading="eager"
            className="absolute inset-0 w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
          />
        </>
      )}

      {error && <ErrorOverlay onRetry={handleRetry} />}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function EmbeddedVideo({
  url,
  className = '',
  controls = true,
  title = 'Vidéo',
}: EmbeddedVideoProps) {
  if (!url) return null;

  const { type, embedUrl, thumbnailUrl } = getEmbedInfo(url);

  if (type === 'direct') {
    return (
      <div className={`absolute inset-0 ${className}`}>
        <DirectVideoPlayer src={embedUrl} controls={controls} title={title} />
      </div>
    );
  }

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
    <div className={`absolute inset-0 ${className}`}>
      <IframePlayer
        embedUrl={embedUrl}
        allow={iframeAllow}
        title={iframeTitle}
        thumbnailUrl={thumbnailUrl}
      />
    </div>
  );
}

// ─── Overlays ─────────────────────────────────────────────────────────────────
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/90 backdrop-blur-sm pointer-events-none">
      <div className="relative">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
        <div className="absolute inset-0 rounded-full bg-orange-400/20 animate-ping" />
      </div>
      <span className="text-slate-300 text-sm font-medium tracking-wide">Chargement…</span>
    </div>
  );
}

function ErrorOverlay({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-400 px-4">
      <div className="p-4 rounded-full bg-slate-800">
        <VideoOff className="w-8 h-8 text-slate-500" />
      </div>
      <span className="text-sm font-medium text-center text-slate-400">
        Impossible de charger la vidéo
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-sm font-semibold transition-all touch-manipulation shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      )}
    </div>
  );
}
