import express from 'express';
import {
    registerUser,
    loginUser,
    forgotPassword,
    saveSurveyPreferences,
    getUserProfile,
} from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/survey', saveSurveyPreferences);
userRouter.get('/profile/:id', getUserProfile);

export default userRouter;
