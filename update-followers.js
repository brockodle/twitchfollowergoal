#!/usr/bin/env node

const axios = require('axios');

// Get the new follower count from command line argument
const newCount = process.argv[2];

if (!newCount || isNaN(parseInt(newCount))) {
    console.log('🎯 Follower Count Updater');
    console.log('');
    console.log('Usage: node update-followers.js <number>');
    console.log('');
    console.log('Examples:');
    console.log('  node update-followers.js 47');
    console.log('  node update-followers.js 156');
    console.log('');
    console.log('This will update your follower goal widget with the new count!');
    process.exit(1);
}

const followerCount = parseInt(newCount);

async function updateFollowerCount() {
    try {
        console.log(`🎯 Setting follower count to: ${followerCount}`);
        
        // Send POST request to set the follower count
        const response = await axios.post('http://localhost:3000/api/set-followers', {
            count: followerCount
        });
        
        if (response.data.success) {
            console.log('✅ Follower count updated successfully!');
            console.log(`📊 Current followers: ${response.data.follower_count}`);
            console.log(`🎯 Progress toward 200: ${Math.round(response.data.percentage)}%`);
            console.log('');
            console.log('🚀 Your follower goal widget is now updated!');
            console.log('💡 Use "node new-follow.js" to simulate new follows');
        } else {
            console.log('❌ Failed to update follower count');
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Server is not running. Please start it first:');
            console.log('   node server.js');
        } else {
            console.error('❌ Error updating follower count:', error.message);
        }
        process.exit(1);
    }
}

updateFollowerCount();
