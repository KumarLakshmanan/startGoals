import express from 'express';
import { serveVideoPlayer } from '../controller/webController.js';

const router = express.Router();

// Serve the HLS video player HTML page
router.get('/video-player', serveVideoPlayer);

export default router;
