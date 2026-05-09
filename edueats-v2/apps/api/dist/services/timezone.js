const BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000;
const getBogotaDateParts = (nowMs) => {
    // Colombia (America/Bogota) usa UTC-5 todo el ano (sin DST).
    const shifted = new Date(nowMs + BOGOTA_OFFSET_MS);
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth(),
        day: shifted.getUTCDate(),
    };
};
export const getBogotaStartOfDayMs = (nowMs) => {
    const { year, month, day } = getBogotaDateParts(nowMs);
    return Date.UTC(year, month, day, 0, 0, 0, 0) - BOGOTA_OFFSET_MS;
};
export const getBogotaEndOfDayMs = (nowMs) => {
    const { year, month, day } = getBogotaDateParts(nowMs);
    return Date.UTC(year, month, day, 23, 59, 59, 999) - BOGOTA_OFFSET_MS;
};
