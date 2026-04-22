import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  type KeyboardEvent,
  type TouchEvent,
  type WheelEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface PhotoGalleryProps {
  urls: string[];
  altBase: string;
  imageClassName?: string;
}

export function PhotoGallery({
  urls,
  altBase,
  imageClassName = 'h-40 w-full rounded-theme-surface object-cover',
}: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const wheelLockRef = useRef(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [urls.length, urls[0]]);

  if (urls.length === 0) return null;

  const activeUrl = urls[activeIndex] ?? urls[0];
  const hasMultipleImages = urls.length > 1;

  function showPreviousImage() {
    setActiveIndex((currentIndex) => Math.max(0, currentIndex - 1));
  }

  function showNextImage() {
    setActiveIndex((currentIndex) => Math.min(urls.length - 1, currentIndex + 1));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (!hasMultipleImages) return;

    const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(movement) < 18 || wheelLockRef.current) return;

    event.preventDefault();
    wheelLockRef.current = true;

    if (movement > 0) {
      showNextImage();
    } else {
      showPreviousImage();
    }

    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 220);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!hasMultipleImages || touchStartXRef.current === null) return;

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = touchStartXRef.current - touchEndX;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) < 36) return;

    if (deltaX > 0) {
      showNextImage();
    } else {
      showPreviousImage();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!hasMultipleImages) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNextImage();
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPreviousImage();
    }
  }

  return (
    <div
      tabIndex={hasMultipleImages ? 0 : -1}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      className="group relative outline-none"
    >
      <img
        src={activeUrl}
        alt={`${altBase} image ${activeIndex + 1}`}
        className={imageClassName}
        loading="lazy"
      />

      {hasMultipleImages ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={showPreviousImage}
            disabled={activeIndex === 0}
            className="pointer-events-none absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 scale-95 items-center justify-center rounded-theme-control bg-black/45 text-white opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:scale-95 disabled:opacity-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={showNextImage}
            disabled={activeIndex === urls.length - 1}
            className="pointer-events-none absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 scale-95 items-center justify-center rounded-theme-control bg-black/45 text-white opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:scale-95 disabled:opacity-0"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-1.5 py-1">
              {urls.map((_, index) => (
                <button
                  key={`gallery-dot-${index}`}
                  type="button"
                  aria-label={`Show image ${index + 1}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeIndex
                      ? 'w-5 bg-white'
                      : 'w-2.5 bg-white/45 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
