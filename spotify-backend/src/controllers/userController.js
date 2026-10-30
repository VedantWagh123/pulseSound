import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pulse_sound_super_secret_jwt_key_2026';

// Register User
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required" });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email: trimmedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Account with this email already exists. Please log in." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name: name.trim(),
            email: trimmedEmail,
            password: hashedPassword,
            hasCompletedOnboarding: false,
            preferences: {
                favoriteGenres: [],
                favoriteArtists: [],
                listeningTime: 'Late Night Chill',
                audioQuality: 'Hi-Fi (320k)',
                listeningGoal: '1-2 Hours',
            },
        });

        const user = await newUser.save();

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            message: "Account created successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                hasCompletedOnboarding: user.hasCompletedOnboarding,
                preferences: user.preferences,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Register error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Login User
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const trimmedEmail = email.trim().toLowerCase();

        const user = await userModel.findOne({ email: trimmedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this email. Please register first." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect password. Please try again." });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            message: "Logged in successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                hasCompletedOnboarding: user.hasCompletedOnboarding,
                preferences: user.preferences,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Forgot Password (Reset Password)
export const forgotPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ success: false, message: "Email and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const user = await userModel.findOne({ email: trimmedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this email" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.json({
            success: true,
            message: "Password reset successfully! You can now log in with your new password.",
        });
    } catch (error) {
        console.error("Forgot password error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Save Survey & Music Preferences
export const saveSurveyPreferences = async (req, res) => {
    try {
        const { userId, favoriteGenres, favoriteArtists, listeningTime, audioQuality, listeningGoal } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.preferences = {
            favoriteGenres: Array.isArray(favoriteGenres) ? favoriteGenres : user.preferences?.favoriteGenres || [],
            favoriteArtists: Array.isArray(favoriteArtists) ? favoriteArtists : user.preferences?.favoriteArtists || [],
            listeningTime: listeningTime || user.preferences?.listeningTime || 'Late Night Chill',
            audioQuality: audioQuality || user.preferences?.audioQuality || 'Hi-Fi (320k)',
            listeningGoal: listeningGoal || user.preferences?.listeningGoal || '1-2 Hours',
        };
        user.hasCompletedOnboarding = true;

        await user.save();

        res.json({
            success: true,
            message: "Music preferences saved successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                hasCompletedOnboarding: user.hasCompletedOnboarding,
                preferences: user.preferences,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Survey error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get User Profile
export const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userModel.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                hasCompletedOnboarding: user.hasCompletedOnboarding,
                preferences: user.preferences,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Profile error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
