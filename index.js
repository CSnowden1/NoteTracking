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
const SHOP_DOMAIN = process.env.SHOP_DOMAIN

// Parse tracking number from notes
function extractTrackingNumber(note) {
    const match = note.match(/Tracking Number:\s*(\d+)/i); // Updated regex for "Tracking Number: 123456"
    return match ? match[1] : null;
}

// Update tracking for an order
async function updateTracking(orderId, trackingNumber, fulfillmentId) {
    if (!orderId || !trackingNumber) {
        console.error('Invalid order ID or tracking number');
        return;
    }

    try {
         console.log(SHOP_DOMAIN);
        console.log(ACCESS_TOKEN);
        console.log(fulfillmentId);
        // Update fulfillment status
        const fulfillmentData = {
            fulfillment: {
                tracking_info: {
                    number: trackingNumber,
                },
                notify_customer: true, // Notify customer about tracking update
            },
        };

        const response = await axios.post(
            `https://${SHOP_DOMAIN}/admin/api/2024-01/orders/${orderId}/fulfillments/${fulfillmentId}.json`,
            fulfillmentData,
            {
                headers: {
                    "X-Shopify-Access-Token": ACCESS_TOKEN,
                },
            }
        );

        console.log(`Tracking updated for order ${orderId}:`, response.data);
    } catch (error) {
        console.error(`Failed to update tracking for order ${orderId}:`, error?.response?.data || error.message);
    }
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
    const order = req.body;

    if (!order || !order.note) {
        console.log('No valid order or note received in webhook.');
        return res.status(400).send('Invalid webhook payload');
    }

    console.log('Received webhook:', order);

    const trackingNumber = extractTrackingNumber(order.note);
    if (trackingNumber) {
        console.log('Tracking number extracted:', trackingNumber);
        await updateTracking(order.id, trackingNumber, order.fulfillments[0].id);
    } else {
        console.log('No tracking number found in the order note.');
    }

    res.status(200).send('Webhook processed');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
