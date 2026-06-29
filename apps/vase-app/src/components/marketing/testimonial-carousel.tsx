"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function TestimonialCarousel({ items }: { items: string[][] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center", skipSnaps: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="relative mx-auto w-full max-w-[92rem] px-0 py-8">
      <div className="overflow-hidden cursor-grab active:cursor-grabbing pb-8" ref={emblaRef}>
        <div className="flex -ml-4">
          {items.map((item, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0 pl-4 sm:flex-[0_0_65%] lg:flex-[0_0_45%] py-4">
              <article 
                className={`transition-all duration-500 rounded-[36px] p-8 md:p-12 h-full flex flex-col justify-between ${
                  index === selectedIndex 
                    ? "bg-white/90 shadow-[0_30px_60px_rgba(59,99,61,0.08)] scale-100 opacity-100 backdrop-blur-2xl border border-[rgba(59,99,61,0.1)]" 
                    : "bg-white/50 shadow-sm scale-95 opacity-60 backdrop-blur-xl border border-transparent"
                }`}
              >
                <div>
                  <div className="mb-8 flex gap-1.5 text-[var(--accent)]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className="size-5 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    ))}
                  </div>
                  <p className="text-xl md:text-2xl font-medium leading-relaxed tracking-tight text-[var(--foreground)]">
                    "{item[0]}"
                  </p>
                </div>
                <div className="mt-12 flex items-center gap-4">
                  <div className="size-12 rounded-[20px] bg-[linear-gradient(135deg,#3B633D_0%,#739374_100%)] text-white grid place-items-center font-bold text-lg shadow-[0_8px_16px_rgba(59,99,61,0.2)]">
                    {item[1].charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[var(--foreground)]">{item[1]}</p>
                    <p className="text-sm font-medium text-[var(--muted)]">{item[2]}</p>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
      
      <button 
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 size-12 md:size-14 rounded-full bg-white/90 backdrop-blur-xl shadow-[0_12px_24px_rgba(59,99,61,0.1)] grid place-items-center text-[var(--foreground)] hover:bg-white transition-all border border-[rgba(59,99,61,0.05)] scale-90 md:scale-100"
        aria-label="Previous testimonial"
      >
        <ChevronLeft className="size-6 text-[var(--accent)]" />
      </button>
      <button 
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 size-12 md:size-14 rounded-full bg-white/90 backdrop-blur-xl shadow-[0_12px_24px_rgba(59,99,61,0.1)] grid place-items-center text-[var(--foreground)] hover:bg-white transition-all border border-[rgba(59,99,61,0.05)] scale-90 md:scale-100"
        aria-label="Next testimonial"
      >
        <ChevronRight className="size-6 text-[var(--accent)]" />
      </button>
    </div>
  );
}
