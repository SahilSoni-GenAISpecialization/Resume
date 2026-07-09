'use client';

import { useMemo } from 'react';
import { parseJobDescriptionBlocks } from '@/lib/job-description-format';

export default function FormattedJobDescription({ text, emptyMessage = 'Full job description is not available for this listing.' }) {
  const blocks = useMemo(() => parseJobDescriptionBlocks(text), [text]);

  if (!blocks.length) {
    return <div className="formatted-jd empty">{emptyMessage}</div>;
  }

  return (
    <div className="formatted-jd">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h4 key={index} className="formatted-jd-heading">
              {block.text}
            </h4>
          );
        }

        if (block.type === 'label') {
          return (
            <p key={index} className="formatted-jd-label">
              <span className="formatted-jd-label-key">{block.label}</span> {block.value}
            </p>
          );
        }

        if (block.type === 'list') {
          return (
            <ul key={index} className="formatted-jd-list">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="formatted-jd-paragraph">
            {block.text}
          </p>
        );
      })}

      <style jsx>{`
        .formatted-jd {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .formatted-jd.empty {
          color: #64748b;
          font-size: 14px;
        }
        .formatted-jd-heading {
          margin: 8px 0 0;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #0f172a;
        }
        .formatted-jd-heading:first-child {
          margin-top: 0;
        }
        .formatted-jd-label {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: #334155;
        }
        .formatted-jd-label-key {
          font-weight: 700;
          color: #0f172a;
        }
        .formatted-jd-paragraph {
          margin: 0;
          font-size: 14px;
          line-height: 1.8;
          color: #334155;
        }
        .formatted-jd-list {
          margin: 0;
          padding-left: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .formatted-jd-list li {
          position: relative;
          padding-left: 18px;
          font-size: 14px;
          line-height: 1.75;
          color: #334155;
        }
        .formatted-jd-list li::before {
          content: '•';
          position: absolute;
          left: 0;
          top: 0;
          color: #2563eb;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
