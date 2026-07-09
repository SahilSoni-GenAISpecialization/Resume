import { htmlToFormattedText } from './job-providers/types.js';

/** Normalize HTML or plain-text job descriptions for display and AI tailoring. */
export function formatJobDescriptionText(value = '') {
  let text = htmlToFormattedText(value);

  text = text
    .replace(/^[•\uFFFD?]\s*(?=[A-Za-z][^:\n]{0,50}:\s*\S)/gm, '')
    .replace(/\uFFFD/g, '•')
    .replace(/â€¢/gi, '•')
    .replace(/â€"/g, '—')
    .replace(/â\?\?/g, '—')
    .replace(/\?\?/g, '—')
    .replace(/^\?\s+/gm, '• ')
    .replace(/\n\?\s+/g, '\n• ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function isSectionHeading(line) {
  return /^[A-Z][A-Za-z0-9\s/&'()-]{2,60}:\s*$/.test(line);
}

function isLabelLine(line) {
  return /^[A-Za-z][^:\n]{0,80}:\s+\S/.test(line);
}

function isBulletLine(line) {
  return /^[•\-*–—]\s+/.test(line);
}

function stripBulletPrefix(line) {
  return line.replace(/^[•\-*–—]\s+/, '').trim();
}

/** Parse formatted plain text into renderable blocks. */
export function parseJobDescriptionBlocks(text = '') {
  const normalized = formatJobDescriptionText(text);
  if (!normalized) return [];

  const lines = normalized.split('\n').map((line) => line.trim());
  const blocks = [];
  let pendingBullets = [];

  const flushBullets = () => {
    if (!pendingBullets.length) return;
    blocks.push({ type: 'list', items: [...pendingBullets] });
    pendingBullets = [];
  };

  for (const line of lines) {
    if (!line) continue;

    if (isBulletLine(line)) {
      pendingBullets.push(stripBulletPrefix(line));
      continue;
    }

    flushBullets();

    if (isSectionHeading(line)) {
      blocks.push({ type: 'heading', text: line.replace(/:\s*$/, '') });
      continue;
    }

    if (isLabelLine(line)) {
      const idx = line.indexOf(':');
      blocks.push({
        type: 'label',
        label: line.slice(0, idx + 1),
        value: line.slice(idx + 1).trim(),
      });
      continue;
    }

    blocks.push({ type: 'paragraph', text: line });
  }

  flushBullets();
  return blocks;
}
