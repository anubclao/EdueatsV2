/**
 * BullMQ Queue Service
 * Manages background jobs (emails, notifications, reports)
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedisClient } from './redis.js';

let emailQueue: Queue | null = null;
let notificationQueue: Queue | null = null;
let emailWorker: Worker | null = null;
let notificationWorker: Worker | null = null;

/**
 * Initialize all background job queues
 */
export async function initQueues() {
  const redis = getRedisClient();

  if (!redis) {
    console.log('[Queues] Redis no disponible. Queues deshabilitadas.');
    return;
  }

  try {
    // Email queue: send verification emails, order confirmations, etc.
    emailQueue = new Queue('emails', {
      connection: redis as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600 }, // Remove after 1 hour
      },
    });

    // Notification queue: send in-app notifications, SMS, push notifications
    notificationQueue = new Queue('notifications', {
      connection: redis as any,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 1800 }, // Remove after 30 minutes
      },
    });

    console.log('[Queues] Email y Notification queues inicializadas.');
  } catch (err: any) {
    console.error('[Queues] Error inicializando queues:', err.message);
  }
}

/**
 * Add email job to queue
 * @example await enqueueEmail('verification', { userId: '123', email: 'user@example.com', code: '123456' })
 */
export async function enqueueEmail(
  emailType: 'verification' | 'confirmation' | 'reset' | 'notification',
  data: Record<string, any>
) {
  if (!emailQueue) {
    console.warn('[Queues] Email queue no disponible. Email no encolado:', emailType, data);
    return null;
  }

  try {
    const job = await emailQueue.add(`send-${emailType}`, data, {
      jobId: `${emailType}-${data.userId || 'unknown'}-${Date.now()}`,
    });
    console.log(`[Queues] Email encolado: ${emailType} (Job ID: ${job.id})`);
    return job;
  } catch (err: any) {
    console.error('[Queues] Error encolando email:', err.message);
    return null;
  }
}

/**
 * Add notification job to queue
 */
export async function enqueueNotification(
  notificationType: 'order-placed' | 'order-ready' | 'order-delivered' | 'custom',
  data: Record<string, any>
) {
  if (!notificationQueue) {
    console.warn('[Queues] Notification queue no disponible. Notificación no encolada:', notificationType);
    return null;
  }

  try {
    const job = await notificationQueue.add(`send-${notificationType}`, data, {
      jobId: `notif-${data.userId || 'unknown'}-${Date.now()}`,
    });
    console.log(`[Queues] Notificación encolada: ${notificationType} (Job ID: ${job.id})`);
    return job;
  } catch (err: any) {
    console.error('[Queues] Error encolando notificación:', err.message);
    return null;
  }
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
  const status = {
    emailQueue: emailQueue ? 'active' : 'disabled',
    emailQueueCounts: null as any,
    notificationQueue: notificationQueue ? 'active' : 'disabled',
    notificationQueueCounts: null as any,
  };

  if (emailQueue) {
    const counts = await emailQueue.getJobCounts();
    status.emailQueueCounts = counts;
  }

  if (notificationQueue) {
    const counts = await notificationQueue.getJobCounts();
    status.notificationQueueCounts = counts;
  }

  return status;
}

/**
 * Close all queues and workers
 */
export async function closeQueues() {
  if (emailWorker) await emailWorker.close();
  if (notificationWorker) await notificationWorker.close();
  if (emailQueue) await emailQueue.close();
  if (notificationQueue) await notificationQueue.close();
  console.log('[Queues] Queues cerradas.');
}

/**
 * Get email queue (for tests)
 */
export function getEmailQueue() {
  return emailQueue;
}

/**
 * Get notification queue (for tests)
 */
export function getNotificationQueue() {
  return notificationQueue;
}
