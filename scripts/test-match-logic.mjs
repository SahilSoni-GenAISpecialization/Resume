/**
 * Quick sanity checks for match scoring / dedup logic.
 * Run: node scripts/test-match-logic.mjs
 */

import {
  suggestionsOverlap,
  filterAddressedSuggestions,
  normalizeSuggestionKey,
} from '../lib/profile-data.ts';
import {
  applyMatchScoreAdjustments,
  filterMatchAnalysis,
  isLikelyStrengthReason,
  isSuggestionAddressed,
} from '../lib/match-scoring.ts';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log('Match logic tests\n');

console.log('suggestionsOverlap');
assert(
  'same CCNA gap in different wording',
  suggestionsOverlap(
    'Highlight CCNA certification experience in your networking section',
    'Add CCNA certification to strengthen network credentials'
  )
);
assert(
  'unrelated items do not overlap',
  !suggestionsOverlap('Add Python scripting skills', 'Obtain PMP certification')
);

console.log('\nisSuggestionAddressed');
const addressed = [
  'Highlight CCNA certification experience in your networking section',
  'Add technical documentation experience to your resume bullets',
];
assert(
  'reworded CCNA tip is addressed',
  isSuggestionAddressed('Consider mentioning your CCNA certification more prominently', addressed)
);

console.log('\nfilterMatchAnalysis');
const filtered = filterMatchAnalysis(
  [
    'Strong core networking foundation with routing and switching experience',
    'Missing CCNA certification called out in the job posting',
  ],
  [
    'Highlight CCNA certification experience in your networking section',
    'Add firewall configuration experience to your skills section',
  ],
  addressed
);
assert('filters overlapping tips', filtered.tips.length === 1);
assert('filters overlapping gap reasons', filtered.reasons.length === 1);
assert('keeps strength reason', filtered.reasons[0].includes('Strong core networking'));

console.log('\napplyMatchScoreAdjustments');
assert(
  'woven items boost score from prior baseline',
  applyMatchScoreAdjustments(52, {
    priorScore: 58,
    profileAdditionCount: 0,
    wovenCount: 10,
    addressedCount: 10,
  }) >= 78
);
assert(
  'profile additions prevent score drop',
  applyMatchScoreAdjustments(43, {
    priorScore: 65,
    profileAdditionCount: 3,
    wovenCount: 0,
    addressedCount: 3,
  }) === 65
);
assert(
  'no prior score leaves AI score unchanged',
  applyMatchScoreAdjustments(58, {
    priorScore: null,
    profileAdditionCount: 0,
    wovenCount: 0,
    addressedCount: 0,
  }) === 58
);

console.log('\nisLikelyStrengthReason');
assert(
  'detects strength bullet',
  isLikelyStrengthReason('Strong core networking foundation with routing and switching experience')
);
assert(
  'detects gap bullet',
  !isLikelyStrengthReason('Missing CCNA certification required by the posting')
);

assert(
  'no remaining tips after addressing bumps score above 90%',
  applyMatchScoreAdjustments(57, {
    priorScore: 57,
    profileAdditionCount: 0,
    wovenCount: 0,
    addressedCount: 12,
    remainingTips: 0,
  }) >= 91
);

assert(
  'prior 85% completion score rises above 90%',
  applyMatchScoreAdjustments(85, {
    priorScore: 85,
    profileAdditionCount: 0,
    wovenCount: 0,
    addressedCount: 8,
    remainingTips: 0,
  }) >= 91
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
