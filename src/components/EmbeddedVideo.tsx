import { useState, useCallback } from 'react';
import ReactPlayer from 'react-player';
import { Loader2, VideoOff, RefreshCw } from 'lucide-react';

type EmbeddedVideoProps = {
  url: string;
  className?: string;
  controls?: boolean;
  title?: string;
};

export default function EmbeddedVideo({
  url,
  className = '',
  controls = true,
  title = 'Vidéo',
}: EmbeddedVideoProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback(() => {
    setReady(false);
    setError(true);
  }, []);
  const handleRetry = useCallback(() => {
    setError(false);
    setReady(false);
    setRetryKey((k) => k + 1);
  }, []);

  if (!url) return null;

  return (
    <div className={`absolute inset-0 bg-black ${className}`} aria-label={title}>
      {/* Spinner pendant le chargement */}
      {!ready && !error && <LoadingOverlay />}

      {/* Erreur */}
      {error && <ErrorOverlay onRetry={handleRetry} />}

      {/* Lecteur react-player v3 */}
      {!error && (
        <ReactPlayer
          key={retryKey}
          src={url}
          controls={controls}
          playsInline
          width="100%"
          height="100%"
          // config youtube : paramètres passés via l'attribut natif du web component
          config={{
            youtube: { colorScheme: 'dark' } as Record<string, unknown>,
            vimeo: { color: 'ff6b00' } as Record<string, unknown>,
          }}
          style={{ position: 'absolute', top: 0, left: 0 }}
          onReady={handleReady}
          onError={handleError}
        />
      )}
    </div>
  );
}

// ─── Overlays ─────────────────────────────────────────────────────────────────
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900 pointer-events-none">
      <div className="relative flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
        <div className="absolute w-14 h-14 rounded-full bg-orange-400/15 animate-ping" />
      </div>
      <span className="text-slate-400 text-sm font-medium tracking-wide">Chargement…</span>
    </div>
  );
}

function ErrorOverlay({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-900 px-4">
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
