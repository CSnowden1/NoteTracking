require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process'); // To use curl command

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(bodyParser.json());

// Shopify credentials
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL; // e.g., https://your-store.myshopify.com/admin/api/2024-01
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const SHOP_DOMAIN = process.env.SHOP_DOMAIN;

// Parse tracking number from notes
function extractTrackingNumber(note) {
    const match = note.match(/Tracking Number:\s*(\d+)/i); // Updated regex for "Tracking Number: 123456"
    return match ? match[1] : null;
}

// Update tracking for an order using curl
async function updateTracking(orderId, trackingNumber, fulfillmentId) {
    if (!orderId || !trackingNumber) {
        console.error('Invalid order ID or tracking number');
        return;
    }

    try {
        console.log(`Attempting to update tracking for order ${orderId} with tracking number ${trackingNumber}`);

        // Build the curl command for updating fulfillment
        const fulfillmentData = JSON.stringify({
            fulfillment: {
                tracking_info: {
                    number: trackingNumber,
                },
                notify_customer: true, // Notify customer about tracking update
            },
        });

        const curlCommand = `curl -X PUT "https://${SHOP_DOMAIN}/admin/api/2024-01/orders/${orderId}/fulfillments/${fulfillmentId}.json" \
            -H "Content-Type: application/json" \
            -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}" \
            -d '${fulfillmentData}'`;

        // Execute the curl command
        exec(curlCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }
            console.log(`Tracking updated for order ${orderId}:`, stdout);
        });
    } catch (error) {
        console.error(`Failed to update tracking for order ${orderId}:`, error?.message);
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
