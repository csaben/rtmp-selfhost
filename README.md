# RTMP Self-Host Server

A self-hosted RTMP streaming server built with Node Media Server that allows you to stream from Blue Iris and view streams through a web interface.

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (v14 or higher)
- npm

### 2. Installation
```bash
# Clone or download this project
cd rtmp-selfhost

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start the server
npm start
```

### 3. Blue Iris Configuration
After starting the server, you'll see output like:
```
Blue Iris RTMP Configuration:
RTMP URL: rtmp://192.168.1.100:1935/live
Stream Key: blueiris_cam1
```

**In Blue Iris:**
1. Go to Camera Settings → Video → Recording tab
2. Find the "Streaming" or "RTMP" section
3. Set:
   - **Server URL**: `rtmp://YOUR_SERVER_IP:1935/live`
   - **Stream Key**: `blueiris_cam1`

### 4. View Your Stream
- **Web Interface**: `http://YOUR_SERVER_IP:8080`
- **Local Access**: `http://localhost:8080`

The web interface will automatically display your server's configuration and load the stream.

## 🔧 Configuration

### Environment Variables

Edit `.env` to customize your deployment:

```bash
# Server IP - auto-detect or set manually
SERVER_IP=192.168.1.100

# Ports
RTMP_PORT=1935         # RTMP streaming port
HTTP_API_PORT=8000     # API server port  
WEB_PORT=8080          # Web interface port

# Stream settings
DEFAULT_STREAM_KEY=blueiris_cam1

# Auto-detect IP (recommended for local deployments)
AUTO_DETECT_IP=true
```

### Port Configuration

| Service | Default Port | Purpose |
|---------|--------------|---------|
| RTMP Server | 1935 | Receives streams from Blue Iris |
| HTTP API | 8000 | Serves video streams |
| Web Interface | 8080 | Web viewer interface |

## 📱 Blue Iris Setup Guide

### Step-by-Step Configuration

1. **Open Blue Iris** and navigate to your camera settings
2. **Go to Recording tab** → Find streaming/RTMP options
3. **Configure RTMP settings**:
   - Server: `rtmp://YOUR_SERVER_IP:1935/live`
   - Stream Key: `blueiris_cam1` (or your custom key)
4. **Enable streaming** and apply settings
5. **Test the stream** by opening the web interface

### Multiple Cameras

For multiple cameras, use different stream keys:
- Camera 1: `blueiris_cam1`
- Camera 2: `blueiris_cam2` 
- Camera 3: `blueiris_cam3`

Update the stream key in the web interface to switch between cameras.

## 🌐 Network Access

### Local Network Access
Anyone on your local network can access:
- Web Interface: `http://YOUR_SERVER_IP:8080`
- Direct Stream: `http://YOUR_SERVER_IP:8000/live/STREAM_KEY.flv`

### External Access
To access from outside your network:
1. **Port Forward** these ports on your router:
   - 1935 (RTMP)
   - 8000 (HTTP API) 
   - 8080 (Web Interface)
2. **Use your external IP** instead of local IP
3. **Consider security implications** and use firewall rules

## 🚀 Deployment Options

### Standard Deployment
```bash
npm start
```

### Development Mode
For auto-restart during development:
```bash
npm install -g nodemon
nodemon server.js
```

### Production Deployment
Consider using PM2 for production:
```bash
npm install -g pm2
pm2 start server.js --name rtmp-server
pm2 startup
pm2 save
```

### Docker Deployment
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 1935 8000 8080
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t rtmp-selfhost .
docker run -p 1935:1935 -p 8000:8000 -p 8080:8080 rtmp-selfhost
```

## 🛠️ Troubleshooting

### Common Issues

**Stream not showing in web interface:**
- Verify Blue Iris is streaming to the correct RTMP URL
- Check that ports 1935 and 8000 are accessible
- Look at server logs for connection attempts

**Cannot access web interface:**
- Verify port 8080 is open
- Check firewall settings
- Try accessing via `localhost:8080` first

**Blue Iris connection fails:**
- Confirm RTMP URL format: `rtmp://IP:1935/live`
- Verify stream key matches
- Check Blue Iris logs for errors

### Server Logs
The server shows detailed connection logs:
```
[NodeEvent on preConnect] - Client connecting
[NodeEvent on postPublish] - Stream started  
[NodeEvent on donePublish] - Stream ended
```

### Debug Mode
For verbose logging, set in `.env`:
```bash
DEBUG=true
```

## 📋 Features

- ✅ **RTMP Server** - Receives streams from Blue Iris
- ✅ **Web Interface** - View streams in browser
- ✅ **Auto-Detection** - Automatically finds your network IP
- ✅ **Environment Config** - Easy deployment configuration
- ✅ **Multi-Camera** - Support for multiple stream keys
- ✅ **Real-time Status** - Shows connection and stream status
- ✅ **Network Access** - Works across your local network

## 🔐 Security Considerations

- **Local Network Only**: By default, only accessible on local network
- **No Authentication**: Consider adding authentication for external access
- **Firewall**: Use firewall rules if exposing to internet
- **HTTPS**: Consider SSL/TLS for external deployments

## 📄 File Structure

```
rtmp-selfhost/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                   # Your configuration
├── .env.example          # Configuration template
├── public/
│   └── index.html        # Web interface
└── README.md             # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - feel free to use and modify as needed.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify network connectivity and port accessibility
4. Test with minimal configuration first