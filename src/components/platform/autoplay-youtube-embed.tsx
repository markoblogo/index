"use client";

import { useEffect, useRef, useState } from "react";

type AutoplayYoutubeEmbedProps = {
  title: string;
  videoId: string;
};

export function AutoplayYoutubeEmbed({
  title,
  videoId,
}: AutoplayYoutubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldAutoplay(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const youtubeSrc =
    `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1&rel=0&modestbranding=1`;
  const poster = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[1rem] border border-white/16 bg-black/70"
      ref={containerRef}
    >
      <div className="relative aspect-video">
        {shouldAutoplay ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
            loading="lazy"
            src={youtubeSrc}
            title={title}
          />
        ) : (
          <>
            <img
              alt={`${title} video poster`}
              className="h-full w-full object-cover"
              src={poster}
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
              <span className="rounded-full bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#07100c]">
                ▶ Scroll to start
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
