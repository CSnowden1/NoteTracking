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


async function updateTracking(orderId, trackingNumber) {
    console.log(ACCESS_TOKEN + SHOPIFY_API_URL);
    console.log(`Updating tracking for order ${orderId} with tracking number ${trackingNumber}`);
    if (!orderId ||!trackingNumber) {
        console.error('Invalid order ID or tracking number');
        return;
    }
    try {
        console.log('Create Tracking Query');
        // Get the order detailsconso
        // Update tracking in Shopify
        const fulfillmentData = {
            fulfillment: {
                tracking_info: {
                    number: trackingNumber,
                },
                notify_customer: true,
            },
        };
        console.log('Sending Tracking Update Request');
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
        console.log(order.note);
    // Log the received webhook for debugging purposes
    console.log('Received webhook:', order);

    if (order.note) {
        const trackingNumber = extractTrackingNumber(order.note);
        console.log('Tracking number:', trackingNumber);
        // Update the order with the tracking number

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
