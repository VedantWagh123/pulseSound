import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.connection.on('connected', () => {
        console.log("✅ MongoDB connected successfully (db: spotify)");
    });

    mongoose.connection.on('error', (err) => {
        console.error("❌ MongoDB runtime connection error:", err.message);
    });

    try {
        const uri = process.env.MONGODB_URI;
        if (!uri || uri.includes("Enter MongoDB") || uri.trim() === "") {
            console.warn("⚠️ Warning: MONGODB_URI is not configured in .env. Server running in standalone mode.");
            return;
        }

        await mongoose.connect(uri.trim(), {
            dbName: 'spotify',
        });
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
    }
}

export default connectDB;