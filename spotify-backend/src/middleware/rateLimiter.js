// In-memory sliding window rate limiter
const requestCounts = new Map();

// Periodic cleanup of stale rate-limit records every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requestCounts.entries()) {
        if (now - record.startTime > 60000) {
            requestCounts.delete(key);
        }
    }
}, 300000);

export const rateLimiter = (options = {}) => {
    const windowMs = options.windowMs || 60 * 1000; // 1 minute default
    const maxRequests = options.max || 120; // 120 requests per window
    const message = options.message || "Too many requests. Please try again in a moment.";

    return (req, res, next) => {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const key = `${ip}_${req.baseUrl || req.path}`;
        const now = Date.now();

        let record = requestCounts.get(key);

        if (!record || now - record.startTime > windowMs) {
            record = {
                startTime: now,
                count: 1,
            };
            requestCounts.set(key, record);
            return next();
        }

        record.count++;

        if (record.count > maxRequests) {
            return res.status(429).json({
                success: false,
                message,
                retryAfterSeconds: Math.ceil((record.startTime + windowMs - now) / 1000),
            });
        }

        next();
    };
};
