import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    desc: { type: String, required: true },
    theory: { type: String, default: '' },
    image: { type: String, required: true },
    bgColour: { type: String, default: '#7C3AED' },
    bgColor: { type: String, default: '#7C3AED' },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'song' }],
    isPublic: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const playlistModel = mongoose.models.playlist || mongoose.model('playlist', playlistSchema);
export default playlistModel;
