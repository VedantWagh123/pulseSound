import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
    name: { type: String, required: true },
    desc: { type: String, required: true },
    album: { type: String, required: true },
    artist: { type: String, default: "Pulse Artist" },
    image: { type: String, required: true },
    file: { type: String, required: true },
    video: { type: String, default: "" },
    videoPublicId: { type: String, default: "" },
    videoStartTime: { type: Number, default: 0 }, // Video crop start time in seconds (kaha se)
    videoEndTime: { type: Number, default: 0 },   // Video crop end time in seconds (kaha tak, 0 = end of file)
    videoSongDelay: { type: Number, default: 5 }, // Seconds into song playback before video starts (kab se shuru)
    streamUrl96k: { type: String },
    streamUrl128k: { type: String },
    originalFile: { type: String },
    publicId: { type: String },
    fileSize: { type: Number, default: 0 },
    duration: { type: String, required: true },
    durationMillis: { type: Number, default: 180000 },
    bitrate: { type: Number, default: 128000 },
    isPlaylistOnly: { type: Boolean, default: false },
    playlistId: { type: mongoose.Schema.Types.ObjectId, ref: 'playlist' },
    fullscreenImage: { type: Boolean, default: false },
    imageDisplayMode: { type: String, enum: ['regular', 'fullscreen'], default: 'regular' },
    youtubeVideoId: { type: String, default: "" },
    isYoutubeSong: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

const songModel = mongoose.models.song || mongoose.model("song", songSchema);

export default songModel;
