import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { clubLogoSource, ownClubLogoPath } from './clubIdentityUT';

function ClubLogoImage({ source, userId, className, alternative, fallback }) {
  const [image, setImage] = useState(source);
  const [failed, setFailed] = useState(!source);
  const attempted = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const recover = async () => {
    setFailed(true);
    if (attempted.current) return;
    attempted.current = true;
    const path = ownClubLogoPath(source, supabase.supabaseUrl, userId);
    if (!path) return;
    try {
      const { data, error } = await supabase.storage.from('logos_clubes').createSignedUrl(path, 3600);
      const signed = clubLogoSource(data?.signedUrl);
      if (!mounted.current || error || !signed) return;
      setImage(signed);
      setFailed(false);
    } catch {
      return;
    }
  };

  return failed
    ? <span className={className} aria-label={alternative}>{fallback}</span>
    : <img className={className} src={image} alt={alternative} onError={recover} />;
}

export default function ClubIdentityLogoUT({ club, userId = club?.user_id, className = '', fallback = 'UT' }) {
  const source = clubLogoSource(club?.logo_url);
  const alternative = club?.nombre ? `Escudo de ${club.nombre}` : 'Escudo del club';
  return <ClubLogoImage key={`${userId || ''}:${source || ''}`} source={source} userId={userId} className={className} alternative={alternative} fallback={club?.abreviatura || fallback} />;
}
