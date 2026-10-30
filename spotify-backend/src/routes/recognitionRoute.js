import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import {
  identifySong,
  getRecognitionHistory,
  deleteHistoryItem,
  clearRecognitionHistory,
} from '../controllers/recognitionController.js';

const recognitionRouter = express.Router();

// Configure temporary disk storage for incoming audio samples
const uploadDir = os.tmpdir();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, `pulse_sample_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 12 * 1024 * 1024, // 12 MB max audio sample
  },
});

// Identify route
recognitionRouter.post('/identify', upload.single('audio'), identifySong);

// History routes
recognitionRouter.get('/history', getRecognitionHistory);
recognitionRouter.delete('/history/clear', clearRecognitionHistory);
recognitionRouter.delete('/history/:id', deleteHistoryItem);

export default recognitionRouter;

