require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(bodyParser.json());

// Shopify credentials
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL; // e.g., https://your-store.myshopify.com/admin/api/2023-10
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// Parse tracking number from notes
function extractTrackingNumber(note) {
    const match = note.match(/\b\d{10,}\b/); // Adjust regex based on your tracking number format
    return match ? match[0] : null;
}


// Webhook endpoint
app.post('/webhook', async (req, res) => {
    const order = req.body;
        console.log(order.note);
    // Log the received webhook for debugging purposes
    console.log('Received webhook:', order);

    if (order.note) {
        const trackingNumber = extractTrackingNumber(order.note);
        console.log('Tracking number:', trackingNumber);
        // Update the order with the tracking number

    }

    res.status(200).send('Webhook processed');  
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
