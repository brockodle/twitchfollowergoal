// Check authentication status and handle Streamlabs API
let isAuthenticated = false;

// Check if user is authenticated
async function checkAuthStatus() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`/api/auth-status?t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (response.ok) {
            const data = await response.json();
            isAuthenticated = data.authenticated;
            
            if (!isAuthenticated) {
                // Show a small auth button instead of replacing the entire display
                showSmallAuthButton();
            } else {
                loadGoalData();
            }
        } else {
            console.error('Auth status check failed:', response.status);
            // Keep the goal display, just add a small auth button
            showSmallAuthButton();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        // Keep the goal display, just add a small auth button
        showSmallAuthButton();
    }
}

// Show small authentication button (doesn't replace the goal display)
function showSmallAuthButton() {
    // Only add the button if it doesn't already exist
    if ($('#small-auth-button').length === 0) {
        const smallAuthButton = $(`
            <div id="small-auth-container" style="position: absolute; top: 5px; right: 5px; z-index: 300;">
                <button id="small-auth-button" style="padding: 5px 10px; font-size: 10px; background: #2c86e1; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    Connect
                </button>
            </div>
        `);
        
        $('#wrap').append(smallAuthButton);
        
        $('#small-auth-button').click(() => {
            try {
                window.open('/auth/streamlabs', 'auth', 'width=600,height=600');
            } catch (error) {
                console.error('Error opening auth window:', error);
                alert('Error: Make sure the server is running on port 3000');
            }
        });
    }
}

// Show full authentication button (replaces the goal display)
function showAuthButton() {
    const authButton = $(`
        <div id="auth-container" style="text-align: center; padding: 20px;">
            <h3>Streamlabs Authentication Required</h3>
            <p>Click the button below to authenticate with Streamlabs</p>
            <button id="auth-button" style="padding: 10px 20px; font-size: 16px; background: #2c86e1; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Authenticate with Streamlabs
            </button>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
                Make sure the server is running on port 3000
            </p>
        </div>
    `);
    
    $('#title').html(authButton);
    
    $('#auth-button').click(() => {
        try {
            window.open('/auth/streamlabs', 'auth', 'width=600,height=600');
        } catch (error) {
            console.error('Error opening auth window:', error);
            alert('Error: Make sure the server is running on port 3000');
        }
    });
}

// Load Twitch follower data
async function loadTwitchData() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`/api/current-followers?t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (response.ok) {
            const data = await response.json();
            console.log('Current follower data:', data);
            
            // Update the display with current follower data
            updateTwitchDisplay(data);
        } else {
            throw new Error('Failed to load follower data');
        }
    } catch (error) {
        console.error('Error loading follower data:', error);
        showErrorMessage('Failed to load follower data. Please try again.');
    }
}

// Update display with Twitch data
function updateTwitchDisplay(data) {
    const current = data.follower_count;
    const target = data.target;
    const percentage = data.percentage;
    
    // Update progress bar
    updateProgressBar(current, target);
    
    // Update the title with fun emojis
    const remaining = target - current;
    const emoji = remaining <= 10 ? '🔥' : remaining <= 25 ? '⚡' : '🎯';
    $('#title').html(`<strong>${emoji} Follower Goal</strong><br/><strong style="color:#ffd93d;">${remaining}</strong> follows to go!`);
    $('#goal-current').text(current);
    $('#goal-total').text(target);
    
    // Add some excitement based on progress
    if (percentage >= 100) {
        $('#title').html(`<strong>🎉 GOAL ACHIEVED! 🎉</strong><br/><strong style="color:#00ff00;">${current} followers!</strong>`);
    } else if (percentage >= 75) {
        $('#title').html(`<strong>🔥 SO CLOSE! 🔥</strong><br/><strong style="color:#ffd93d;">${remaining}</strong> follows to go!`);
    } else if (percentage >= 50) {
        $('#title').html(`<strong>⚡ Halfway There! ⚡</strong><br/><strong style="color:#ffd93d;">${remaining}</strong> follows to go!`);
    }
}

// Legacy function for Streamlabs (keeping for compatibility)
async function loadGoalData() {
    // Try Twitch first, fallback to Streamlabs
    try {
        await loadTwitchData();
    } catch (error) {
        console.log('Twitch data failed, trying Streamlabs...');
        // Fallback to original Streamlabs logic if needed
        showNoGoalMessage();
    }
}

