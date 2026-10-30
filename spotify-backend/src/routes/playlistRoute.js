import express from 'express';
import { addPlaylist, listPlaylist, removePlaylist, getPlaylist, updatePlaylist, addSongToPlaylist } from '../controllers/playlistController.js';
import upload from '../middleware/multer.js';

const playlistRouter = express.Router();

playlistRouter.post('/add', upload.any(), addPlaylist);
playlistRouter.post('/update', upload.any(), updatePlaylist);
playlistRouter.post('/add-song-to-playlist', upload.any(), addSongToPlaylist);
playlistRouter.get('/list', listPlaylist);
playlistRouter.post('/remove', removePlaylist);
playlistRouter.get('/:id', getPlaylist);

export default playlistRouter;
