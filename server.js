const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const imagesDir = path.join(__dirname, 'images');

app.use('/images', express.static(imagesDir));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/images/list', (req, res) => {
  const images = fs.readdirSync(imagesDir)
    .filter(f => /\.(jpe?g|png|gif)$/i.test(f))
    .sort();
  res.json(images);
});

// on-demand metadata for a single image
app.get('/images/metadata', (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'filename query required' });
  }
  const abs = path.join(imagesDir, filename);
  if (!fs.existsSync(abs)) {
    return res.status(404).json({ error: 'file not found' });
  }
  try {
    const buffer = fs.readFileSync(abs);
    // extract JSON directly from JPEG COM (0xFFFE) segment
    let raw = null;
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xFE) {
        const length = buffer.readUInt16BE(i + 2);
        const commentBuf = buffer.subarray(i + 4, i + 2 + length);
        raw = commentBuf.toString('utf8');
        break;
      }
    }
    const metadata = raw ? JSON.parse(raw) : null;
    console.log(`Metadata for ${filename}: ${raw || 'null'}`);
    res.json({ filename, metadata });
  } catch (err) {
    console.error(`Error reading metadata for ${filename}:`, err);
    res.status(500).json({ error: 'failed to read EXIF' });
  }
});


// Snapshot endpoint to capture a single frame
app.get('/snapshot', (req, res) => {
  // capture one frame from /dev/video0 using v4l2-ctl
  try {
    const cmd = 'v4l2-ctl --device=/dev/video0 '
      + '--set-fmt-video=width=640,height=640,pixelformat=MJPG '
      + '--stream-mmap --stream-count=1 --stream-to=-';
    const img = execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] });
    res.set('Content-Type', 'image/jpeg');
    res.send(img);
  } catch (err) {
    console.error('Error capturing snapshot:', err);
    res.status(500).send('Snapshot error');
  }
});

app.listen(PORT, () => {
  console.log(`▶ Listening on http://localhost:${PORT}`);
});