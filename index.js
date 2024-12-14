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

// Update tracking for an order
async function updateTracking(orderId, trackingNumber) {
    try {
        const fulfillmentData = {
            fulfillment: {
                tracking_info: {
                    number: trackingNumber,
                },
                notify_customer: true, // Optional: Notify customer about tracking update
            },
        };

        const response = await axios.post(
            `${SHOPIFY_API_URL}/orders/${orderId}/fulfillments.json`,
            fulfillmentData,
            {
                headers: {
                    "X-Shopify-Access-Token": ACCESS_TOKEN,
                },
            }
        );

        console.log(`Tracking updated for order ${orderId}:`, response.data);
    } catch (error) {
        console.error(`Failed to update tracking for order ${orderId}:`, error.response.data);
    }
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
    const order = req.body;
    console.log('Received webhook:', order);

    if (order.note) {
        const trackingNumber = extractTrackingNumber(order.note);
        if (trackingNumber) {
            await updateTracking(order.id, trackingNumber);
        }
    }

    res.status(200).send('Webhook processed');  
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
