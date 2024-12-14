
// Update tracking for an order
async function updateTracking(orderId, trackingNumber) {
    try {
        const fulfillmentData = {
            fulfillment: {
                tracking_info: {
                    number: trackingNumber,
                },
                notify_customer: true, // Optional: Notify customer about tracking update
            },
        };

        const response = await axios.post(
            `${SHOPIFY_API_URL}/orders/${orderId}/fulfillments.json`,
            fulfillmentData,
            {
                headers: {
                    "X-Shopify-Access-Token": ACCESS_TOKEN,
                },
            }
        );

        console.log(`Tracking updated for order ${orderId}:`, response.data);
    } catch (error) {
        console.error(`Failed to update tracking for order ${orderId}:`, error.response.data);
    }
}


 if (trackingNumber) {
            await updateTracking(order.id, trackingNumber);
        }