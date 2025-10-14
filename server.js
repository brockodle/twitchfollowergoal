require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Add cache-busting headers for all static files
app.use(express.static('.', {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));

// Streamlabs API credentials from environment variables
const CLIENT_ID = process.env.STREAMLABS_CLIENT_ID;
const CLIENT_SECRET = process.env.STREAMLABS_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Twitch API credentials from environment variables
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const TWITCH_USERNAME = process.env.TWITCH_USERNAME;

// Streamlabs Socket API token from environment variables
const STREAMLABS_SOCKET_TOKEN = process.env.STREAMLABS_SOCKET_TOKEN;

// Validate required environment variables
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Error: STREAMLABS_CLIENT_ID and STREAMLABS_CLIENT_SECRET must be set in .env file');
    process.exit(1);
}

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.warn('Warning: TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET not set. Twitch integration will use fallback data.');
}

if (!STREAMLABS_SOCKET_TOKEN) {
    console.warn('Warning: STREAMLABS_SOCKET_TOKEN not set. Real-time follow detection will be disabled.');
}

// Store tokens in memory (in production, use a database)
let accessToken = null;
let refreshToken = null;
let twitchAppToken = null;

// Store current follower count and allow real-time updates
// Initialize from environment variable or default to 15
let currentFollowerCount = process.env.MANUAL_FOLLOWER_COUNT ? parseInt(process.env.MANUAL_FOLLOWER_COUNT) : 15;

console.log(`🎯 Initializing follower count: ${currentFollowerCount} (from ${process.env.MANUAL_FOLLOWER_COUNT ? 'MANUAL_FOLLOWER_COUNT' : 'default'})`);

// Connect to Streamlabs Socket API immediately if token is available
if (STREAMLABS_SOCKET_TOKEN) {
    console.log('🔌 Socket token found, connecting to Streamlabs Socket API...');
    connectToStreamlabsSocket();
}

// Streamlabs Socket API connection
let streamlabsSocket = null;
let socketToken = null;

// Function to get Streamlabs Socket API token
async function getStreamlabsSocketToken() {
    if (socketToken) {
        return socketToken;
    }
    
    // Use token from environment variable if available
    if (STREAMLABS_SOCKET_TOKEN) {
        socketToken = STREAMLABS_SOCKET_TOKEN;
        console.log('✅ Using Streamlabs Socket API token from environment');
        return socketToken;
    }
    
    // Fallback to API call if no environment token
    try {
        console.log('🔌 Getting Streamlabs Socket API token from API...');
        const response = await axios.post('https://streamlabs.com/api/v1.0/socket/token', {
            access_token: accessToken
        });
        
        socketToken = response.data.socket_token;
        console.log('✅ Got Streamlabs Socket API token from API');
        return socketToken;
    } catch (error) {
        console.error('❌ Failed to get Streamlabs Socket API token:', error.response?.data || error.message);
        return null;
    }
}

// Function to connect to Streamlabs Socket API
async function connectToStreamlabsSocket() {
    try {
        const token = await getStreamlabsSocketToken();
        if (!token) {
            console.log('⚠️  No Streamlabs token available, skipping Socket API connection');
            return;
        }
        
        console.log('🔌 Connecting to Streamlabs Socket API...');
        streamlabsSocket = new WebSocket(`wss://sockets.streamlabs.com/socket.io/?token=${token}&transport=websocket`);
        
        streamlabsSocket.on('open', () => {
            console.log('✅ Connected to Streamlabs Socket API');
        });
        
        streamlabsSocket.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                if (message.type === 'follow') {
                    handleFollowEvent(message);
                } else if (message.type === 'unfollow') {
                    handleUnfollowEvent(message);
                }
            } catch (error) {
                // Ignore non-JSON messages (like socket.io handshake)
            }
        });
        
        streamlabsSocket.on('close', () => {
            console.log('🔌 Streamlabs Socket API connection closed');
            // Attempt to reconnect after 5 seconds
            setTimeout(connectToStreamlabsSocket, 5000);
        });
        
        streamlabsSocket.on('error', (error) => {
            console.error('❌ Streamlabs Socket API error:', error.message);
        });
        
    } catch (error) {
        console.error('❌ Failed to connect to Streamlabs Socket API:', error.message);
    }
}

// Handle follow events
function handleFollowEvent(data) {
    currentFollowerCount += 1;
    console.log(`🎉 New follow detected! Count now: ${currentFollowerCount}`);
    console.log(`👤 Follower: ${data.name}`);
    
    // Broadcast update to all connected clients
    broadcastFollowerUpdate();
}

