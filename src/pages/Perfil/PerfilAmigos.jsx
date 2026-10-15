import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronDown, UserPlus, Users, X } from 'lucide-react';
import { profileFriendPath } from '../../utils/profileFriends';
import { profileImageUrl } from '../../utils/profileSettings';
import { useProfileFriends, useProfileFriendship } from './useProfileFriendship';
import './PerfilAmigos.css';

const FALLBACK = '/imagenes/LogoTHC.png';

function Avatar({ person }) {
  return <img src={profileImageUrl(person.avatar_url) || FALLBACK} alt="" loading="lazy" onError={event => { if (event.currentTarget.dataset.fallback) return; event.currentTarget.dataset.fallback = 'true'; event.currentTarget.src = FALLBACK; }} />;
}

export function ProfileFriendButton({ profileId, actorId, isOwnProfile = false, onRelationshipChange, compact = false }) {
  const friendship = useProfileFriendship({ profileId, actorId, isOwnProfile, onRelationshipChange });
  const [options, setOptions] = useState(false);
  if (friendship.state === 'self') return null;
  const disabled = Boolean(friendship.pending || friendship.loading || friendship.state === 'signed-out');
  const act = async action => { const confirmed = await friendship.act(action); if (confirmed) setOptions(false); };
  return (
    <div className={`profile-friend-control${compact ? ' profile-friend-control--compact' : ''}`} aria-busy={Boolean(friendship.pending || friendship.loading)}>
      {friendship.loading && !friendship.state ? <button type="button" className="theme-btn-secondary" disabled>Cargando…</button> : friendship.state === 'received' ? <div className="profile-friend-received"><span>Solicitud recibida</span><div><button type="button" className="theme-btn-primary" disabled={disabled} onClick={() => act('aceptar')}>{friendship.pending === 'aceptar' ? 'Aceptando…' : 'Aceptar'}</button><button type="button" className="theme-btn-secondary" disabled={disabled} onClick={() => act('rechazar')}>{friendship.pending === 'rechazar' ? 'Rechazando…' : 'Rechazar'}</button></div></div> : friendship.state === 'sent' ? <button type="button" className="theme-btn-secondary" disabled={disabled} onClick={() => act('cancelar')} title="Cancelar solicitud enviada"><Check size={16} aria-hidden="true" />{friendship.pending ? 'Cancelando…' : 'Solicitud enviada'}<X size={14} aria-hidden="true" /></button> : friendship.state === 'friends' ? <div className="profile-friend-options"><button type="button" className="theme-btn-secondary" disabled={disabled} onClick={() => setOptions(value => !value)} aria-expanded={options}><Check size={16} aria-hidden="true" /> Amigos <ChevronDown size={14} aria-hidden="true" /></button>{options && <button type="button" className="profile-friend-remove" disabled={disabled} onClick={() => act('eliminar')}>{friendship.pending ? 'Eliminando…' : 'Eliminar amistad'}</button>}</div> : <button type="button" className="theme-btn-secondary" disabled={disabled || Boolean(friendship.error && !friendship.state)} onClick={() => act('enviar')}><UserPlus size={17} aria-hidden="true" />{friendship.pending ? 'Enviando…' : 'Añadir amigo'}</button>}
      {friendship.error && <div className="profile-friends-error" role="alert"><span>{friendship.error}</span><button type="button" onClick={() => { setOptions(false); void friendship.refresh(); }} disabled={Boolean(friendship.pending)}>Reintentar</button></div>}
    </div>
  );
}

