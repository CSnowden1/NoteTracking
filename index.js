require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Shopify credentials
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL;  // Your shop's base URL
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;  // The OAuth access token
const SHOP_DOMAIN = process.env.SHOP_DOMAIN;  // Your shop's domain

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
      try {
        await updateTracking(order.id, trackingNumber);
        console.log(`Tracking updated for order ${order.id}`);
      } catch (error) {
        console.error(`Failed to update tracking for order ${order.id}:`, error.message);
      }
    } else {
      console.log(`No tracking number found in note for order ${order.id}`);
    }
  } else {
    console.log(`Invalid order data received`);
  }

  res.status(200).send('Webhook processed');
});

// Function to fetch fulfillment ID and update the tracking number in Shopify
async function updateTracking(orderId, trackingNumber) {
  try {
    // Fetch fulfillments for the given order
    const fulfillmentsUrl = `${SHOPIFY_API_URL}/admin/api/2024-10/orders/${orderId}/fulfillments.json`;

    const fulfillmentsResponse = await axios.get(fulfillmentsUrl, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
      },
    });

    const fulfillment = fulfillmentsResponse.data.fulfillments[0]; // Use the first fulfillment
    if (!fulfillment) {
      throw new Error('No fulfillments found for this order');
    }

    const fulfillmentId = fulfillment.id; // Get the ID of the fulfillment
  
    // Update tracking
    const updateTrackingUrl = `${SHOPIFY_API_URL}/admin/api/2024-10/fulfillments/${fulfillmentId}/update_tracking.json`;

    console.log(`Updating tracking for fulfillment ID ${fulfillmentId}`);

    const body = {
      fulfillment: {
        notify_customer: true,
        tracking_info: {
          company: 'UPS', // Replace with the actual carrier if needed
          number: trackingNumber,
        },
      },
    };

    const response = await axios.post(updateTrackingUrl, body, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Tracking updated successfully for fulfillment ID ${fulfillmentId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Error updating tracking: ${error.message}`);
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