// Handle unfollow events
function handleUnfollowEvent(data) {
    currentFollowerCount = Math.max(0, currentFollowerCount - 1);
    console.log(`😢 Unfollow detected! Count now: ${currentFollowerCount}`);
    console.log(`👤 Unfollower: ${data.name}`);
    
    // Broadcast update to all connected clients
    broadcastFollowerUpdate();
}

// Broadcast follower count update to all connected clients
function broadcastFollowerUpdate() {
    const update = {
        follower_count: currentFollowerCount,
        target: 200,
        percentage: Math.min(100, (currentFollowerCount / 200) * 100),
        timestamp: Date.now()
    };
    
    // In a real implementation, you'd broadcast to WebSocket clients
    // For now, we'll just log the update
    console.log(`📊 Broadcasting update: ${currentFollowerCount} followers (${Math.round(update.percentage)}%)`);
}

// Function to get Twitch App Access Token
async function getTwitchAppToken() {
    if (twitchAppToken) {
        return twitchAppToken;
    }
    
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', {
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
            grant_type: 'client_credentials'
        });
        
        twitchAppToken = response.data.access_token;
        console.log('Got Twitch App Access Token');
        return twitchAppToken;
    } catch (error) {
        console.error('Failed to get Twitch App Access Token:', error.response?.data || error.message);
        return null;
    }
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initiate OAuth flow
app.get('/auth/streamlabs', (req, res) => {
    const timestamp = Date.now();
    const authUrl = `https://streamlabs.com/api/v2.0/authorize?` +
        `response_type=code&` +
        `client_id=${CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `scope=donations.read%20alerts.create&` +
        `state=random_state_string_${timestamp}`;
    
    console.log('Redirecting to auth URL:', authUrl);
    
    // Just redirect, don't serve any HTML
    res.redirect(302, authUrl);
});

// Handle OAuth callback
app.get('/auth/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
        return res.send(`
            <html>
                <body>
                    <h2>Authentication Error</h2>
                    <p>Error: ${error}</p>
                    <a href="/">Go back</a>
                </body>
            </html>
        `);
    }
    
    if (!code) {
        return res.send(`
            <html>
                <body>
                    <h2>No authorization code received</h2>
                    <a href="/">Go back</a>
                </body>
            </html>
        `);
    }
    
    try {
        // Exchange code for tokens
        const tokenData = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            code: code
        });

        console.log('Exchanging code for token...');
        console.log('Token data:', tokenData.toString());

        const tokenResponse = await axios.post('https://streamlabs.com/api/v2.0/token', tokenData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'FollowerGoalPanel/1.0.0'
            }
        });
        
        console.log('Token response status:', tokenResponse.status);
        console.log('Token response data:', tokenResponse.data);
        
        accessToken = tokenResponse.data.access_token;
        refreshToken = tokenResponse.data.refresh_token;
        
        // Connect to Streamlabs Socket API for real-time events
        connectToStreamlabsSocket();
        
        res.send(`
            <html>
                <head>
                    <title>Authentication Successful</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .success { color: green; }
                        .button { background: #2c86e1; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
                    </style>
                </head>
                <body>
                    <h2 class="success">Authentication Successful!</h2>
                    <p>You can now close this window and return to your follower goal panel.</p>
                    <p><strong>🎉 Real-time follow detection is now active!</strong></p>
                    <button class="button" onclick="closeWindow()">Close Window</button>
                    <script>
                        // Notify the parent window that auth is complete
                        if (window.opener) {
                            window.opener.postMessage({ type: 'AUTH_SUCCESS' }, '*');
                            setTimeout(() => window.close(), 2000);
                        }
                        
                        function closeWindow() {
                            window.close();
                        }
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        console.error('Error status:', error.response?.status);
        console.error('Error headers:', error.response?.headers);
        res.send(`
            <html>
                <body>
                    <h2>Authentication Failed</h2>
                    <p>Error: ${error.response?.data?.error || error.message}</p>
                    <p>Status: ${error.response?.status}</p>
                    <p>Details: ${JSON.stringify(error.response?.data)}</p>
                    <a href="/">Go back</a>
                </body>
            </html>
        `);
    }
});