function FriendsDialog({ lists, actorId, isOwnProfile, initialTab = 'amigos', themeSource, loading, error, onRefresh, onClose }) {
  const [tab, setTab] = useState(isOwnProfile ? initialTab : 'amigos');
  const [search, setSearch] = useState('');
  const dialog = useRef(null);
  const tabs = isOwnProfile ? [['amigos', 'Amigos'], ['recibidas', 'Recibidas'], ['enviadas', 'Enviadas']] : [['amigos', 'Amigos']];
  const rows = lists?.[tab] || [];
  const filtered = rows.filter(person => `${person.nombre} ${person.discord_nombre || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()));

  useEffect(() => {
    const previousFocus = document.activeElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const elements = [...(dialog.current?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])') || [])];
      if (!elements.length) return;
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && (document.activeElement === first || !dialog.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = bodyOverflow; document.removeEventListener('keydown', keydown); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [onClose]);

  return createPortal(
    <div className="profile-friends-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialog} className="profile-friends-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-friends-title" style={themeSource}>
        <header><h2 id="profile-friends-title">Amigos</h2><button type="button" className="profile-friends-close" onClick={onClose} aria-label="Cerrar amigos"><X size={22} /></button></header>
        <nav className="profile-friends-tabs" aria-label="Lista de amigos">{tabs.map(([id, title]) => <button type="button" key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setSearch(''); }}>{title}<span>{lists?.[id]?.length ?? '—'}</span></button>)}</nav>
        {rows.length > 6 && <input className="profile-friends-search" aria-label="Buscar amigos" type="search" placeholder="Buscar" value={search} onChange={event => setSearch(event.target.value)} />}
        {error && <div className="profile-friends-error" role="alert"><span>{error}</span><button type="button" onClick={onRefresh} disabled={loading}>Reintentar</button></div>}
        <div className="profile-friends-list" aria-busy={loading}>
          {loading && !lists ? <p className="profile-friends-empty">Cargando…</p> : filtered.length ? filtered.map(person => <div className="profile-friends-row" key={person.id}><Link to={profileFriendPath(person.id)} onClick={onClose}><Avatar person={person} /><span><strong>{person.nombre}</strong>{person.apodo && person.discord_nombre && <small>{person.discord_nombre}</small>}</span><ArrowUpRight size={17} aria-hidden="true" /></Link>{isOwnProfile && tab !== 'amigos' && <ProfileFriendButton profileId={person.id} actorId={actorId} compact />}</div>) : !error && <p className="profile-friends-empty">{search ? 'No hay coincidencias.' : tab === 'amigos' ? 'Todavía no hay amigos.' : tab === 'recibidas' ? 'Sin solicitudes recibidas.' : 'Sin solicitudes enviadas.'}</p>}
        </div>
      </section>
    </div>, document.body,
  );
}

export default function PerfilAmigos({ profileId, actorId, isOwnProfile = false }) {
  const friends = useProfileFriends({ profileId, actorId });
  const [dialog, setDialog] = useState(null);
  const container = useRef(null);
  const own = Boolean(isOwnProfile && profileId === actorId);
  const people = friends.data?.amigos || [];
  const pending = own ? (friends.data?.recibidas?.length || 0) + (friends.data?.enviadas?.length || 0) : 0;
  const close = useCallback(() => setDialog(null), []);
  const open = (initialTab = 'amigos') => {
    const style = window.getComputedStyle(container.current);
    const variables = { ...Object.fromEntries(['--profile-bg', '--profile-panel', '--profile-line', '--profile-text', '--profile-muted', '--profile-radius', '--accent'].map(name => [name, style.getPropertyValue(name)])), fontFamily: style.fontFamily };
    setDialog({ profileId, actorId, variables, initialTab });
    void friends.refresh();
  };
  const visibleDialog = dialog?.profileId === profileId && dialog?.actorId === actorId;
  return (
    <section ref={container} className="theme-panel profile-friends" aria-label="Amigos" aria-busy={friends.loading}>
      <header><h2><Users size={18} aria-hidden="true" /> Amigos {friends.data && <span>{people.length}</span>}</h2><button type="button" className="profile-friends-view" onClick={() => open()}>Ver todos <ArrowUpRight size={16} aria-hidden="true" /></button></header>
      {friends.error && <div className="profile-friends-error" role="alert"><span>{friends.error}</span><button type="button" onClick={friends.refresh} disabled={friends.loading}>Reintentar</button></div>}
      {people.length ? <div className="profile-friends-preview">{people.slice(0, 6).map(person => <Link key={person.id} to={profileFriendPath(person.id)} title={person.nombre}><Avatar person={person} /><span>{person.nombre}</span></Link>)}</div> : !friends.error && <p className="profile-friends-empty">{friends.loading ? 'Cargando…' : 'Todavía no hay amigos.'}</p>}
      {pending > 0 && <button type="button" className="profile-friends-pending" onClick={() => open(friends.data.recibidas.length ? 'recibidas' : 'enviadas')}>{friends.data.recibidas.length > 0 ? `${friends.data.recibidas.length} ${friends.data.recibidas.length === 1 ? 'solicitud recibida' : 'solicitudes recibidas'}` : `${friends.data.enviadas.length} ${friends.data.enviadas.length === 1 ? 'solicitud enviada' : 'solicitudes enviadas'}`}<ArrowUpRight size={16} aria-hidden="true" /></button>}
      {visibleDialog && <FriendsDialog lists={friends.data} actorId={actorId} isOwnProfile={own} initialTab={dialog.initialTab} themeSource={dialog.variables} loading={friends.loading} error={friends.error} onRefresh={friends.refresh} onClose={close} />}
    </section>
  );
}
