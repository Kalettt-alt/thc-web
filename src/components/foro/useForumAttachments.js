import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { validateForumFiles } from '../../utils/forumMedia.js';

export default function useForumAttachments() {
  const [attachments, setAttachments] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const current = useRef([]);
  const mounted = useRef(true);
  const selectingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      current.current.forEach(item => URL.revokeObjectURL(item.preview));
      current.current = [];
    };
  }, []);

  const addFiles = useCallback(async files => {
    if (selectingRef.current) return;
    selectingRef.current = true;
    setSelecting(true);
    try {
      const valid = await validateForumFiles(files, current.current.length);
      if (!mounted.current) return;
      const next = valid.map(file => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }));
      current.current = [...current.current, ...next];
      setAttachments(current.current);
    } catch (error) {
      if (mounted.current) toast.error(error.message || 'No se pudo adjuntar la imagen.');
    } finally {
      selectingRef.current = false;
      if (mounted.current) setSelecting(false);
    }
  }, []);

  const remove = useCallback(id => {
    const item = current.current.find(attachment => attachment.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    current.current = current.current.filter(attachment => attachment.id !== id);
    setAttachments(current.current);
  }, []);

  const reset = useCallback(() => {
    current.current.forEach(item => URL.revokeObjectURL(item.preview));
    current.current = [];
    setAttachments([]);
  }, []);

  return { attachments, selecting, addFiles, remove, reset };
}
