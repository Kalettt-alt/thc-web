import { Settings2 } from 'lucide-react';

export default function MatchDisplayOptions({ display, onChange }) {
  return <div className="df-display-options">
    <div className="df-section-heading"><span>ASPECTO DE LA CANCHA</span><Settings2 size={18} /></div>
    <button type="button" role="switch" aria-checked={display.detailedPitch} className="df-display-option" onClick={() => onChange({ ...display, detailedPitch: !display.detailedPitch })}>
      <span><b>Cancha detallada</b><small>{display.detailedPitch ? 'Activada · estadio, tribunas, luces y textura de césped.' : 'Desactivada · césped liso, líneas y porterías. Mucho más ligera.'}</small></span><span className={`df-switch ${display.detailedPitch ? 'is-on' : ''}`}><i /></span>
    </button>
    <button type="button" role="switch" aria-checked={display.showRadar} className="df-display-option" onClick={() => onChange({ ...display, showRadar: !display.showRadar })}>
      <span><b>Radar</b><small>Muestra un mapa de los equipos al seguir el balón. Puedes apagarlo para aligerar aún más la vista.</small></span><span className={`df-switch ${display.showRadar ? 'is-on' : ''}`}><i /></span>
    </button>
    <p className="df-muted">Se guarda en este dispositivo. La apariencia no cambia el tamaño de la cancha ni la jugabilidad.</p>
  </div>;
}
