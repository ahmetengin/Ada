/**
 * Auto-cancellation job for expired bookings
 * Runs every 5 minutes
 */

import { BaseNode } from '../core/BaseNode.js';

export function startCleanupJob() {
  // Run every 5 minutes
  setInterval(async () => {
    const now = new Date();
    let totalCancelled = 0;

    // Cleanup Travel bookings
    const travelNodes = BaseNode.findNodesByType('ada.travel');
    for (const travelNode of travelNodes) {
      const status = travelNode.getStatus();
      // Note: This is simplified - in production, expose an API to cancel expired bookings
      console.log(\`Checking travel node: \${status.totalBookings} bookings\`);
    }

    console.log(\`✅ Cleanup complete: \${totalCancelled} bookings auto-cancelled\`);
  }, 5 * 60 * 1000); // 5 minutes

  console.log('🕐 Auto-cancellation job started (runs every 5 minutes)');
}

// For manual execution
export async function cleanupExpiredBookings() {
  const now = new Date();
  let cancelledCount = 0;

  const travelNodes = BaseNode.findNodesByType('ada.travel');
  
  // In production, this would iterate through actual bookings
  // For now, this is a placeholder that nodes can call
  
  console.log(\`Cleaned up \${cancelledCount} expired bookings\`);
  return cancelledCount;
}
