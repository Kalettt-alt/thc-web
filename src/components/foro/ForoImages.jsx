import { ArrowUpRight } from 'lucide-react';
import { imagenSegura } from '../../utils/foro';

export default function ForoImages({ images, compact = false }) {
  const urls = (images || []).map(imagenSegura).filter(Boolean);
  if (!urls.length) return null;
  return <div className={`fdetail-attachments ${compact ? 'fdetail-attachments--comment' : ''}`}>{urls.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src={url} alt={`Imagen adjunta ${index + 1}`} /><span>Ver imagen<ArrowUpRight size={17} aria-hidden="true" /></span></a>)}</div>;
}
