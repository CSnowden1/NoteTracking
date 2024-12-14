import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import bodyParser from 'body-parser';
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, Session } from '@shopify/shopify-api';


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(bodyParser.json());

// Shopify credentials
const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const API_KEY = process.env.API_KEY;
const API_KEY_SECRET = process.env.API_KEY_SECRET;

// Initialize Shopify API client
const shopify = shopifyApi({
    apiKey: API_KEY,
    apiSecretKey: API_KEY_SECRET,
    scopes: ['write_customers, read_customers, write_fulfillments, read_fulfillments, write_order_edits, read_order_edits, read_orders, write_orders'],
    hostName: SHOP_DOMAIN,
});

// Parse tracking number from notes
function extractTrackingNumber(note) {
    const match = note.match(/Tracking Number:\s*(\d+)/i);
    return match ? match[1] : null;
}

// Update tracking for an order using Shopify Node API
async function updateTracking(orderId, trackingNumber, fulfillmentId) {
    if (!orderId || !trackingNumber || !fulfillmentId) {
        console.error('Invalid order ID, tracking number, or fulfillment ID');
        return;
    }

    try {
        console.log(`Updating tracking for order ${orderId} with number ${trackingNumber}`);

        // API request to update tracking
        const client = new shopify.clients.Rest({
            domain: SHOP_DOMAIN,
            accessToken: ACCESS_TOKEN,
        });

        const response = await client.put({
            path: `fulfillments/${fulfillmentId}`,
            data: {
                fulfillment: {
                    tracking_info: {
                        number: trackingNumber,
                        company: 'DHL Express',
                    },
                    notify_customer: true,
                },
            },
            type: 'application/json',
        });

        console.log(`Tracking updated successfully:`, response.body);
    } catch (error) {
        console.error(`Failed to update tracking for order ${orderId}:`, error.response.errors);
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
        const fulfillment = new shopify.rest.Fulfillment({session: Session});
        console.log(order.fulfillments[0].id);
        fulfillment.id = order.fulfillments[0].id;
        console.log('Fulfillment extracted:', fulfillment)
        await fulfillment.update_tracking({
            body: {"fulfillment": {"notify_customer": true, "tracking_info": {"company": "UPS", "number": `${trackingNumber}`}}},
            });
        console.log('Tracking updated for order:', order.id);
    } else {
        console.log('No tracking number found in the order note.');
    }

    res.status(200).send('Webhook processed');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
