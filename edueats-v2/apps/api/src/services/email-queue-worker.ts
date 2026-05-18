/**
 * Email Queue Worker
 * Processes email jobs from BullMQ queue
 * Run separately: node --loader tsx src/services/email-queue-worker.ts
 */

import { Worker } from 'bullmq';
import nodemailer, { Transporter } from 'nodemailer';
import { getRedisClient, initRedis, closeRedis } from './redis.js';

let transporter: Transporter | null = null;

/**
 * Initialize email transporter
 */
function initializeEmailTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.warn('[EmailWorker] EMAIL_USER o EMAIL_PASSWORD no configurados. Emails serán simulados.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
}

/**
 * Process email job
 */
async function processEmailJob(emailType: string, data: Record<string, any>) {
  if (!transporter) {
    console.log('[EmailWorker] Simulando envío de email (sin configuración):', emailType, data);
    return { success: true, simulated: true };
  }

  try {
    let mailOptions: any = {
      from: process.env.EMAIL_USER,
      to: data.email,
      subject: 'EduEats',
    };

    switch (emailType) {
      case 'send-verification':
        mailOptions.subject = 'Verifica tu email - EduEats';
        mailOptions.html = `
          <h2>Bienvenido a EduEats</h2>
          <p>Tu código de verificación es: <strong>${data.code}</strong></p>
          <p>Este código expira en 15 minutos.</p>
        `;
        break;

      case 'send-confirmation':
        mailOptions.subject = 'Pedido Confirmado - EduEats';
        mailOptions.html = `
          <h2>Tu pedido ha sido confirmado</h2>
          <p>Número de pedido: <strong>${data.orderId}</strong></p>
          <p>Fecha de entrega: ${data.deliveryDate}</p>
          <p>Total: $${data.totalPrice}</p>
        `;
        break;

      case 'send-reset':
        mailOptions.subject = 'Restablecer contraseña - EduEats';
        mailOptions.html = `
          <h2>Restablecer contraseña</h2>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
          <a href="${data.resetLink}">Restablecer contraseña</a>
          <p>Este enlace expira en 1 hora.</p>
        `;
        break;

      case 'send-notification':
        mailOptions.subject = data.subject || 'Notificación - EduEats';
        mailOptions.html = data.html || data.message;
        break;

      default:
        mailOptions.text = JSON.stringify(data);
    }

    const result = await transporter.sendMail(mailOptions);
    console.log(`[EmailWorker] Email enviado: ${emailType} a ${data.email}`);
    return { success: true, messageId: result.messageId };
  } catch (err: any) {
    console.error('[EmailWorker] Error enviando email:', err.message);
    throw err;
  }
}

/**
 * Start email worker
 */
async function startEmailWorker() {
  await initRedis();
  const redis = getRedisClient();

  if (!redis) {
    console.error('[EmailWorker] Redis no disponible. Worker no puede iniciarse.');
    process.exit(1);
  }

  transporter = initializeEmailTransporter();

  const worker = new Worker(
    'emails',
    async (job) => {
      const [emailType, ...rest] = job.name.split(':');
      const jobData = job.data;

      console.log(`[EmailWorker] Procesando job: ${job.name} (ID: ${job.id})`);

      try {
        const result = await processEmailJob(emailType, jobData);
        console.log(`[EmailWorker] Job completado: ${job.id}`);
        return result;
      } catch (err: any) {
        console.error(`[EmailWorker] Job fallido: ${job.id} - ${err.message}`);
        throw err; // BullMQ lo reintentará
      }
    },
    {
      connection: redis as any,
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[EmailWorker] ✅ Completado: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] ❌ Fallido: ${job?.id} - ${err.message}`);
  });

  console.log('[EmailWorker] Iniciado. Escuchando jobs...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[EmailWorker] Recibido SIGTERM. Cerrando...');
    await worker.close();
    await closeRedis();
    process.exit(0);
  });
}

// Start if run directly
startEmailWorker().catch((err) => {
  console.error('[EmailWorker] Fatal error:', err);
  process.exit(1);
});
