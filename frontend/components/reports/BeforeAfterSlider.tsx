'use client';
import { useState, useRef, useEffect } from 'react';

interface SliderProps {
  beforeImage: string;
  afterImage: string;
}

export default function BeforeAfterSlider({ beforeImage, afterImage }: SliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current) return;
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="before-after-container relative w-full aspect-video select-none bg-black/40 overflow-hidden border border-white/10"
      onMouseDown={() => {
        isDragging.current = true;
      }}
      onTouchStart={() => {
        isDragging.current = true;
      }}
      onMouseMove={(e) => handleMove(e.clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      {/* After image (Underneath) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterImage} alt="After resolution" className="absolute inset-0 w-full h-full object-cover" />

      {/* Before image (Cropped above) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeImage} alt="Before issue" className="absolute inset-0 w-full h-full object-cover" />
      </div>

      {/* Slider Bar */}
      <div
        className="before-after-slider absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize z-30"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-black shadow-lg flex items-center justify-center font-bold text-xs pointer-events-none">
          ↔
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-2 left-2 bg-black/70 px-2.5 py-1 rounded text-[10px] font-bold text-red-400 uppercase tracking-widest z-40">
        Before
      </div>
      <div className="absolute bottom-2 right-2 bg-black/70 px-2.5 py-1 rounded text-[10px] font-bold text-green-400 uppercase tracking-widest z-40">
        After
      </div>
    </div>
  );
}
