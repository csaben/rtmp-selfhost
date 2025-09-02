require('dotenv').config();
const NodeMediaServer = require('node-media-server');
const express = require('express');
const path = require('path');
const os = require('os');

// Get local network IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Get server IP from environment or auto-detect
const autoDetectIP = process.env.AUTO_DETECT_IP === 'true';
const serverIP = autoDetectIP ? getLocalIP() : (process.env.SERVER_IP || getLocalIP());

// Port configurations from environment
const rtmpPort = parseInt(process.env.RTMP_PORT) || 1935;
const httpApiPort = parseInt(process.env.HTTP_API_PORT) || 8000;
const webPort = parseInt(process.env.WEB_PORT) || 8080;
const streamKey = process.env.DEFAULT_STREAM_KEY || 'blueiris_cam1';

const config = {
  rtmp: {
    port: rtmpPort,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: httpApiPort,
    allow_origin: '*'
  },
  relay: {
    ffmpeg: '/usr/bin/ffmpeg',
    tasks: []
  }
};

const nms = new NodeMediaServer(config);

// Create Express app for web interface
const app = express();

// Serve static files
app.use(express.static('public'));

// Main page with stream viewer
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get stream info
app.get('/api/streams', (req, res) => {
  // Node Media Server doesn't expose getSession in newer versions
  // Instead, return a simple status
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// API endpoint to get server configuration
app.get('/api/config', (req, res) => {
  res.json({
    serverIP: serverIP,
    rtmpPort: rtmpPort,
    httpApiPort: httpApiPort,
    webPort: webPort,
    streamKey: streamKey,
    rtmpUrl: `rtmp://${serverIP}:${rtmpPort}/live`,
    webUrl: `http://${serverIP}:${webPort}`
  });
});

// Start servers
nms.run();
app.listen(webPort, '0.0.0.0', () => {
  console.log(`RTMP Server running on port ${rtmpPort}`);
  console.log(`HTTP API running on port ${httpApiPort}`);
  console.log(`Web interface running on port ${webPort}`);
  console.log(`Server IP: ${serverIP}`);
  console.log(`\nBlue Iris RTMP Configuration:`);
  console.log(`RTMP URL: rtmp://${serverIP}:${rtmpPort}/live`);
  console.log(`Stream Key: ${streamKey}`);
  console.log(`\nAccess from anywhere on network:`);
  console.log(`Web interface: http://${serverIP}:${webPort}`);
  console.log(`Local access: http://localhost:${webPort}`);
});

// Log stream events
nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id, args) => {
  console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});