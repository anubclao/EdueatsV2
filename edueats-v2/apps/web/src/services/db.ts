// Toda la lógica de datos ahora vive en el backend Express (server/).
// Este módulo re-exporta el servicio async que llama a la API MySQL.
export { db } from './api';
