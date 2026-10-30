import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    filename: function (req, file, callback) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'audio') {
        const allowedAudio = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac'];
        if (allowedAudio.includes(ext) || file.mimetype.startsWith('audio/') || file.mimetype.includes('video/')) {
            return callback(null, true);
        }
        return callback(new Error(`Invalid audio file format (${ext}). Allowed: ${allowedAudio.join(', ')}`), false);
    }

    if (file.fieldname === 'image') {
        const allowedImage = ['.jpg', '.jpeg', '.png', '.webp'];
        if (allowedImage.includes(ext) || file.mimetype.startsWith('image/')) {
            return callback(null, true);
        }
        return callback(new Error(`Invalid image file format (${ext}). Allowed: ${allowedImage.join(', ')}`), false);
    }

    if (file.fieldname === 'video') {
        const allowedVideo = ['.mp4', '.webm', '.mov', '.mkv', '.m4v'];
        if (allowedVideo.includes(ext) || file.mimetype.startsWith('video/')) {
            return callback(null, true);
        }
        return callback(new Error(`Invalid video file format (${ext}). Allowed: ${allowedVideo.join(', ')}`), false);
    }

    callback(null, true);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 250 * 1024 * 1024, // 250 MB maximum file size limit (supports large studio WAV/FLAC & 4K video)
    },
    fileFilter: fileFilter,
});

export default upload;
