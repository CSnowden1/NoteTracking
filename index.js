require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Shopify credentials
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL; // Your shop's base URL, for example: "https://your-shop-name.myshopify.com"
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // The OAuth access token

// Middleware to parse JSON
app.use(bodyParser.json());

// Store processed order IDs to prevent duplicate handling
const processedOrders = new Set();

// Function to extract tracking number from notes
function extractTrackingNumber(note) {
  const match = note.match(/Tracking Number:\s*(\S+)/i); // Adjusted regex to capture any non-whitespace characters
  return match ? match[1] : null;
}

// Webhook endpoint to trigger the tracking update
app.post('/webhook', async (req, res) => {
  const order = req.body;

  // Immediately respond to avoid Shopify retries
  res.status(200).send('Webhook received');

  console.log('Received webhook:', order);

  // Validate order data and check if it was already processed
  if (order && order.id && !processedOrders.has(order.id)) {
    const trackingNumber = extractTrackingNumber(order.note);
    console.log('Tracking Number:', trackingNumber);

    if (trackingNumber && order.fulfillments?.length) {
      const fulfillmentIdUrl = order.fulfillments[0].admin_graphql_api_id;
      console.log(`Updating tracking for fulfillment ${fulfillmentIdUrl}`);
      
      try {
        await updateTracking(fulfillmentIdUrl, trackingNumber);
        console.log(`Tracking updated for order ${order.id}`);

        // Mark the order as processed
        processedOrders.add(order.id);
      } catch (error) {
        console.error(`Failed to update tracking for order ${order.id}:`, error.message);
      }
    } else {
      console.log(`No tracking number or fulfillment found for order ${order.id}`);
    }
  } else {
    console.log(`Order ${order?.id} already processed or invalid data received.`);
  }
});
    
// Function to update tracking using Shopify's GraphQL API via curl
async function updateTracking(fulfillmentId, trackingNumber) {
  const curlCommand = `
    curl -s -X POST \\
      ${SHOPIFY_API_URL}/admin/api/2024-10/graphql.json \\
      -H "Content-Type: application/json" \\
      -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}" \\
      -d '{
            "query": "mutation FulfillmentTrackingInfoUpdate($fulfillmentId: ID!, $trackingInfoInput: FulfillmentTrackingInput!, $notifyCustomer: Boolean) { fulfillmentTrackingInfoUpdate(fulfillmentId: $fulfillmentId, trackingInfoInput: $trackingInfoInput, notifyCustomer: $notifyCustomer) { fulfillment { id status trackingInfo { company number url } } userErrors { field message } } }",
            "variables": {
                "fulfillmentId": "${fulfillmentId}",
                "notifyCustomer": true,
                "trackingInfoInput": {
                  "company": "DHL Express",
                  "number": "${trackingNumber}"
                }
            }
        }'
    `;

  console.log(`Executing curl command: ${curlCommand}`);

  // Execute curl command to make the GraphQL request
  return new Promise((resolve, reject) => {
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing curl command: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        reject(new Error(stderr));
        return;
      }
      console.log(`Response from Shopify API: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
