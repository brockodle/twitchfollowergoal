#!/usr/bin/env node

const axios = require('axios');

async function simulateNewFollow() {
    try {
        console.log('🎉 Simulating a new follow...');
        
        // Send POST request to increment follower count
        const response = await axios.post('http://localhost:3000/api/new-follow');
        
        if (response.data.success) {
            console.log('✅ New follow recorded!');
            console.log(`📊 Current followers: ${response.data.follower_count}`);
            console.log(`🎯 Progress toward 200: ${Math.round(response.data.percentage)}%`);
            console.log('');
            console.log('🚀 Your follower goal widget has been updated!');
        } else {
            console.log('❌ Failed to record new follow');
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Server is not running. Please start it first:');
            console.log('   node server.js');
        } else {
            console.error('❌ Error recording new follow:', error.message);
        }
        process.exit(1);
    }
}

simulateNewFollow();
