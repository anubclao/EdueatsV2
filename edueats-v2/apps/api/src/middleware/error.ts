/**
 * Helpers de manejo de errores.
 *
 * - `asyncHandler` envuelve handlers async y propaga el error a `next`.
 * - `errorHandler` es un middleware de Express que:
 *    * loguea el error completo en el servidor (con stack en dev)
 *    * responde al cliente con un mensaje SANITIZADO (nunca filtramos
 *      mensajes de MySQL, paths, queries, etc.)
 */

import type { NextFunction, Request, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

export const asyncHandler = (fn: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const isProduction = process.env.NODE_ENV === 'production';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  // Log completo en el servidor, con la ruta para correlación.
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const safeMessage = status >= 500
    ? (isProduction ? 'Error interno del servidor.' : (err?.message || 'Error interno del servidor.'))
    : (err?.message || 'Solicitud inválida.');

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${status}:`, err);
  } else {
    console.warn(`[error] ${req.method} ${req.originalUrl} -> ${status}: ${err?.message}`);
  }

  if (res.headersSent) return;
  res.status(status).json({ error: safeMessage });
};