// Update the goal display
function updateGoalDisplay(goal) {
    const current = goal.amount.current || 0;
    const target = goal.amount.target || 1;
    
    // Update progress bar with animation
    updateProgressBar(current, target);
    
    // Update the title with fun emojis
    const remaining = target - current;
    const emoji = remaining <= 10 ? '🔥' : remaining <= 25 ? '⚡' : '🎯';
    $('#title').html(`<strong>${emoji} ${goal.title}</strong><br/><strong style="color:#ffd93d;">${remaining}</strong> follows to go!`);
    $('#goal-current').text(current);
    $('#goal-total').text(target);
    
    if (goal.to_go && goal.to_go.ends_at) {
        $('#goal-end-date').text(`Ends: ${goal.to_go.ends_at}`);
    }
}

// Show message when no goal is set
function showNoGoalMessage() {
    $('#title').html('<strong>🎯 No Follower Goal Set</strong><br/>Set up a follower goal in your Streamlabs dashboard');
    updateProgressBar(0, 100);
}

// Show error message
function showErrorMessage(message) {
    $('#title').html(`<strong>Error</strong><br/>${message}`);
}

// Listen for authentication success from popup window
window.addEventListener('message', (event) => {
    if (event.data.type === 'AUTH_SUCCESS') {
        isAuthenticated = true;
        // Remove the small auth button
        $('#small-auth-container').remove();
        loadGoalData();
    }
});

// Initialize when page loads - only on the main page, not OAuth pages
$(document).ready(() => {
    // Only run on the main page, not on OAuth redirect pages
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        // Initialize the visual elements first
        initializeGoalDisplay();
        // Then check authentication
        checkAuthStatus();
    }
});

// Initialize the goal display with default values
function initializeGoalDisplay() {
    // Set up the basic follower goal display with 200 follower goal
    $('#currpercent').text('0%');
    updateProgressBar(0, 200);
    $('#title').html('<strong>🎯 Loading...</strong><br/><strong style="color:#ffd93d;">Fetching your followers!</strong>');
    $('#goal-current').text('0');
    $('#goal-total').text('200');
    $('#goal-end-date').text('');
    
    // Load real Twitch data
    loadTwitchData();
}

// Update the progress bar with animation
function updateProgressBar(current, target) {
    const percentage = Math.min(100, (current / target) * 100);
    
    // Update the progress bar width directly
    $('#progress-fill').css('width', percentage + '%');
    
    // Update the percentage display
    $('#currpercent').text(Math.round(percentage) + '%');
    
    // Add some visual flair based on progress
    if (percentage >= 100) {
        $('#progress-fill').addClass('completed');
        $('#currpercent').addClass('completed');
    } else {
        $('#progress-fill').removeClass('completed');
        $('#currpercent').removeClass('completed');
    }
}

// Events will be sent when someone followers
// Please use event listeners to run functions.

document.addEventListener(`goalLoad`, function(obj) {
    $(`#currpercent`).text(100 * (obj.detail.amount.current / obj.detail.amount.target) + `%`);
    $(`#bgpercent`).width(300 * (obj.detail.amount.current / obj.detail.amount.target));
    // obj.detail will contain information about the current goal
    // this will fire only once when the widget loads
    console.log(obj.detail);
    $(`#title`).html(`<strong>` + obj.detail.title + `</strong>` + `<br/><strong style="color:#b28080ff;">` + (obj.detail.amount.target - obj.detail.amount.current) + `</strong> follows to go!`);
    $(`#goal-current`).text(obj.detail.amount.current);
    $(`#goal-total`).text(obj.detail.amount.target);
    $(`#goal-end-date`).text(obj.detail.to_go.ends_at);
});

document.addEventListener(`goalEvent`, function(obj) {
    $(`#currpercent`).text(100 * (obj.detail.amount.current / obj.detail.amount.target) + `%`);
    $(`#bgpercent`).width(300 * (obj.detail.amount.current / obj.detail.amount.target));
    $(`#title`).html(obj.detail.title + `<br/><strong>` + (obj.detail.amount.target - obj.detail.amount.current) + `</strong> follows to go!`);
    // obj.detail will contain information about the goal
    $(`#bgpercent`).width(300 * (obj.detail.amount.current / obj.detail.amount.target));
    $(`#goal-current`).text(obj.detail.amount.current);
    $(`#currpercent`).html(100 * (obj.detail.amount.current / obj.detail.amount.target) + `%`);
});