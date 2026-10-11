const stages = {
  idle: 'Toca el sobre para abrirlo',
  charging: 'Preparando tu sobre…',
  tearing: 'Abriendo el sobre…',
  emerging: 'Tus cinco cromos están aquí.',
  ready: 'Listos para descubrir.',
};

export default function PackArtwork({ stage, disabled, onOpen, pending }) {
  return (
    <div className="packs-art" data-stage={stage}>
      <span className="packs-orbit" aria-hidden="true" />
      <div className="packs-opening-scene">
        <span className="packs-halo" aria-hidden="true" />
        <span className="packs-floor-shadow" aria-hidden="true" />
        <div className="packs-fan" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className="packs-fan-card" style={{ '--card-index': index - 2, '--card-delay': `${index * 65}ms`, '--fan-lift': `${Math.abs(index - 2) * 9}px` }}>
              <img src="/Album/Cromos/CromoAtras.jpg" alt="" />
            </span>
          ))}
        </div>
        <button type="button" className="packs-envelope" onClick={onOpen} disabled={disabled}
          aria-label={pending ? 'Recuperar apertura del sobre' : 'Abrir sobre de cinco cromos'}>
          <span className="packs-envelope-float" aria-hidden="true">
            <span className="packs-envelope-body"><img src="/Album/SobresMenu.png" alt="" /></span>
            <span className="packs-envelope-strip"><img src="/Album/SobresMenu.png" alt="" /></span>
            <span className="packs-envelope-seam" />
            <span className="packs-envelope-shine" />
          </span>
        </button>
        <span className="packs-opening-ring" aria-hidden="true" />
        <div className="packs-sparks" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <i key={index} style={{ '--spark-angle': `${index * 36}deg`, '--spark-delay': `${index % 3 * 60}ms` }} />
          ))}
        </div>
      </div>
      <span className="packs-sr-only" role="status">{stages[stage]}</span>
    </div>
  );
}
