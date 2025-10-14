# Streamlabs Follower Goal Panel

A custom follower goal panel for Streamlabs that displays your current follower count and progress toward your goal.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example environment file and fill in your API credentials:
```bash
cp .env.example .env
```

Edit `.env` and add your API credentials:
- **Streamlabs**: Get from [Streamlabs API Settings](https://streamlabs.com/dashboard#/settings/api-settings)
- **Twitch**: Get from [Twitch Developer Console](https://dev.twitch.tv/console/apps)

### 3. Start the Server
```bash
npm start
```

The server will start on `http://localhost:3000`

### 4. Set Your Initial Follower Count
Set your current follower count as the starting point:

```bash
node update-followers.js 47
```
Replace `47` with your actual current follower count.

### 5. Simulate New Follows (for testing)
To test the real-time updates:

```bash
node new-follow.js
```
This increments your follower count by 1 and updates the widget.

### 6. View Your Follower Goal Widget
1. Open your browser and go to `http://localhost:3000`
2. You'll see your follower goal widget with:
   - Current follower count
   - Progress bar showing percentage toward 200 followers
   - Beautiful cartoony design with animations

### 4. Set Up Your Follower Goal
1. Go to your Streamlabs dashboard
2. Navigate to Goals section
3. Create a new Follower Goal
4. Set your target number of followers
5. The panel will automatically display your progress

## How It Works

- **Server-side Authentication**: The Node.js server handles OAuth authentication with Streamlabs to avoid CORS issues
- **Real-time Updates**: The panel fetches goal data from Streamlabs API
- **Responsive Design**: Clean, modern UI that works well as an overlay

## API Endpoints

- `GET /` - Main panel page
- `GET /auth/streamlabs` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `GET /api/goal` - Get current goal data
- `GET /api/auth-status` - Check authentication status

## Troubleshooting

### CORS Issues
If you see CORS errors, make sure you're running the server and accessing the panel through `http://localhost:3000`, not opening the HTML file directly.

### Authentication Issues
- Make sure your Streamlabs app credentials are correct
- Check that the redirect URI matches exactly: `http://localhost:3000/auth/callback`
- Clear your browser cache if authentication seems stuck

### No Goal Data
- Ensure you have created a follower goal in your Streamlabs dashboard
- Check that the goal is active and not completed
- Verify your Streamlabs account has the necessary permissions

## Customization

You can customize the appearance by editing `followgoal.css`:
- Colors and fonts
- Layout and positioning
- Animation effects
- Background styling

## Security Note

The client ID and secret are currently hardcoded in the server file. In a production environment, you should:
- Store these in environment variables
- Use a proper database for token storage
- Implement token refresh logic
- Add proper error handling and logging
