const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Enable CORS for all routes (for development purposes)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// Route for SSE to send real-time updates
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Send headers before starting to send data

  // Send an initial message
  res.write('data: Server-Sent Events started\n\n');

  // Send real-time updates every 5 seconds (e.g., video status or metadata)
  const intervalId = setInterval(() => {
    res.write(`data: ${new Date().toLocaleTimeString()} - Video status: OK\n\n`);
  }, 5000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

// Route for video streaming with partial content
app.get('/video', (req, res) => {
  const videoPath = path.join(__dirname, 'video.mp4');
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// New Route: Serve video without streaming (no partial content, full download)
app.get('/video-full', (req, res) => {
  const videoPath = path.join(__dirname, 'video.mp4');
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;

  // Serve the full video as a single HTTP response
  res.writeHead(200, {
    'Content-Length': fileSize,
    'Content-Type': 'video/mp4',
  });

  fs.createReadStream(videoPath).pipe(res);
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
