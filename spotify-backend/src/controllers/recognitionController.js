import { recognizeAudioFile } from "../services/recognitionService.js";
import recognitionModel from "../models/recognitionModel.js";

/**
 * Identify song from uploaded audio sample
 * POST /api/recognition/identify
 */
export const identifySong = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio sample uploaded. Please provide a recorded audio file (.m4a / .wav / .mp3).",
      });
    }

    const filePath = req.file.path;
    const userId = req.body?.userId || req.user?.id || null;

    console.log(`🎙️ [PulseFind] Processing audio sample: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

    const result = await recognizeAudioFile(filePath);

    if (!result.match) {
      return res.json({
        success: true,
        match: false,
        reason: result.reason || 'not_found',
        message: result.message || 'No matching song found.',
      });
    }

    // Save successful recognition to MongoDB History
    try {
      const historyEntry = new recognitionModel({
        userId,
        songTitle: result.songTitle,
        artist: result.artist,
        album: result.album,
        releaseDate: result.releaseDate,
        duration: result.duration,
        artworkUrl: result.artworkUrl,
        confidence: result.confidence || 95,
        provider: result.provider || 'audd',
        inPulseSound: result.inPulseSound || false,
        pulseSongId: result.pulseSongId || null,
        externalLinks: result.externalLinks || {},
        recognizedAt: new Date(),
      });
      await historyEntry.save();
      result.historyId = historyEntry._id;
    } catch (saveErr) {
      console.warn("⚠️ [PulseFind] Could not persist to history collection:", saveErr.message);
    }

    return res.json({
      success: true,
      match: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ [PulseFind] Error identifying song:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to identify music sample. Please try again.",
    });
  }
};

/**
 * Get recognition history
 * GET /api/recognition/history
 */
export const getRecognitionHistory = async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;
    const query = userId ? { userId } : {};

    const history = await recognitionModel
      .find(query)
      .sort({ recognizedAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('pulseSongId');

    return res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("❌ [PulseFind] Error fetching history:", error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve recognition history.",
    });
  }
};

/**
 * Delete a specific recognition record
 * DELETE /api/recognition/history/:id
 */
export const deleteHistoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "History item ID required." });
    }

    await recognitionModel.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Recognition record removed from history.",
    });
  } catch (error) {
    console.error("❌ [PulseFind] Error deleting history item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete history record.",
    });
  }
};

/**
 * Clear all recognition history
 * DELETE /api/recognition/history/clear
 */
export const clearRecognitionHistory = async (req, res) => {
  try {
    const { userId } = req.query;
    const query = userId ? { userId } : {};

    await recognitionModel.deleteMany(query);

    return res.json({
      success: true,
      message: "PULSE FIND recognition history cleared successfully.",
    });
  } catch (error) {
    console.error("❌ [PulseFind] Error clearing history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear recognition history.",
    });
  }
};

