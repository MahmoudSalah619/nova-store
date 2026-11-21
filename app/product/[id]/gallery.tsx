"use client";

import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-surface">
        <Image src={images[active]} alt={title} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={active === i}
              className={`relative aspect-square overflow-hidden rounded-xl bg-surface ring-2 transition ${
                active === i ? "ring-foreground" : "ring-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="10vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
