#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directory to store snapshots
const snapshotsDir = path.join(__dirname, 'snapshots');
if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

// Function to capture and save one frame
function takeSnapshot() {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const filename = `${timestamp}.jpg`;
  const filepath = path.join(snapshotsDir, filename);
  try {
    const cmd = 'v4l2-ctl --device=/dev/video0 '
      + '--set-fmt-video=width=640,height=640,pixelformat=MJPG '
      + '--stream-mmap --stream-count=1 --stream-to=-';
    const imgBuffer = execSync(cmd);
    fs.writeFileSync(filepath, imgBuffer);
    console.log(`Snapshot saved: ${filename}`);
  } catch (err) {
    console.error('Error taking snapshot:', err);
  }
}

// Take one immediately
takeSnapshot();
// Schedule to run every minute
setInterval(takeSnapshot, 60 * 1000);
