import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    preferences: {
        favoriteGenres: { type: [String], default: [] },
        favoriteArtists: { type: [String], default: [] },
        listeningTime: { type: String, default: 'Late Night Chill' },
        audioQuality: { type: String, default: 'Hi-Fi (320k)' },
        listeningGoal: { type: String, default: '1-2 Hours' },
    },
    hasCompletedOnboarding: { type: Boolean, default: false },
    avatar: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
