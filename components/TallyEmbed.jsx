'use client';

import { useEffect } from 'react';
import { TALLY_FORM_EMBED_SRC, TALLY_FORM_FULL_SRC } from '@/lib/site-config';

function loadTallyEmbeds() {
  if (typeof window === 'undefined') return;

  const run = () => {
    if (typeof window.Tally !== 'undefined') {
      window.Tally.loadEmbeds();
      return;
    }

    document.querySelectorAll('iframe[data-tally-src]:not([src])').forEach((frame) => {
      frame.src = frame.dataset.tallySrc || '';
    });
  };

  const scriptSrc = 'https://tally.so/widgets/embed.js';
  if (typeof window.Tally !== 'undefined') {
    run();
    return;
  }

  if (document.querySelector(`script[src="${scriptSrc}"]`)) {
    run();
    return;
  }

  const script = document.createElement('script');
  script.src = scriptSrc;
  script.onload = run;
  script.onerror = run;
  document.body.appendChild(script);
}

export default function TallyEmbed({ variant = 'standard', title = 'Get in touch' }) {
  useEffect(() => {
    loadTallyEmbeds();
  }, [variant]);

  if (variant === 'full') {
    return (
      <iframe
        data-tally-src={TALLY_FORM_FULL_SRC}
        width="100%"
        height="100%"
        frameBorder="0"
        marginHeight={0}
        marginWidth={0}
        title={title}
        style={{ position: 'absolute', inset: 0, border: 0 }}
      />
    );
  }

  return (
    <iframe
      data-tally-src={TALLY_FORM_EMBED_SRC}
      loading="lazy"
      width="100%"
      height="589"
      frameBorder="0"
      marginHeight={0}
      marginWidth={0}
      title={title}
      style={{ border: 0, minHeight: 589 }}
    />
  );
}
