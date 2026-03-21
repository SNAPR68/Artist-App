'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface MediaItem {
  id: string;
  media_type: 'image' | 'video';
  original_url: string;
  thumbnail_url?: string;
  cdn_url?: string;
}

interface ArtistGalleryProps {
  media: MediaItem[];
  artistName: string;
}

export function ArtistGallery({ media, artistName }: ArtistGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!media.length) return null;

  const getUrl = (item: MediaItem) => item.cdn_url ?? item.original_url;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden mb-6">
        {media.slice(0, 5).map((item, i) => (
          <button
            key={item.id}
            onClick={() => setLightboxIndex(i)}
            className={`relative bg-surface-elevated overflow-hidden group ${
              i === 0 ? 'col-span-2 row-span-2 aspect-[4/3]' : 'aspect-video'
            }`}
          >
            {item.media_type === 'image' ? (
              <Image
                src={getUrl(item)}
                alt={`${artistName} ${i + 1}`}
                fill
                sizes="(max-width: 768px) 33vw, 300px"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-surface-card flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play size={20} className="text-white ml-0.5" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

            {/* Show remaining count on last visible item */}
            {i === 4 && media.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-semibold">+{media.length - 5}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-modal bg-black/90 flex items-center justify-center p-4 transition-opacity duration-300 opacity-100"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 z-10"
          >
            <X size={20} />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 z-10"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          {lightboxIndex < media.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 z-10"
            >
              <ChevronRight size={20} />
            </button>
          )}

          <div
            className="max-w-4xl max-h-[80vh] transition-all duration-300 scale-100 opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            {media[lightboxIndex].media_type === 'image' ? (
              <Image
                src={getUrl(media[lightboxIndex])}
                alt={`${artistName} ${lightboxIndex + 1}`}
                width={800}
                height={600}
                sizes="(max-width: 768px) 100vw, 800px"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <div className="w-full aspect-video bg-surface-card rounded-lg flex items-center justify-center text-text-muted">
                Video Player
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
