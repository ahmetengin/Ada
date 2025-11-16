/**
 * PayTR Webhook Endpoint - Minimal implementation
 * Handles payment notifications from PayTR
 */

import { BaseNode } from '../../core/BaseNode.js';

const processedPayments = new Set<string>();

export async function handlePayTRWebhook(payload: any): Promise<{ success: boolean; message: string }> {
  // 1. Verify signature
  const financeNodes = BaseNode.findNodesByType('ada.finance');
  if (financeNodes.length === 0) {
    return { success: false, message: 'Finance node not found' };
  }

  const isValid = await financeNodes[0].request('verify-webhook', payload);
  if (!isValid.valid) {
    console.error('Invalid PayTR signature');
    return { success: false, message: 'Invalid signature' };
  }

  const { merchant_oid, status, total_amount } = payload;

  // 2. Idempotency check
  if (processedPayments.has(merchant_oid)) {
    console.log(\`Payment \${merchant_oid} already processed\`);
    return { success: true, message: 'Already processed' };
  }

  // 3. Extract booking ID
  const bookingId = merchant_oid.split('-')[1];
  const amount = parseFloat(total_amount) / 100;

  if (status === 'success') {
    // 4. Find and confirm payment
    const travelNodes = BaseNode.findNodesByType('ada.travel');
    const congressNodes = BaseNode.findNodesByType('ada.congress');
    const restaurantNodes = BaseNode.findNodesByType('ada.restaurant');

    try {
      // Try travel first
      if (travelNodes.length > 0) {
        await travelNodes[0].request('confirm-flight-payment', {
          bookingId,
          transactionId: merchant_oid,
          paidAmount: amount,
          paymentMethod: 'credit-card',
        });
      }
      // Then congress
      else if (congressNodes.length > 0) {
        await congressNodes[0].request('confirm-payment', {
          registrationId: bookingId,
          transactionId: merchant_oid,
          paidAmount: amount,
          paymentMethod: 'credit-card',
        });
      }
      // Then restaurant
      else if (restaurantNodes.length > 0) {
        await restaurantNodes[0].request('confirm-catering-payment', {
          orderId: bookingId,
          transactionId: merchant_oid,
          paidAmount: amount,
          paymentMethod: 'credit-card',
        });
      }

      processedPayments.add(merchant_oid);
      console.log(\`✅ Payment confirmed for \${bookingId}\`);
      return { success: true, message: 'Payment confirmed' };
    } catch (error: any) {
      console.error(\`Payment confirmation failed: \${error.message}\`);
      return { success: false, message: error.message };
    }
  }

  return { success: true, message: 'Payment failed or pending' };
}
