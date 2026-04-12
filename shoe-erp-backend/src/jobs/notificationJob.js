'use strict';

const cron = require('node-cron');
const notificationSvc = require('../services/notificationService');

function startNotificationJob() {
  console.log('[Cron] Setting up 6-hour notification background job: "0 */6 * * *"');
  
  // Schedule: Minute 0 past every 6th hour
  cron.schedule('0 */6 * * *', async () => {
    try {
      console.log(`[Cron] Executing Notification Jobs at ${new Date().toISOString()}`);
      const lowStockCount = await notificationSvc.generateLowStockNotifications();
      const pendWoCount = await notificationSvc.generatePendingWONotifications();
      const poDueCount = await notificationSvc.generatePODueNotifications();

      console.log(`[Cron] Completed successfully. Interdictions: LowStock=${lowStockCount}, PendWO=${pendWoCount}, PO_Due=${poDueCount}`);
    } catch (err) {
      console.error(`[Cron] Notification Job Failed:`, err);
    }
  });
}

module.exports = { startNotificationJob };
