export function scoreMessage(text = '') {
  const raw = String(text);
  const lower = raw.toLowerCase();
  const urls = raw.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi) || [];

  let score = 0;
  const reasons = [];
  const rule = (cond, pts, why) => { if (cond) { score += pts; reasons.push(why); } };

  rule(/\b(urgent|immediately|within 24 hours|last warning|suspended|blocked)\b/.test(lower), 20, 'Creates urgency or fear');
  rule(/\b(won|prize|lottery|reward|bisp|cashback|free gift)\b/.test(lower), 25, 'Promises money or prizes');
  rule(/\b(otp|pin code|cnic|password|verify your account|cvv)\b/.test(lower), 30, 'Asks for sensitive info');
  rule(/registration fee|earn daily|work from home|whatsapp.*job/.test(lower), 20, 'Looks like a job scam');
  rule(urls.some((u) => /bit\.ly|tinyurl|cutt\.ly|t\.co|shorturl/i.test(u)), 20, 'Uses a shortened link');
  rule(urls.some((u) => /\.(xyz|top|click|icu|live|rest)(\/|$)/i.test(u)), 15, 'Suspicious domain ending');
  rule(urls.some((u) => /https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(u)), 25, 'Link uses a raw IP address');

  score = Math.min(score, 100);
  const verdict = score >= 60 ? 'scam' : score >= 30 ? 'suspicious' : 'likely_safe';
  return { verdict, score, reasons, urls };
}