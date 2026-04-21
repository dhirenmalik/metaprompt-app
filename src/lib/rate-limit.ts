// Simple in-memory rate limiter for serverless functions
// NOTE: State resets on cold start. For production, use Upstash Ratelimit or similar.

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(
  ip: string,
  options: RateLimitOptions = { maxRequests: 10, windowMs: 60_000 },
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean up expired entries periodically (prevent memory leak)
  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap) {
      if (val.resetAt < now) rateLimitMap.delete(key);
    }
  }

  if (!entry || entry.resetAt < now) {
    const resetAt = now + options.windowMs;
    rateLimitMap.set(ip, { count: 1, resetAt });
    return { success: true, remaining: options.maxRequests - 1, resetAt };
  }

  if (entry.count >= options.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    success: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}
