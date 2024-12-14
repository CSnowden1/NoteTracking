import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import bodyParser from 'body-parser';
import '@shopify/shopify-api/adapters/node';
import { shopifyApi } from '@shopify/shopify-api';

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
    scopes: ['write_fulfillments', 'read_fulfillments'],
    hostName: SHOP_DOMAIN,
});

// Parse tracking number from order notes
function extractTrackingNumber(note) {
    const match = note.match(/Tracking Number:\s*(\d+)/i);
    return match ? match[1] : null;
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
    const order = req.body;


    const trackingNumber = extractTrackingNumber(order.note); // Extract tracking number from notes
    const fulfillmentId = order.fulfillments[0]?.id; // Use the first fulfillment ID
    console.log(ACCESS_TOKEN);
    console.log(fulfillmentId);
    // Continue with tracking update only if a tracking number is found and a fulfillment ID is provided
    if (trackingNumber && fulfillmentId) {
        const client = new shopify.clients.Rest({
            domain: SHOP_DOMAIN,
            accessToken: ACCESS_TOKEN,
        });

        try {
            // Update tracking for the specified fulfillment ID
            await client.put({
                path: `fulfillments/${fulfillmentId}`,
                data: {
                    fulfillment: {
                        notify_customer: true,
                        tracking_info: {
                            company: 'UPS',
                            number: trackingNumber,
                        },
                    },
                },
                type: 'application/json',
            });

            console.log('Tracking updated successfully for order:', order.id);
        } catch (error) {
            console.error('Error updating tracking:', error);
        }
    } else {
        console.log('Missing tracking number or fulfillment ID.');
    }

    res.status(200).send('Webhook processed');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
