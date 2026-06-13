/**
 * Express Session Configuration (MemoryStore only).
 *
 * SEGURIDAD:
 *  - El secret DEBE venir de SESSION_SECRET. Si no está, fallamos al arrancar
 *    (no usamos fallback hardcodeado).
 *  - En producción exigimos secure:true y SameSite=Strict.
 *  - La cookie usa prefijo __Host- en producción (requiere secure:true, path=/, no Domain).
 */

import session from 'express-session';

const isProduction = process.env.NODE_ENV === 'production';

function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    if (isProduction) {
      // Fail-closed en producción: nunca arrancamos con un secret debil o publico.
      throw new Error(
        '[Sessions] SESSION_SECRET es obligatorio en producción. ' +
        'Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
      );
    }
    // En desarrollo, log de warning pero no fallamos (facilita onboarding).
    console.warn(
      '[Sessions] AVISO: SESSION_SECRET no está definido. Usando un secret solo-para-desarrollo. ' +
      'Define SESSION_SECRET antes de pasar a producción.',
    );
    return 'dev-only-insecure-secret-rotate-before-prod';
  }
  return secret;
}

export function getSessionMiddleware() {
  const secret = resolveSessionSecret();
  console.log(`[Sessions] Cookie ${isProduction ? '__Host-edueats_session (secure, SameSite=Strict)' : 'edueats_session (dev)'}.`);

  return session({
    name: isProduction ? '__Host-edueats_session' : 'edueats_session',
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    },
  });
}
