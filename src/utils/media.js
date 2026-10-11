const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const textAt = (bytes, start, value) => [...value].every((char, i) => bytes[start + i] === char.charCodeAt(0));

export async function validateImageFile(file, { maxBytes = 5 * 1024 * 1024, allowGif = true } = {}) {
  if (!file || !IMAGE_TYPES[file.type] || (!allowGif && file.type === 'image/gif')) {
    throw new Error(`Usa una imagen PNG, JPG o WebP${allowGif ? ' o GIF' : ''}.`);
  }
  if (!file.size || file.size > maxBytes) throw new Error(`La imagen debe pesar menos de ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = {
    'image/png': [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte),
    'image/jpeg': bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    'image/gif': textAt(bytes, 0, 'GIF87a') || textAt(bytes, 0, 'GIF89a'),
    'image/webp': textAt(bytes, 0, 'RIFF') && textAt(bytes, 8, 'WEBP'),
  };
  if (!valid[file.type]) throw new Error('El archivo no coincide con su formato de imagen.');
  return IMAGE_TYPES[file.type];
}

export function safeHexColor(value, fallback = '#A855F7') {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export const PROFILE_THEME_IDS = Object.freeze(['default', 'twc', 'pixel', 'club', 'editorial', 'aurora', 'terminal', 'estadio', 'vinilo', 'eclipse']);

export function safeProfileTheme(value) {
  return PROFILE_THEME_IDS.includes(value) ? value : 'default';
}
