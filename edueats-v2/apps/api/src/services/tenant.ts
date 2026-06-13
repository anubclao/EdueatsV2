/**
 * Query helpers multi-tenant.
 *
 * Toda query que toque una tabla tenant-scoped DEBE pasar por `scopedWhere`
 * o `withSchoolScope`, para garantizar que el colegio activo filtra los datos.
 * Esto es la línea de defensa #1 contra fugas entre colegios.
 *
 * Uso típico:
 *   const [rows] = await pool.query(
 *     `SELECT * FROM recipes ${scopedWhere('recipes')}`,
 *     [req.schoolId]
 *   );
 *
 *   const conn = await pool.getConnection();
 *   await conn.execute(
 *     `UPDATE recipes SET name=? ${scopedWhere('recipes')}`,
 *     [name, req.schoolId]
 *   );
 *
 * La función es defensiva: si `schoolId` no está presente, falla con error
 * explícito (no devuelve "todo") para que un descuido se note en el log.
 */

import type { Request } from 'express';

/**
 * Devuelve el fragmento `WHERE school_id = ?` listo para inyectar.
 * Si la query ya tiene un WHERE existente, antepone AND.
 *
 * @param table Nombre de la tabla (solo para logging/debug).
 * @param existingWhere Ej: '' o 'WHERE status = ?' para componer.
 */
export function scopedWhere(table: string, existingWhere: string = ''): string {
  if (!existingWhere) return `WHERE school_id = ?`;
  // Reemplaza el primer WHERE por WHERE con school_id
  return existingWhere.replace(/WHERE/i, 'WHERE school_id = ? AND') + '';
}

/**
 * Devuelve el fragmento `AND school_id = ?` para agregar a un WHERE existente.
 */
export function andScoped(table: string = ''): string {
  return `AND school_id = ?`;
}

/**
 * Resuelve el schoolId de un request. Falla ruidosamente si no existe.
 */
export function getSchoolId(req: Request): string {
  const sid = req.schoolId;
  if (!sid) {
    throw new Error(
      `[tenant] schoolId no presente en el request. ` +
      `Asegúrate de que el middleware requireAuth se ejecutó antes de la query contra la tabla.`,
    );
  }
  return sid;
}

/**
 * Helper para queries de admin que intencionalmente quieren ver datos
 * de TODOS los colegios (futuro: solo para super-admin).
 * No usar en código de negocio regular.
 */
export function unscopedNote(): string {
  return '/* UNSCOPED */';
}
