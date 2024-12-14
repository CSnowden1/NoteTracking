require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Shopify } = require('@shopify/shopify-api'); // Correct destructuring

const app = express();
const PORT = process.env.PORT || 3000;

// Shopify credentials
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const SHOP_DOMAIN = process.env.SHOP_DOMAIN;

// Initialize Shopify context
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: ['write_customers', 'read_customers', 'write_fulfillments', 'read_fulfillments', 'write_order_edits', 'read_order_edits', 'read_orders', 'write_orders'],
  HOST_NAME: SHOPIFY_API_URL,
  API_VERSION: '2023-10', 
  IS_EMBEDDED_APP: false,
  ACCESS_TOKEN: ACCESS_TOKEN,
});

// Middleware to parse JSON
app.use(bodyParser.json());

// Function to extract tracking number from notes
function extractTrackingNumber(note) {
  const match = note.match(/Tracking Number:\s*(\d+)/i);
  return match ? match[1] : null;
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

// Function to update the tracking number in Shopify
async function updateTracking(orderId, trackingNumber) {
  try {
    const session = await Shopify.Utils.loadOfflineSession(SHOP_DOMAIN);
    const fulfillment = new Shopify.rest.Fulfillment({ session });
    fulfillment.id = orderId;

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

    console.log(`Tracking updated for order ${orderId}`);
  } catch (error) {
    console.error(`Error updating tracking for order ${orderId}:`, error);
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
