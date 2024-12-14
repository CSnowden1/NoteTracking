require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Shopify } = require('@shopify/shopify-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(bodyParser.json());

// Shopify credentials
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL; // e.g., https://your-store.myshopify.com
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const SHOP_DOMAIN = process.env.SHOP_DOMAIN; // your-store.myshopify.com

// Set up Shopify API client
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: ['write_customers, read_customers, write_fulfillments, read_fulfillments, write_order_edits, read_order_edits, read_orders, write_orders'],
  HOST_NAME: SHOPIFY_API_URL,
  API_VERSION: '2023-10', // Choose API version according to your setup
  IS_EMBEDDED_APP: false,
  ACCESS_TOKEN: ACCESS_TOKEN,
});

// Parse tracking number from notes
function extractTrackingNumber(note) {
    const match = note.match(/Tracking Number:\s*(\d+)/i); // Adjust regex as needed
    return match ? match[1] : null;
}

// Update tracking using Shopify API
async function updateTracking(orderId, trackingNumber) {
    try {
        const session = await Shopify.Utils.loadOfflineSession(SHOP_DOMAIN); // This loads the session for your store
        const fulfillment = new Shopify.rest.Fulfillment({ session });
        fulfillment.id = orderId;  // Specify the order fulfillment ID

        // Use update_tracking method as specified in the SDK
        await fulfillment.update_tracking({
            body: {
                fulfillment: {
                    notify_customer: true,
                    tracking_info: {
                        number: trackingNumber,
                    },
                },
            },
        });

        console.log(`Tracking updated for order ${orderId}`);
    } catch (error) {
        console.error(`Error updating tracking for order ${orderId}:`, error);
    }
}

// Webhook endpoint to trigger the tracking update
app.post('/webhook', async (req, res) => {
    const order = req.body;

    if (order && order.note) {
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
