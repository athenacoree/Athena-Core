import React from 'react';
import { Download, ExternalLink } from 'lucide-react';

interface WikipediaResult {
  title: string;
  extract: string;
  thumbnail?: string;
  content_urls?: string;
  description?: string;
  error?: string;
}

interface YouTubeResult {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  embedUrl: string;
  videoUrl: string;
}

interface GoogleImageResult {
  title: string;
  link: string;
  displayLink: string;
  snippet: string;
  thumbnail?: string;
  contextLink?: string;
}

const downloadMedia = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error downloading media:', error);
    window.open(url, '_blank');
  }
};

export const WikipediaRenderer = ({ data }: { data: WikipediaResult }) => {
  if (data.error) {
    return <div className="text-red-500">{data.error}</div>;
  }
  return (
    <div className="iphone-blur my-2 overflow-hidden rounded-2xl border border-white/20 p-4 shadow-xl text-text-primary">
      <div className="flex flex-col gap-4 sm:flex-row">
        {data.thumbnail && (
          <img
            src={data.thumbnail}
            alt={data.title}
            className="h-32 w-full rounded-xl object-cover sm:w-32"
          />
        )}
        <div className="flex-1">
          <h3 className="mb-1 text-lg font-bold text-text-primary">{data.title}</h3>
          {data.description && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
              {data.description}
            </p>
          )}
          <p className="line-clamp-3 text-sm leading-relaxed text-text-primary">{data.extract}</p>
          {data.content_urls && (
            <a
              href={data.content_urls}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-500 hover:underline"
            >
              Leer más en Wikipedia <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export const YouTubeRenderer = ({ data }: { data: YouTubeResult[] }) => {
  if (!Array.isArray(data)) {
     const anyData = data as any;
     if (anyData.error) return <div className="text-red-500 font-medium my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{anyData.error}</div>;
     return null;
  }
  return (
    <div className="my-2 flex flex-col gap-4">
      {data.map((video) => (
        <div
          key={video.videoId}
          className="iphone-blur overflow-hidden rounded-2xl border border-white/20 shadow-xl"
        >
          <div className="aspect-video w-full">
            <iframe
              src={video.embedUrl}
              title={video.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="p-4">
            <h3 className="line-clamp-2 text-base font-bold text-text-primary">{video.title}</h3>
            <p className="mt-1 text-xs text-text-secondary">{video.channelTitle}</p>
            <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{video.description}</p>
            <div className="mt-4 flex gap-3">
              <a
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-600"
              >
                Ver en YouTube <ExternalLink size={14} />
              </a>
              <button
                onClick={() =>
                  window.open(`https://www.youtubepp.com/watch?v=${video.videoId}`, '_blank')
                }
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-text-primary transition-colors hover:bg-white/20 border border-white/10"
              >
                Descargar <Download size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const GoogleImageRenderer = ({ data }: { data: GoogleImageResult[] }) => {
  if (!Array.isArray(data)) {
    const anyData = data as any;
    if (anyData.error) return <div className="text-red-500 font-medium my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{anyData.error}</div>;
    return null;
  }
  return (
    <div className="my-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {data.map((image, i) => (
        <div
          key={i}
          className="iphone-blur group relative aspect-square overflow-hidden rounded-2xl border border-white/20 shadow-lg"
        >
          <img
            src={image.link}
            alt={image.title}
            className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-110"
            onClick={() => window.open(image.link, '_blank')}
          />
          <div className="absolute bottom-0 left-0 right-0 flex translate-y-full items-center justify-between bg-black/40 p-2 backdrop-blur-md transition-transform group-hover:translate-y-0">
            <span className="max-w-[70%] truncate text-[10px] text-white">{image.displayLink}</span>
            <button
              onClick={() => downloadMedia(image.link, `img-${i}.jpg`)}
              className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/40"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
