import React from 'react';

type EmbeddedVideoProps = {
  url: string;
  className?: string;
  controls?: boolean;
};

export default function EmbeddedVideo({ url, className = "", controls = true }: EmbeddedVideoProps) {
  if (!url) return null;

  // Google Drive Link
  let driveId: string | null = null;
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    driveId = driveMatch[1];
  } else {
    const driveMatch2 = url.match(/drive\.google\.com\/.*[?&]id=([^&]+)/);
    if (driveMatch2) {
      driveId = driveMatch2[1];
    }
  }

  if (driveId) {
    const embedUrl = `https://drive.google.com/file/d/${driveId}/preview`;
    return (
      <iframe
        title="Vidéo intégrée: Google Drive"
        className={className}
        src={embedUrl}
        allow="autoplay"
        allowFullScreen
        style={{ border: 'none', width: '100%', height: '100%' }}
      ></iframe>
    );
  }
  
  // YouTube Link
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  if (ytMatch) {
    const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    return (
      <iframe
        title="Vidéo intégrée: YouTube"
        className={className}
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ border: 'none', width: '100%', height: '100%' }}
      ></iframe>
    );
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/);
  if (vimeoMatch) {
     const embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
     return (
        <iframe
          title="Vidéo intégrée: Vimeo"
          className={className}
          src={embedUrl}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ border: 'none', width: '100%', height: '100%' }}
        ></iframe>
     );
  }

  // Fallback to standard video element for direct mp4 links or base64 files
  return <video src={url} className={className} controls={controls} preload="metadata" playsInline />;
}
