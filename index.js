require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Shopify credentials
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL; // Your shop's base URL
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // The OAuth access token

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
  console.log('Received webhook:', order);

  if (order && order.note) {
    const trackingNumber = extractTrackingNumber(order.note);
    console.log('Tracking Number:', trackingNumber);
    if (trackingNumber) {
      try {
        // Update tracking using GraphQL
        console.log(`Updating tracking for fulfillment ${order.fulfillments[0].id}`);
        await updateTracking(order.fulfillments[0].id, trackingNumber);
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

// Function to update tracking using Shopify's GraphQL API
async function updateTracking(fulfillmentId, trackingNumber) {
  try {
    const graphqlQuery = {
      query: `
        mutation {
          fulfillmentTrackingInfoUpdateV2(
            id: "gid://shopify/Fulfillment/${fulfillmentId}",
            trackingInfo: {
              number: "${trackingNumber}",
              company: "UPS"
            }
          ) {
            fulfillment {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
    };

    const response = await axios.post(
      `${SHOPIFY_API_URL}/admin/api/2024-10/graphql.json`,
      graphqlQuery,
      {
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;
    if (data.errors || data.data.fulfillmentTrackingInfoUpdateV2.userErrors.length) {
      throw new Error(
        `GraphQL errors: ${JSON.stringify(
          data.errors || data.data.fulfillmentTrackingInfoUpdateV2.userErrors
        )}`
      );
    }

    console.log(`Tracking updated successfully for fulfillment ID ${fulfillmentId}`);
    return data.data.fulfillmentTrackingInfoUpdateV2.fulfillment;
  } catch (error) {
    console.error(`Error updating tracking: ${error.message}`);
    throw error;
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
