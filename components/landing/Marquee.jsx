'use client';

const ITEMS = [
  'ATS Optimized',
  'Keyword Matching',
  'Cover Letters',
  'Match Scoring',
  'Live Job Search',
  'PDF Export',
  '30-Second Tailoring',
  'Stack-Aware AI',
];

export default function Marquee() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className="lp-marquee-wrap landing-section">
      <div className="lp-marquee-track">
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="lp-marquee-item">
            <span className="lp-marquee-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
