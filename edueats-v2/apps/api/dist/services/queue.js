/**
 * In-memory queue facade.
 * Keeps API compatibility in environments without external queue infra.
 */
let queuesReady = false;
const emailJobs = [];
const notificationJobs = [];
/**
 * Initialize all background job queues
 */
export async function initQueues() {
    queuesReady = true;
    console.log('[Queues] Cola en memoria inicializada.');
}
/**
 * Add email job to queue
 * @example await enqueueEmail('verification', { userId: '123', email: 'user@example.com', code: '123456' })
 */
export async function enqueueEmail(emailType, data) {
    if (!queuesReady) {
        console.warn('[Queues] Cola no inicializada. Email no encolado:', emailType);
        return null;
    }
    const job = {
        id: `${emailType}-${data.userId || 'unknown'}-${Date.now()}`,
        name: `send-${emailType}`,
        data,
        createdAt: Date.now(),
    };
    emailJobs.push(job);
    // Preserve previous behavior: auth fallback sends synchronously when queue returns null.
    return null;
}
/**
 * Add notification job to queue
 */
export async function enqueueNotification(notificationType, data) {
    if (!queuesReady) {
        console.warn('[Queues] Cola no inicializada. Notificación no encolada:', notificationType);
        return null;
    }
    const job = {
        id: `notif-${data.userId || 'unknown'}-${Date.now()}`,
        name: `send-${notificationType}`,
        data,
        createdAt: Date.now(),
    };
    notificationJobs.push(job);
    return job;
}
/**
 * Get queue status
 */
export async function getQueueStatus() {
    const status = {
        emailQueue: queuesReady ? 'memory' : 'disabled',
        emailQueueCounts: {
            waiting: emailJobs.length,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
        },
        notificationQueue: queuesReady ? 'memory' : 'disabled',
        notificationQueueCounts: {
            waiting: notificationJobs.length,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
        },
    };
    return status;
}
/**
 * Close all queues and workers
 */
export async function closeQueues() {
    queuesReady = false;
    emailJobs.length = 0;
    notificationJobs.length = 0;
    console.log('[Queues] Queues cerradas.');
}
/**
 * Get email queue (for tests)
 */
export function getEmailQueue() {
    return emailJobs;
}
/**
 * Get notification queue (for tests)
 */
export function getNotificationQueue() {
    return notificationJobs;
}
