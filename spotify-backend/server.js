import express from "express";
import cors from 'cors';
import 'dotenv/config';
import mongoose from "mongoose";
import connectCloudinary from "./src/config/cloudinary.js";
import connectDB from "./src/config/mongodb.js";
import songRouter from "./src/routes/songRoute.js";
import albumRouter from "./src/routes/albumRoute.js";
import userRouter from "./src/routes/userRoute.js";
import playlistRouter from "./src/routes/playlistRoute.js";
import recognitionRouter from "./src/routes/recognitionRoute.js";
import youtubeRouter from "./src/routes/youtubeRoute.js";

import { rateLimiter } from "./src/middleware/rateLimiter.js";

// App config
const app = express();
const port = process.env.PORT || 4000;

// Initialize Services
connectCloudinary();
connectDB();

// Middlewares
app.use(express.json());
app.use(cors());

// ─── HTTP Cache Headers for Static Catalogue Endpoints ───────────────────────
// Songs, albums, playlists rarely change — cache them 60s on client + CDN edge.
// This makes the app feel Spotify-fast: second open loads instantly from cache.
app.use('/api/song/list', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    next();
});
app.use('/api/album/list', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    next();
});
app.use('/api/playlist/list', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    next();
});

// Global Rate Limiter: max 120 reqs/minute
app.use(rateLimiter({ max: 120, message: "Too many requests. Please slow down." }));

// Live Request Logger
app.use((req, res, next) => {
    console.log(`📡 [API] ${req.method} ${req.url} (from ${req.ip || 'client'})`);
    next();
});

// Stricter Rate Limiter for Auth endpoints: max 30 reqs/minute
app.use("/api/user", rateLimiter({ max: 30, message: "Too many authentication attempts. Please try again in a minute." }));

// Initializing Routers
app.use("/api/song", songRouter);
app.use("/api/album", albumRouter);
app.use("/api/user", userRouter);
app.use("/api/playlist", playlistRouter);
app.use("/api/recognition", recognitionRouter);
app.use("/api/youtube", youtubeRouter);

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        status: "Online",
        service: "Pulse Sound Music API",
        version: "1.0.0",
        mongoConnected: mongoose.connection.readyState === 1,
        endpoints: {
            songs: "/api/song/list",
            albums: "/api/album/list",
            playlists: "/api/playlist/list",
            recognition: "/api/recognition/identify",
            recognitionHistory: "/api/recognition/history",
        }
    });
});

// Global Centralized Express Error Handling Middleware (Ensures clean JSON responses for Multer & runtime errors)
app.use((err, req, res, next) => {
    console.error('🚨 [Express Error Handler]:', err.message || err);
    if (err.name === 'MulterError') {
        let userMessage = `Upload Error: ${err.message}`;
        if (err.code === 'LIMIT_FILE_SIZE') {
            userMessage = 'File is too large. Maximum allowed file size is 250MB.';
        }
        return res.status(400).json({ success: false, message: userMessage });
    }
    return res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unexpected server error occurred',
    });
});

// Fail-safe protection against unexpected network drops or stream errors
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception caught safely:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection caught safely:', reason?.message || reason);
});

app.listen(port, () => {
    console.log(`🚀 Pulse Sound Server running on port ${port} (http://localhost:${port})`);
});
