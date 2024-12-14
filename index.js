require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Shopify credentials
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL;  // Your shop's base URL, e.g., 'your-shop.myshopify.com'
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;  // The OAuth access token
const SHOP_DOMAIN = process.env.SHOP_DOMAIN;  // The shop's domain, e.g., 'your-shop.myshopify.com'

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
    const fulfillmentId = 1234567890; // Replace with actual fulfillment ID (you might need to query for it)
    const url = `https://${SHOP_DOMAIN}/admin/api/2024-01/orders/${orderId}/fulfillments/${fulfillmentId}.json`;

    const body = {
      fulfillment: {
        notify_customer: true,
        tracking_info: {
          company: 'UPS',
          number: trackingNumber,
        },
      },
    };

    const response = await axios.put(url, body, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,  // Authentication with access token
        'Content-Type': 'application/json',
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
