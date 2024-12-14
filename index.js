import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import bodyParser from 'body-parser';
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, Session, restResources } from '@shopify/shopify-api';


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
    restResources
});


// Parse tracking number from notes
function extractTrackingNumber(note) {
    const match = note.match(/Tracking Number:\s*(\d+)/i);
    return match ? match[1] : null;
}


app.post('/webhook', async (req, res) => {
    const order = req.body;

    if (!order || !order.fulfillments || order.fulfillments.length === 0) {
        console.log('No fulfillments found in webhook payload.');
        return res.status(400).send('Invalid webhook payload');
    }

    const trackingNumber = extractTrackingNumber(order.note); // Assuming extractTrackingNumber function exists
    const fulfillmentId = order.fulfillments[0].id;

    if (trackingNumber && fulfillmentId) {
        const session = new Session({
            shop: SHOP_DOMAIN,
            accessToken: ACCESS_TOKEN,
            isOnline: false,
        });

        const fulfillment = new shopify.rest.Fulfillment({ session });
        fulfillment.id = fulfillmentId;

        try {
            await fulfillment.update_tracking({
                body: {
                    fulfillment: {
                        notify_customer: true,
                        tracking_info: {
                            company: 'UPS',
                            number: trackingNumber,
                        },
                    },
                },
            });
            console.log('Tracking updated for order:', order.id);
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
