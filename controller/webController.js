import path from 'path';
import { fileURLToPath } from 'url';

export const serveVideoPlayer = (req, res) => {
  // Serve the static HTML file for the HLS video player
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  res.sendFile(path.join(__dirname, '../public/video-player.html'));
};
