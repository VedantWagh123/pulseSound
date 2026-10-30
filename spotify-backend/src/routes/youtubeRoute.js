import express from 'express';
import { resolveYouTube, proxyStream, downloadYouTube, importYouTubeAdmin } from '../controllers/youtubeController.js';
import upload from '../middleware/multer.js';

const youtubeRouter = express.Router();

youtubeRouter.post('/resolve', resolveYouTube);
youtubeRouter.get('/stream/:videoId', proxyStream);
youtubeRouter.get('/download/:videoId', downloadYouTube);
youtubeRouter.post('/import-admin', upload.any(), importYouTubeAdmin);

export default youtubeRouter;

