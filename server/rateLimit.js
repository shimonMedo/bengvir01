const buckets = new Map();

export function rateLimit(request, response, next) {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = Math.max(2, Number(process.env.AI_BURST_LIMIT) || 10);
  const key = request.ip || request.socket.remoteAddress || 'local';
  const recent = (buckets.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= limit) {
    response.set('Retry-After', '60');
    return response.status(429).json({ error: 'נשלחו יותר מדי בקשות בזמן קצר. נסו שוב בעוד דקה.' });
  }
  recent.push(now);
  buckets.set(key, recent);
  next();
}
