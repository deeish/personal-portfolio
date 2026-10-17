import React, { useEffect, useRef } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';

// Text that decodes itself from random glyphs the first time it scrolls into view.
export default function ScrambleText({ as: Tag = 'span', text, className, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || reduced || !('IntersectionObserver' in window)) return undefined;

    let raf = 0;
    const run = () => {
      const start = performance.now();
      const duration = 260 + text.length * 38;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const settled = Math.floor(t * text.length);
        let out = text.slice(0, settled);
        for (let i = settled; i < text.length; i++) {
          out += text[i] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        el.textContent = out;
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        run();
        observer.disconnect();
      }
    }, { threshold: 0.6 });
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [text]);

  return (
    <Tag ref={ref} className={className} aria-label={text} {...rest}>
      {text}
    </Tag>
  );
}
