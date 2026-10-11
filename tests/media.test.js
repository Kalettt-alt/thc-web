import test from 'node:test';
import assert from 'node:assert/strict';
import { safeHexColor, safeProfileTheme, validateImageFile } from '../src/utils/media.js';

test('solo admite colores hexadecimales completos en CSS del perfil', () => {
  assert.equal(safeHexColor('#abc123'), '#abc123');
  for (const value of ['red; } body { display:none', 'url(javascript:alert(1))', '#abc', null]) assert.equal(safeHexColor(value), '#A855F7');
  assert.equal(safeProfileTheme('pixel'), 'pixel');
  assert.equal(safeProfileTheme('pixel extra-class'), 'default');
});

test('valida firma, formato, límite de peso y permiso GIF', async () => {
  const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'imagen.png', { type: 'image/png' });
  assert.equal(await validateImageFile(png), 'png');
  await assert.rejects(validateImageFile(png, { maxBytes: 4 }));
  await assert.rejects(validateImageFile(new File(['<svg onload="alert(1)">'], 'imagen.png', { type: 'image/png' })));
  await assert.rejects(validateImageFile(new File(['<svg/>'], 'imagen.svg', { type: 'image/svg+xml' })));
  await assert.rejects(validateImageFile(new File(['GIF89a'], 'imagen.gif', { type: 'image/gif' }), { allowGif: false }));
});
