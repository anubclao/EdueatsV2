/**
 * BullMQ Queue Service
 * Manages background jobs (emails, notifications, reports)
 */
import { Queue } from 'bullmq';
import { getRedisClient } from './redis.js';
let emailQueue = null;
let notificationQueue = null;
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
            connection: redis,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: { age: 3600 }, // Remove after 1 hour
            },
        });
        // Notification queue: send in-app notifications, SMS, push notifications
        notificationQueue = new Queue('notifications', {
            connection: redis,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: { age: 1800 }, // Remove after 30 minutes
            },
        });
        console.log('[Queues] Email y Notification queues inicializadas.');
    }
    catch (err) {
        console.error('[Queues] Error inicializando queues:', err.message);
    }
}
/**
 * Add email job to queue
 * @example await enqueueEmail('verification', { userId: '123', email: 'user@example.com', code: '123456' })
 */
export async function enqueueEmail(emailType, data) {
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
    }
    catch (err) {
        console.error('[Queues] Error encolando email:', err.message);
        return null;
    }
}
/**
 * Add notification job to queue
 */
export async function enqueueNotification(notificationType, data) {
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
    }
    catch (err) {
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
        emailQueueCounts: null,
        notificationQueue: notificationQueue ? 'active' : 'disabled',
        notificationQueueCounts: null,
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
    if (emailQueue)
        await emailQueue.close();
    if (notificationQueue)
        await notificationQueue.close();
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
