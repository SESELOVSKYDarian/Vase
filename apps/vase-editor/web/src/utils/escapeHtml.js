/**
 * Convierte un texto escrito por el usuario en texto seguro para mostrar como HTML.
 * Así, si alguien pone etiquetas o código en un título, se ve como texto y no se ejecuta.
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
