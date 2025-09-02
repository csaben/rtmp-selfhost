require('dotenv').config();
const NodeMediaServer = require('node-media-server');
const express = require('express');
const path = require('path');
const os = require('os');
const si = require('systeminformation');

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
    chunk_size: 128000,  // Increased for higher bitrates
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: httpApiPort,
    allow_origin: '*',
    mediaroot: './media',
    webroot: './www'
  },
  relay: {
    ffmpeg: '/usr/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        mode: 'push',
        edge: `rtmp://127.0.0.1:${rtmpPort}/hq`
      }
    ]
  }
};

const nms = new NodeMediaServer(config);

// Connection tracking
const connectionLogs = [];
const maxLogEntries = 50;

// Performance monitoring
const performanceLogs = [];
const maxPerformanceLogs = 100;

// System stats tracking
let systemStats = {
  cpu: { usage: 0, temp: 0 },
  memory: { used: 0, total: 0, percent: 0 },
  network: { rx: 0, tx: 0 },
  disk: { used: 0, total: 0, percent: 0 },
  streams: { active: 0, viewers: 0 }
};

function addLog(type, message, data = {}) {
  // Sanitize data to avoid circular references
  const sanitizedData = {};
  
  if (data.id) {
    sanitizedData.id = typeof data.id === 'string' ? data.id : '[object]';
  }
  
  if (data.streamPath) {
    sanitizedData.streamPath = data.streamPath;
  }
  
  if (data.args && typeof data.args === 'object') {
    // Extract useful info from args without circular references
    sanitizedData.args = {
      app: data.args.app,
      tcUrl: data.args.tcUrl,
      type: data.args.type
    };
  }
  
  // Add other safe properties
  Object.keys(data).forEach(key => {
    if (!sanitizedData[key] && typeof data[key] !== 'object' && typeof data[key] !== 'function') {
      sanitizedData[key] = data[key];
    }
  });
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: type,
    message: message,
    data: sanitizedData
  };
  
  connectionLogs.unshift(logEntry);
  
  // Keep only the most recent entries
  if (connectionLogs.length > maxLogEntries) {
    connectionLogs.splice(maxLogEntries);
  }
  
  console.log(`[${type.toUpperCase()}]`, message, sanitizedData.id ? `(${sanitizedData.id})` : '');
}

function addPerformanceLog(type, data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: type,
    data: data
  };
  
  performanceLogs.unshift(logEntry);
  
  if (performanceLogs.length > maxPerformanceLogs) {
    performanceLogs.splice(maxPerformanceLogs);
  }
}

// Update system statistics
async function updateSystemStats() {
  try {
    // Get CPU usage
    const cpuData = await si.currentLoad();
    const cpuTemp = await si.cpuTemperature();
    
    // Get memory usage
    const memData = await si.mem();
    
    // Get network stats
    const networkData = await si.networkStats();
    
    // Get disk usage
    const diskData = await si.fsSize();
    
    // Count active streams and viewers
    const activeStreams = Object.keys({}); // Will be updated by stream events
    
    systemStats = {
      cpu: {
        usage: Math.round(cpuData.currentLoad * 100) / 100,
        temp: cpuTemp.main || 0
      },
      memory: {
        used: Math.round((memData.used / 1024 / 1024 / 1024) * 100) / 100, // GB
        total: Math.round((memData.total / 1024 / 1024 / 1024) * 100) / 100, // GB
        percent: Math.round((memData.used / memData.total) * 100 * 100) / 100
      },
      network: {
        rx: networkData[0] ? Math.round((networkData[0].rx_sec / 1024 / 1024) * 100) / 100 : 0, // MB/s
        tx: networkData[0] ? Math.round((networkData[0].tx_sec / 1024 / 1024) * 100) / 100 : 0  // MB/s
      },
      disk: {
        used: diskData[0] ? Math.round((diskData[0].used / 1024 / 1024 / 1024) * 100) / 100 : 0, // GB
        total: diskData[0] ? Math.round((diskData[0].size / 1024 / 1024 / 1024) * 100) / 100 : 0, // GB
        percent: diskData[0] ? Math.round((diskData[0].use) * 100) / 100 : 0
      },
      streams: {
        active: activeStreams.length,
        viewers: 0 // Will be updated by stream events
      },
      timestamp: new Date().toISOString()
    };
    
    // Log performance if CPU or memory usage is high
    if (systemStats.cpu.usage > 80 || systemStats.memory.percent > 85) {
      addPerformanceLog('high_usage', {
        cpu: systemStats.cpu.usage,
        memory: systemStats.memory.percent,
        streams: systemStats.streams.active
      });
      
      addLog('system', `High resource usage detected - CPU: ${systemStats.cpu.usage}%, Memory: ${systemStats.memory.percent}%`);
    }
    
  } catch (error) {
    console.error('Error updating system stats:', error);
  }
}

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

// API endpoint to get connection logs
app.get('/api/logs', (req, res) => {
  res.json({
    logs: connectionLogs,
    count: connectionLogs.length,
    maxEntries: maxLogEntries
  });
});

// API endpoint to clear connection logs
app.delete('/api/logs', (req, res) => {
  connectionLogs.length = 0;
  addLog('system', 'Connection logs cleared');
  res.json({ success: true, message: 'Logs cleared' });
});

// API endpoint to get system performance
app.get('/api/performance', (req, res) => {
  res.json({
    current: systemStats,
    history: performanceLogs,
    uptime: process.uptime(),
    nodeMemory: process.memoryUsage()
  });
});

// API endpoint to get performance logs
app.get('/api/performance/logs', (req, res) => {
  res.json({
    logs: performanceLogs,
    count: performanceLogs.length
  });
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

// Log stream events with tracking
nms.on('preConnect', (id, args) => {
  addLog('connection', 'Client attempting to connect', { id, args });
});

nms.on('postConnect', (id, args) => {
  addLog('connection', 'Client connected successfully', { id, args });
});

nms.on('doneConnect', (id, args) => {
  addLog('connection', 'Client disconnected', { id, args });
});

nms.on('prePublish', (id, StreamPath, args) => {
  addLog('stream', `Starting to publish stream`, { id, streamPath: StreamPath, args });
});

nms.on('postPublish', (id, StreamPath, args) => {
  addLog('stream', `Stream published successfully`, { id, streamPath: StreamPath, args });
});

nms.on('donePublish', (id, StreamPath, args) => {
  addLog('stream', `Stream ended`, { id, streamPath: StreamPath, args });
});

nms.on('prePlay', (id, StreamPath, args) => {
  addLog('viewer', `Viewer requesting stream`, { id, streamPath: StreamPath, args });
});

nms.on('postPlay', (id, StreamPath, args) => {
  addLog('viewer', `Viewer started watching`, { id, streamPath: StreamPath, args });
});

nms.on('donePlay', (id, StreamPath, args) => {
  addLog('viewer', `Viewer stopped watching`, { id, streamPath: StreamPath, args });
});

// Add startup log
addLog('system', 'RTMP Server started', { 
  rtmpPort, 
  httpApiPort, 
  webPort, 
  serverIP,
  streamKey 
});

// Start system monitoring
updateSystemStats(); // Initial update
setInterval(updateSystemStats, 10000); // Update every 10 seconds

console.log('System monitoring started - updating every 10 seconds');