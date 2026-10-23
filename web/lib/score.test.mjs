import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreMessage } from './score.mjs';

test('flags a classic JazzCash scam', () => {
  const r = scoreMessage('URGENT: Your JazzCash account is blocked. Verify your CNIC and OTP now: http://bit.ly/abc123');
  assert.equal(r.verdict, 'scam');
});

test('harmless message is likely_safe', () => {
  assert.equal(scoreMessage('Hey, dinner at 8?').verdict, 'likely_safe');
});

test('"wonderful" does not trigger the prize rule', () => {
  assert.equal(scoreMessage('That was a wonderful dinner').score, 0);
});

test('extracts links', () => {
  assert.deepEqual(scoreMessage('see http://a.xyz/x now').urls, ['http://a.xyz/x']);
});