// Get Twitch follower count for alpha_bit
app.get('/api/twitch-followers', async (req, res) => {
    try {
        console.log('Fetching Twitch follower count for alpha_bit...');
        
        // Check if we have proper Twitch credentials
        if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || TWITCH_CLIENT_ID === 'your_twitch_client_id') {
            console.log('Twitch credentials not configured, using mock data');
            return res.json({
                follower_count: 15,
                target: 200,
                percentage: 7.5,
                mock: true
            });
        }
        
        // Get Twitch App Access Token
        const token = await getTwitchAppToken();
        if (!token) {
            console.log('Failed to get Twitch token, using mock data');
            return res.json({
                follower_count: 15,
                target: 200,
                percentage: 7.5,
                mock: true
            });
        }
        
        // Get Twitch user ID first
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            params: {
                login: TWITCH_USERNAME
            },
            headers: {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (userResponse.data.data.length === 0) {
            return res.status(404).json({ error: 'User alpha_bit not found' });
        }
        
        const userId = userResponse.data.data[0].id;
        console.log('Found user ID:', userId);
        
        // Get follower count - Twitch API /users/follows is deprecated
        // For now, we'll use a manual count that you can update
        // TODO: Implement alternative method to get real follower count
        console.log('⚠️  Twitch /users/follows API is deprecated (410 Gone)');
        console.log('Using manual follower count from environment variable...');
        
        // Use current follower count (can be updated via API)
        const followerCount = currentFollowerCount;
        console.log(`📊 Current follower count: ${followerCount}`);
        
        res.json({
            follower_count: followerCount,
            target: 200,
            percentage: Math.min(100, (followerCount / 200) * 100)
        });
        
    } catch (error) {
        console.error('Twitch API error:', error.response?.data || error.message);
        
        // Fallback to mock data if Twitch API fails
        const mockData = {
            follower_count: 15,
            target: 200,
            percentage: 7.5,
            mock: true
        };
        
        res.json(mockData);
    }
});

// Set initial follower count
app.post('/api/set-followers', (req, res) => {
    const { count } = req.body;
    
    if (!count || isNaN(parseInt(count))) {
        return res.status(400).json({ error: 'Invalid follower count' });
    }
    
    currentFollowerCount = parseInt(count);
    console.log(`🎯 Follower count set to: ${currentFollowerCount}`);
    
    res.json({
        success: true,
        follower_count: currentFollowerCount,
        target: 200,
        percentage: Math.min(100, (currentFollowerCount / 200) * 100)
    });
});

// Increment follower count (for new follows)
app.post('/api/new-follow', (req, res) => {
    currentFollowerCount += 1;
    console.log(`🎉 New follow! Count now: ${currentFollowerCount}`);
    
    res.json({
        success: true,
        follower_count: currentFollowerCount,
        target: 200,
        percentage: Math.min(100, (currentFollowerCount / 200) * 100)
    });
});

// Get current follower count
app.get('/api/current-followers', (req, res) => {
    res.json({
        follower_count: currentFollowerCount,
        target: 200,
        percentage: Math.min(100, (currentFollowerCount / 200) * 100)
    });
});

// Legacy goals endpoint (may not work)
app.get('/api/goal', async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
        console.log('Fetching goals with token:', accessToken.substring(0, 10) + '...');
        
        // Try v1.0 goals endpoint first
        const endpoints = [
            'https://streamlabs.com/api/v1.0/goals',
            'https://streamlabs.com/api/v2.0/goals'
        ];
        
        let response = null;
        let lastError = null;
        
        for (const endpoint of endpoints) {
            try {
                console.log('Trying endpoint:', endpoint);
                response = await axios.get(endpoint, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json',
                        'User-Agent': 'FollowerGoalPanel/1.0.0'
                    }
                });
                console.log('Success with endpoint:', endpoint);
                break;
            } catch (error) {
                console.log('Failed with endpoint:', endpoint, error.response?.status, error.response?.data);
                lastError = error;
            }
        }
        
        if (!response) {
            // If no goals endpoint works, return mock data
            console.log('Goals API not available, returning mock data');
            const mockGoal = {
                data: [{
                    id: 1,
                    title: "Follower Goal (Mock)",
                    amount: {
                        current: 0,
                        target: 100
                    },
                    to_go: {
                        ends_at: null
                    }
                }]
            };
            return res.json(mockGoal);
        }
        
        console.log('Goals response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Goal fetch error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch goal data',
            details: error.response?.data || error.message,
            status: error.response?.status
        });
    }
});

// Check authentication status
app.get('/api/auth-status', (req, res) => {
    // Set headers to prevent caching
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    res.json({ authenticated: !!accessToken });
});

// Handle browser-sync requests gracefully
app.get('/browser-sync/*', (req, res) => {
    res.status(404).json({ error: 'Browser-sync not configured' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Click http://localhost:${PORT}/auth/streamlabs to authenticate with Streamlabs`);
});
