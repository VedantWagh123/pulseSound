import { v2 as cloudinary } from 'cloudinary';

const connectCloudinary = async () => {
    const isConfigured = 
        process.env.CLOUDINARY_NAME && 
        !process.env.CLOUDINARY_NAME.includes("Enter") &&
        process.env.CLOUDINARY_API_KEY && 
        !process.env.CLOUDINARY_API_KEY.includes("Enter");

    if (!isConfigured) {
        console.warn("⚠️ Warning: Cloudinary credentials not configured in .env yet.");
        return;
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_SECRET_KEY
    });
    console.log("✅ Cloudinary configured successfully");
}

export default connectCloudinary;