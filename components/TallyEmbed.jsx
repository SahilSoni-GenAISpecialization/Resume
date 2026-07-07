'use client';

import { useEffect, useRef, useState } from 'react';
import { TALLY_FORM_EMBED_SRC, TALLY_FORM_FULL_SRC } from '@/lib/site-config';

const TALLY_SCRIPT_SRC = 'https://tally.so/widgets/embed.js';
let tallyScriptPromise = null;

function loadTallyScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);

  if (typeof window.Tally !== 'undefined') {
    return Promise.resolve(true);
  }

  if (tallyScriptPromise) return tallyScriptPromise;

  tallyScriptPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${TALLY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = TALLY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return tallyScriptPromise;
}

function activateTallyEmbeds() {
  if (typeof window.Tally !== 'undefined') {
    window.Tally.loadEmbeds();
    return;
  }

  document.querySelectorAll('iframe[data-tally-src]:not([src])').forEach((frame) => {
    frame.src = frame.dataset.tallySrc || '';
  });
}

export default function TallyEmbed({ variant = 'standard', title = 'Get in touch' }) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setIsVisible(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return undefined;

    let cancelled = false;

    const boot = async () => {
      const loaded = await loadTallyScript();
      if (cancelled) return;

      if (!loaded) {
        setLoadError(true);
        return;
      }

      activateTallyEmbeds();
      setIsReady(true);
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(() => {
        void boot();
      });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timer = window.setTimeout(() => {
      void boot();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isVisible, variant]);

  const embedSrc = variant === 'full' ? TALLY_FORM_FULL_SRC : TALLY_FORM_EMBED_SRC;
  const frameHeight = variant === 'full' ? '100%' : 589;

  return (
    <div ref={containerRef} className="tally-embed-shell" style={{ minHeight: variant === 'full' ? '100%' : 589 }}>
      {!isReady && !loadError && (
        <div className="tally-embed-skeleton" aria-hidden="true">
          <div className="tally-embed-skeleton-line" />
          <div className="tally-embed-skeleton-line short" />
          <div className="tally-embed-skeleton-block" />
        </div>
      )}

      {loadError && (
        <p className="tally-embed-error">
          The form could not load. Please refresh the page or email us directly.
        </p>
      )}

      {isVisible && !loadError && (
        <iframe
          data-tally-src={embedSrc}
          src={isReady ? embedSrc : undefined}
          loading="lazy"
          width="100%"
          height={frameHeight}
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          title={title}
          style={{
            border: 0,
            minHeight: variant === 'full' ? '100%' : 589,
            position: variant === 'full' ? 'absolute' : 'relative',
            inset: variant === 'full' ? 0 : undefined,
            opacity: isReady ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}
    </div>
  );
}
