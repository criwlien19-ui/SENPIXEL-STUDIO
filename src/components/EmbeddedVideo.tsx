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
      responsive: '1',
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
  const [playing, setPlaying] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleLoad = useCallback(() => setLoading(false), []);
  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);
  const handlePlay = useCallback(() => setPlaying(true), []);
  const handlePause = useCallback(() => setPlaying(false), []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
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
    setRetryKey((k) => k + 1);
  }, []);

  return (
    <div className="absolute inset-0 bg-black group touch-manipulation">
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
            webkit-playsinline="true"
            x5-playsinline="true"
            className="w-full h-full object-contain"
            onLoadedMetadata={handleLoad}
            onError={handleError}
            onPlay={handlePlay}
            onPause={handlePause}
            aria-label={title}
          />

          {/* Bouton play central — visible quand en pause sur mobile */}
          {!playing && !loading && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 active:bg-black/40 transition-colors touch-manipulation"
              aria-label="Lire la vidéo"
            >
              <span className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/60 shadow-2xl active:scale-95 transition-transform">
                <Play className="w-7 h-7 md:w-9 md:h-9 text-white fill-white ml-1" />
              </span>
            </button>
          )}

          {/* Bouton plein écran (mobile) — visible sur tap/hover */}
          {!controls && playing && (
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

  // Sur mobile : cliquer sur la miniature charge l'iframe (évite autoplay bloqué)
  const handleActivate = useCallback(() => setActivated(true), []);

  return (
    <div className="absolute inset-0 bg-black touch-manipulation">
      {/* Miniature YouTube avant activation */}
      {!activated && !error && thumbnailUrl && (
        <button
          onClick={handleActivate}
          className="absolute inset-0 w-full h-full touch-manipulation group/play"
          aria-label={`Lire ${title}`}
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 group-hover/play:bg-black/20 transition-colors" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600/90 backdrop-blur-sm border-2 border-white/40 shadow-2xl active:scale-95 transition-transform group-hover/play:bg-red-500 group-hover/play:scale-110">
              <Play className="w-7 h-7 md:w-9 md:h-9 text-white fill-white ml-1" />
            </span>
          </span>
        </button>
      )}

      {/* Chargement sans miniature */}
      {!activated && !error && !thumbnailUrl && (
        <button
          onClick={handleActivate}
          className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center touch-manipulation"
          aria-label={`Lire ${title}`}
        >
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/60 shadow-2xl active:scale-95 transition-transform">
            <Play className="w-7 h-7 text-white fill-white ml-1" />
          </span>
        </button>
      )}

      {/* Iframe — chargé après activation */}
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
