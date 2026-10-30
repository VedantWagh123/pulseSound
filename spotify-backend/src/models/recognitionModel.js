import mongoose from "mongoose";

const recognitionSchema = new mongoose.Schema({
  userId: { type: String, default: null },
  songTitle: { type: String, required: true },
  artist: { type: String, required: true },
  album: { type: String, default: "Unknown Album" },
  releaseDate: { type: String, default: "" },
  duration: { type: String, default: "" },
  artworkUrl: { type: String, default: "" },
  confidence: { type: Number, default: 95 },
  provider: { type: String, default: "audd" },
  inPulseSound: { type: Boolean, default: false },
  pulseSongId: { type: mongoose.Schema.Types.ObjectId, ref: 'song', default: null },
  externalLinks: {
    spotify: { type: String, default: "" },
    appleMusic: { type: String, default: "" },
    youtube: { type: String, default: "" },
    songLink: { type: String, default: "" },
  },
  recognizedAt: { type: Date, default: Date.now },
});

const recognitionModel = mongoose.models.recognition || mongoose.model("recognition", recognitionSchema);

export default recognitionModel;

