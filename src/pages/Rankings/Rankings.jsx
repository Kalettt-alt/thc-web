import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Search, X, Award, Activity, Trophy, ArrowUpRight, BarChart3, MoveHorizontal } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import logoTHC from './LogoTHC.png';
import toast from 'react-hot-toast';
import { useHomeMotion } from '../../utils/homeMotion';
import './Rankings.css';

export default function Rankings() {
  const { motionEnabled } = useHomeMotion();
  const [tabActiva, setTabActiva] = useState('puntos'); 
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [jugadores, setJugadores] = useState([]);
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [recarga, setRecarga] = useState(0);
  const jugadorSeleccionado = jugadores.find(jugador => jugador.id === seleccionadoId) || null;

  useEffect(() => {
    let activo = true;
    let solicitud = 0;
    const fetchRankings = async (mostrarLoader = false) => {
      const numero = ++solicitud;
      if (mostrarLoader) setCargando(true);
      try {
        const { data, error } = await supabase.from('estadisticas_haxball')
          .select('id, nombre, goles, asistencias, victorias, partidos_jugados, puntos, actualizado_en, goles_contra, vallas_invictas, derrotas, mvps')
          .order(tabActiva, { ascending: false }).order('nombre', { ascending: true }).limit(50);
        if (error) throw error;
        if (activo && numero === solicitud) { setJugadores(data || []); setErrorCarga(false); }
      } catch {
        if (activo && numero === solicitud) { setErrorCarga(true); toast.error('No se pudo actualizar el ranking.'); }
      } finally { if (activo && numero === solicitud) setCargando(false); }
    };
    fetchRankings(true);
    const canal = supabase.channel(`cambios-stats-${tabActiva}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estadisticas_haxball' }, () => fetchRankings())
      .subscribe();
    return () => { activo = false; supabase.removeChannel(canal); };
  }, [tabActiva, recarga]);

  const jugadoresFiltrados = useMemo(() => jugadores.filter(jugador =>
    jugador.nombre.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase())
  ), [jugadores, busqueda]);

  const cambiarBusqueda = texto => {
    setBusqueda(texto);
    const encontrado = jugadores.find(jugador => jugador.nombre.toLocaleLowerCase() === texto.trim().toLocaleLowerCase());
    setSeleccionadoId(encontrado?.id || null);
  };
  const seleccionarJugador = jugador => setSeleccionadoId(jugador?.id || null);
  const mostrarPodio = busqueda.trim() === '' && jugadoresFiltrados.length >= 3;
  const top3 = mostrarPodio ? jugadoresFiltrados.slice(0, 3) : [];
  const restoTabla = mostrarPodio ? jugadoresFiltrados.slice(3) : jugadoresFiltrados;

  const calcularWinrate = (wins, total) => {
    if (!total || total === 0) return '0%';
    return `${Math.round((wins / total) * 100)}%`;
  };

  const calcularPromedio = (valor, total) => {
    if (!total || total === 0) return '0.00';
    return (valor / total).toFixed(2);
  };

  return (
    <MotionConfig reducedMotion={motionEnabled ? 'never' : 'always'}>
      <main className="rank-page" data-motion={motionEnabled ? 'on' : 'off'}>
        <div className="rank-shell">
          <motion.header
            className="rank-hero"
            initial={motionEnabled ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .4 }}
          >
            <div className="rank-intro">
              <p className="rank-eyebrow"><Trophy size={17} aria-hidden="true" /> Clasificación oficial · Temporada 6</p>
              <h1>RANKING <span>THC.</span></h1>
              <p className="rank-description">Cada partido deja su huella. Descubre quién marca la diferencia en la cancha.</p>
            </div>
            <div className="rank-search-card">
              <div className="rank-search-heading"><img src={logoTHC} alt="" /><span>Encuentra a tu jugador.</span></div>
              <label htmlFor="rank-search">Busca por nombre y consulta sus estadísticas.</label>
              <div className="rank-search-input">
                <Search size={20} aria-hidden="true" />
                <input
                  id="rank-search"
                  type="search"
                  placeholder="Nombre del jugador"
                  value={busqueda}
                  aria-label="Buscar jugador"
                  onChange={event => cambiarBusqueda(event.target.value)}
                />
                {busqueda && <button type="button" aria-label="Limpiar búsqueda" onClick={() => cambiarBusqueda('')}><X size={18} /></button>}
              </div>
              <p>Elige un nombre del podio o de la tabla para ver sus números.</p>
            </div>
          </motion.header>

          {errorCarga && <div role="alert" className="rank-error"><span>No se pudo conectar con el ranking.</span><button type="button" onClick={() => setRecarga(prev => prev + 1)}>Reintentar</button></div>}
          <AnimatePresence initial={false}>
            {jugadorSeleccionado && (
              <motion.section
                key={jugadorSeleccionado.id}
                className="rank-player-detail"
                initial={motionEnabled ? { opacity: 0, y: -10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={motionEnabled ? { opacity: 0, y: -8 } : { opacity: 0 }}
                transition={{ duration: .22 }}
                aria-labelledby="rank-player-name"
              >
                <button type="button" aria-label="Cerrar estadísticas" onClick={() => seleccionarJugador(null)} className="rank-detail-close"><X size={20} /></button>
                <div className="rank-player-heading">
                  <p className="rank-eyebrow"><Activity size={16} aria-hidden="true" /> Estadísticas avanzadas</p>
                  <h2 id="rank-player-name">{jugadorSeleccionado.nombre}</h2>
                </div>
                <div className="rank-player-metrics">
                  <div><span>Ratio de victorias</span><strong>{calcularWinrate(jugadorSeleccionado.victorias, jugadorSeleccionado.partidos_jugados)}</strong></div>
                  <div><span>Goles + asistencias</span><strong className="rank-orange">{(jugadorSeleccionado.goles || 0) + (jugadorSeleccionado.asistencias || 0)} <small>totales</small></strong></div>
                  <div><span>Goles por partido</span><strong>{calcularPromedio(jugadorSeleccionado.goles, jugadorSeleccionado.partidos_jugados)}</strong></div>
                  <div className="rank-mvp-metric"><span>Galardones MVP</span><strong>{jugadorSeleccionado.mvps || 0}</strong><Award size={32} aria-hidden="true" /></div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <section className="rank-board" aria-labelledby="rank-board-heading">
            <div className="rank-board-heading">
              <div><p className="rank-eyebrow">La cancha habla</p><h2 id="rank-board-heading">Los números <span>del juego.</span></h2></div>
              <span className="rank-top-label"><BarChart3 size={17} aria-hidden="true" /> Top 50</span>
            </div>
            <div className="rank-tabs" aria-label="Clasificar por">
              {[
                { id: 'puntos', label: 'Puntos THC' },
                { id: 'goles', label: 'Goleadores' },
                { id: 'asistencias', label: 'Asistencias' },
                { id: 'victorias', label: 'Ganados' },
                { id: 'vallas_invictas', label: 'Vallas Invictas' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTabActiva(tab.id)}
                  aria-pressed={tabActiva === tab.id}
                  className={`rank-tab ${tabActiva === tab.id ? 'is-active' : ''}`}
                >
                  {tab.label}
                  {tabActiva === tab.id && <motion.span layoutId="rank-tab-line" className="rank-tab-line" transition={{ duration: motionEnabled ? .22 : 0 }} />}
                </button>
              ))}
            </div>

            {cargando ? (
              <div className="rank-loading" role="status"><span className="rank-spinner" aria-hidden="true" /><p>Cargando clasificación…</p></div>
            ) : (
              <>
                {mostrarPodio && (
                  <motion.div
                    className="rank-podium"
                    initial={motionEnabled ? { opacity: 0, y: 12 } : false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: .15 }}
                    transition={{ duration: .35 }}
                  >
                    {[[top3[1], 2], [top3[0], 1], [top3[2], 3]].map(([jugador, puesto]) => (
                      <button
                        key={jugador.id}
                        type="button"
                        onClick={() => seleccionarJugador(jugador)}
                        aria-label={`Ver estadísticas de ${jugador.nombre}, puesto ${puesto}`}
                        aria-pressed={seleccionadoId === jugador.id}
                        className={`rank-podium-card rank-podium-card--${puesto} ${seleccionadoId === jugador.id ? 'is-selected' : ''}`}
                      >
                        <span className="rank-podium-top"><span>{puesto === 1 ? 'Líder de la cancha' : 'En el podio'}</span><ArrowUpRight size={22} aria-hidden="true" /></span>
                        <span className="rank-place">0{puesto}<Trophy size={puesto === 1 ? 36 : 26} aria-hidden="true" /></span>
                        <span className="rank-podium-name" title={jugador.nombre}>{jugador.nombre}</span>
                        <span className="rank-podium-score"><strong>{jugador[tabActiva]}</strong><span>{tabActiva.replace('_', ' ')}</span></span>
                        <span className="rank-podium-hint">Ver estadísticas <ArrowUpRight size={15} aria-hidden="true" /></span>
                      </button>
                    ))}
                  </motion.div>
                )}

                <motion.div
                  className="rank-table-card"
                  initial={motionEnabled ? { opacity: 0, y: 10 } : false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: .1 }}
                  transition={{ duration: .3 }}
                >
                  <div className="rank-table-heading"><h3>{busqueda.trim() ? 'Resultados de tu búsqueda' : 'La clasificación'}</h3><span>{jugadoresFiltrados.length} jugadores</span></div>
                  <p className="rank-table-tip"><MoveHorizontal size={17} aria-hidden="true" /> Desliza la tabla para ver todas las estadísticas.</p>
                  <div className="rank-table-scroll" tabIndex={0} role="region" aria-label="Tabla de clasificación, desplazable horizontalmente">
                    <table className="rank-table">
                      <caption className="rank-visually-hidden">Clasificación THC ordenada por {tabActiva.replace('_', ' ')}. Selecciona un jugador para ver sus estadísticas avanzadas.</caption>
                      <thead>
                        <tr>
                          <th scope="col">POS</th>
                          <th scope="col">JUGADOR</th>
                          <th scope="col" className="rank-points">PUNTOS</th>
                          <th scope="col">GOLES</th>
                          <th scope="col">ASIST.</th>
                          <th scope="col">GANADOS</th>
                          <th scope="col">PERDIDOS</th>
                          <th scope="col">PARTIDOS</th>
                          <th scope="col">EN CONTRA</th>
                          <th scope="col">VALLA INVICTA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restoTabla.length === 0 ? (
                          <tr><td colSpan="10" className="rank-empty">No se encontraron registros.</td></tr>
                        ) : (
                          restoTabla.map((jugador, index) => {
                            const posReal = mostrarPodio ? index + 4 : index + 1;

                            return (
                              <tr
                                key={jugador.id} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); seleccionarJugador(jugador); } }}
                                onClick={() => seleccionarJugador(jugador)}
                                className={seleccionadoId === jugador.id ? 'is-selected' : ''}
                                aria-label={`Puesto ${posReal}, ${jugador.nombre}, ver estadísticas`}
                              >
                                <td className="rank-row-position">{posReal}</td>
                                <td className="rank-row-name"><span title={jugador.nombre}>{jugador.nombre}</span><ArrowUpRight size={15} aria-hidden="true" /></td>
                                <td className="rank-points">{jugador.puntos}</td>
                                <td>{jugador.goles}</td>
                                <td>{jugador.asistencias}</td>
                                <td className="rank-wins">{jugador.victorias}</td>
                                <td className="rank-losses">{jugador.derrotas || 0}</td>
                                <td className="rank-games">{jugador.partidos_jugados}</td>
                                <td className="rank-losses">{jugador.goles_contra}</td>
                                <td className="rank-wins">{jugador.vallas_invictas}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="rank-table-footer"><span>El ranking se actualiza con la actividad de la cancha.</span><span><span className="rank-live-dot" aria-hidden="true" /> THC en juego</span></div>
                </motion.div>
              </>
            )}
          </section>
        </div>
      </main>
    </MotionConfig>
  );
}
