import logoTHC from './LogoTHC.png';

const imageModules = import.meta.glob('./Imag/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' });
const imageMap = Object.fromEntries(Object.entries(imageModules).map(([path, url]) => [path.split('/').pop().toLowerCase(), url]));

export function clubCrestDF(club) {
  return imageMap[String(club?.img || '').split('/').pop().toLowerCase()] || logoTHC;
}
