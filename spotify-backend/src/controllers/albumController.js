import { v2 as cloudinary } from 'cloudinary';
import albumModel from '../models/albumModel.js';

const addAlbum = async (req, res) => {
    try {
        const { name, desc } = req.body;
        const color = req.body.bgColour || req.body.bgColor || "#7C3AED";

        if (!name || !desc) {
            return res.status(400).json({
                success: false,
                message: "name and desc are required",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Album cover image is required",
            });
        }

        const imageFile = req.file;
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" });

        const albumData = {
            name,
            desc,
            bgColour: color,
            bgColor: color,
            image: imageUpload.secure_url,
        };

        const album = new albumModel(albumData);
        await album.save();

        res.json({ success: true, message: "Album Added Successfully", album });
    } catch (error) {
        console.error("Error adding album:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const listAlbum = async (req, res) => {
    try {
        const allAlbums = await albumModel.find({}).sort({ _id: -1 });
        res.json({ success: true, albums: allAlbums });
    } catch (error) {
        console.error("Error listing albums:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const removeAlbum = async (req, res) => {
    try {
        const id = req.body.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "Album ID is required to remove album" });
        }

        const deleted = await albumModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Album not found" });
        }

        res.json({ success: true, message: "Album Removed Successfully" });
    } catch (error) {
        console.error("Error removing album:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export { addAlbum, listAlbum, removeAlbum };