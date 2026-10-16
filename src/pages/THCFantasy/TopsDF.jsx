import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw, Trophy, Zap } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { confirmFantasyTops, fantasyTopsError, FANTASY_TOPS_PAGE_SIZE } from './fantasyTops';
import './TopsDF.css';

export default function TopsDF({ userId, rayos, isSaving }) {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: null, error: '', busy: true });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc('thc_fantasy_tops', { p_offset: page * FANTASY_TOPS_PAGE_SIZE, p_limite: FANTASY_TOPS_PAGE_SIZE }).abortSignal(controller.signal);
        if (error) throw error;
        const confirmed = confirmFantasyTops(data);
        if (active) setState({ data: confirmed, error: '', busy: false });
      } catch (error) {
        if (active) setState({ data: null, error: fantasyTopsError(error), busy: false });
      } finally { clearTimeout(timer); }
    };
    void load();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [page, attempt, userId, rayos, isSaving]);

  const changePage = value => { setState({ data: null, error: '', busy: true }); setPage(value); };
  const retry = () => { setState({ data: null, error: '', busy: true }); setAttempt(value => value + 1); };
  const { data, error, busy } = state;
  return <section className="df-tops" aria-labelledby="df-tops-title">
    <header className="df-tops-heading"><div><span><Trophy size={15} />Clasificación global</span><h2 id="df-tops-title">TOPS<i>.</i></h2></div><button type="button" onClick={retry} disabled={busy || !userId} aria-label="Actualizar TOPS"><RefreshCw size={17} /></button></header>
    <div className="df-tops-overview"><div className="df-tops-personal"><Zap size={29} /><div><small>Tus rayos</small><strong>{data?.yo?.rayos ?? rayos ?? '—'}</strong></div><span>{data?.yo ? `#${data.yo.posicion} global` : 'Tu próxima victoria cuenta'}</span></div><div className="df-tops-rules"><span><b>+2</b> Victoria</span><span><b>+1</b> Empate</span><span><b>−1</b> Derrota</span></div></div>
    <p className="df-tops-caption">La misma puntuación para todos. Tus rayos se conservan al cambiar de club.</p>
    {!userId ? <div className="df-tops-state">Inicia sesión para competir y consultar TOPS.</div> : busy ? <div className="df-tops-state" role="status">Cargando la clasificación…</div> : error ? <div className="df-tops-state" role="alert"><p>{error}</p><button type="button" onClick={retry}>Reintentar</button></div> : <>
      {data?.jugadores.length ? <div className="df-tops-table-wrap"><table className="df-tops-table"><caption>{data.total} mánagers de DT Fantasy</caption><thead><tr><th scope="col">Puesto</th><th scope="col">Mánager</th><th scope="col">PJ</th><th scope="col">V / E / D</th><th scope="col">Rayos</th></tr></thead><tbody>{data.jugadores.map(person => <tr key={person.posicion} data-own={person.soy_yo || undefined}><td>{String(person.posicion).padStart(2, '0')}</td><th scope="row">{person.perfil_id ? <Link to={`/perfil/${person.perfil_id}`}><img src={person.avatar_url || '/imagenes/LogoTHC.png'} alt="" loading="lazy" /><span>{person.nombre}{person.soy_yo && <small>Tú</small>}</span></Link> : <span className="df-tops-private">{person.nombre}</span>}</th><td>{person.victorias + person.empates + person.derrotas}</td><td>{person.victorias}<em> / </em>{person.empates}<em> / </em>{person.derrotas}</td><td><Zap size={15} />{person.rayos}</td></tr>)}</tbody></table></div> : <div className="df-tops-state">La clasificación está esperando a sus primeros mánagers.</div>}
      <footer className="df-tops-pages"><button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}><ArrowLeft size={15} />Anterior</button><span>{data?.total || 0} mánagers · Página {page + 1}</span><button type="button" disabled={(page + 1) * FANTASY_TOPS_PAGE_SIZE >= (data?.total || 0)} onClick={() => changePage(page + 1)}>Siguiente<ArrowRight size={15} /></button></footer>
    </>}
  </section>;
}
