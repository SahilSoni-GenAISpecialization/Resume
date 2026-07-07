import { filterAddressedSuggestions, suggestionsOverlap } from '@/lib/profile-data';

export type MatchScoreContext = {
  priorScore: number | null;
  profileAdditionCount: number;
  wovenCount: number;
  addressedCount: number;
  /** Remaining improvement tips after filtering addressed items. */
  remainingTips?: number | null;
};

/** Strength bullets in "why this score" should not offer Add to Resume actions. */
export function isLikelyStrengthReason(text: string): boolean {
  const t = String(text || '').toLowerCase().trim();
  if (!t) return false;
  if (/\b(lack|missing|gap|without|need to|should add|consider adding|obtain|does not|doesn't|no evidence|not mentioned|not listed)\b/.test(t)) {
    return false;
  }
  return (
    /^(strong|excellent|solid|good|impressive|extensive|proven|demonstrated|aligned|relevant|includes|has|well[- ]matched|robust|deep|notable)\b/.test(t) ||
    (/\b(years of|experience with|background in|foundation|strength|proficien)\b/.test(t) &&
      !/\b(however|but|although|while)\b/.test(t))
  );
}

export function isSuggestionAddressed(text: string, addressed: string[]): boolean {
  if (!text || !addressed?.length) return false;
  return addressed.some((item) => suggestionsOverlap(text, item));
}

export function filterMatchAnalysis(
  reasons: string[],
  tips: string[],
  addressed: string[]
): { reasons: string[]; tips: string[] } {
  return {
    reasons: filterAddressedSuggestions(reasons, addressed),
    tips: filterAddressedSuggestions(tips, addressed),
  };
}

/** Keep score from dropping after profile/resume improvements; boost when gaps are addressed. */
export function applyMatchScoreAdjustments(
  rawScore: number | null,
  ctx: MatchScoreContext
): number | null {
  if (rawScore === null || !Number.isFinite(rawScore)) return null;

  let score = Math.round(Math.max(0, Math.min(100, rawScore)));
  const { priorScore, profileAdditionCount, wovenCount, addressedCount, remainingTips } = ctx;

  if (priorScore !== null) {
    if (profileAdditionCount > 0 && score < priorScore) {
      score = priorScore;
    }

    if (wovenCount > 0) {
      const boost = Math.min(Math.round(wovenCount * 2), 24);
      score = Math.max(score, priorScore + boost);
      if (score < priorScore) score = priorScore;
    }
  } else if (wovenCount > 0) {
    const boost = Math.min(Math.round(wovenCount * 2), 24);
    score = Math.max(score, score + boost);
  }

  const addressed = addressedCount ?? 0;
  const tipsLeft = remainingTips ?? null;

  if (tipsLeft === 0 && (addressed > 0 || wovenCount > 0)) {
    const completionFloor = Math.max(91, priorScore ?? score);
    score = Math.max(score, completionFloor);
  }

  return Math.min(100, score);
}
