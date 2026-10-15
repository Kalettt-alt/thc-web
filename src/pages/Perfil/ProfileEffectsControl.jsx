import { Sparkles } from 'lucide-react';
import './ProfileEffectsControl.css';

export default function ProfileEffectsControl({ preference, onChange }) {
  return <label className="profile-effects-control"><Sparkles size={16} aria-hidden="true" /><select aria-label="Efectos del perfil" value={preference} onChange={event => onChange(event.target.value)}><option value="auto">Efectos: Auto</option><option value="full">Animados</option><option value="calm">Suaves</option><option value="off">Pausados</option></select></label>;
}
