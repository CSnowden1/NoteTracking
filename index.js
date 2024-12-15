require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process'); // Used to execute shell commands (like curl)

const app = express();
const PORT = process.env.PORT || 3000;

// Shopify credentials
const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL; // Your shop's base URL, for example: "https://your-shop-name.myshopify.com"
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // The OAuth access token

// Middleware to parse JSON
app.use(bodyParser.json());

// Function to extract tracking number from notes
function extractTrackingNumber(note) {
  const match = note.match(/Tracking Number:\s*(\S+)/i);  // Adjusted regex to capture any non-whitespace characters
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
        const fulfillmentIdUrl = order.fulfillments[0].admin_graphql_api_id;  // Use admin_graphql_api_id to ensure proper GraphQL ID
        console.log(`Updating tracking for fulfillment ${fulfillmentIdUrl}`);
        await updateTracking(fulfillmentIdUrl, trackingNumber);
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

// Function to update tracking using Shopify's GraphQL API via curl
async function updateTracking(fulfillmentId, trackingNumber) {
  const graphqlQuery = `
    {
      "query": "mutation FulfillmentTrackingInfoUpdate($fulfillmentId: ID!, $trackingInfoInput: FulfillmentTrackingInput!, $notifyCustomer: Boolean) { 
        fulfillmentTrackingInfoUpdate(fulfillmentId: $fulfillmentId, trackingInfoInput: $trackingInfoInput, notifyCustomer: $notifyCustomer) { 
          fulfillment { id status trackingInfo { company number url } } 
          userErrors { field message } 
        } 
      }",
      "variables": {
        "fulfillmentId": "gid://shopify/Fulfillment/${fulfillmentId}",
        "notifyCustomer": true,
        "trackingInfoInput": {
          "company": "UPS",
          "number": "${trackingNumber}"
        }
      }
    }
  `;

  const curlCommand = `
    curl -s -X POST \\
      ${SHOPIFY_API_URL}/admin/api/2024-10/graphql.json \\
      -H "Content-Type: application/json" \\
      -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}" \\
      -d '${graphqlQuery.replace(/(\r\n|\n|\r)/gm, "")}'
  `;

  console.log(`Executing curl command: ${curlCommand}`);

  // Execute curl command to make the GraphQL request
  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing curl command: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`Response from Shopify API: ${stdout}`);
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
