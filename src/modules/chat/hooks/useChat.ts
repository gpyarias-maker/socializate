import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../core/config/supabase';

export interface MensajeChat {
  id: number;
  contenido: string;
  tipo_mensaje: 'texto' | 'ubicacion_temporal' | 'link_juego';
  metadata?: {
    lat?: number;
    lng?: number;
    juego?: string;
    url_lobby?: string;
  };
  remitente_id: string;
  nombre_remitente: string;
  comunidad_id: number;
  enviado_en: string;
}

export const useChat = (comunidadId: number) => {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [enviando, setEnviando] = useState<boolean>(false);

  const cargarMensajes = useCallback(async () => {
    if (!comunidadId || Number.isNaN(Number(comunidadId))) {
      setMensajes([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .eq('comunidad_id', comunidadId)
      .order('enviado_en', { ascending: true });

    if (!error && data) {
      setMensajes(data as MensajeChat[]);
    }
    setCargando(false);
  }, [comunidadId]);

  useEffect(() => {
    let activo = true;

    // 1. Limpiar de inmediato los mensajes del grupo anterior
    setMensajes([]);

    if (!comunidadId || Number.isNaN(Number(comunidadId))) {
      setCargando(false);
      return;
    }

    setCargando(true);
    supabase
      .from('mensajes')
      .select('*')
      .eq('comunidad_id', comunidadId)
      .order('enviado_en', { ascending: true })
      .then(({ data, error }) => {
        if (!activo) return;
        if (!error && data) {
          setMensajes(data as MensajeChat[]);
        }
        setCargando(false);
      });

    // 2. Canal Realtime aislado exclusivamente para esta comunidadId
    const nombreCanal = `chat-grupo-${comunidadId}-${Math.random().toString(36).slice(2, 7)}`;
    const canal = supabase
      .channel(nombreCanal)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `comunidad_id=eq.${comunidadId}`,
        },
        (payload) => {
          if (!activo) return;
          const nuevo = payload.new as MensajeChat;

          // Doble validación: descartar si pertenece a otro grupo social
          if (Number(nuevo.comunidad_id) !== Number(comunidadId)) return;

          // Evitar duplicados en pantalla
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'mensajes',
        },
        (payload) => {
          if (!activo) return;
          const eliminado = payload.old as Partial<MensajeChat>;
          if (eliminado?.id) {
            setMensajes((prev) => prev.filter((m) => m.id !== eliminado.id));
          }
        }
      )
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(canal);
    };
  }, [comunidadId]);

  const enviarMensaje = async (params: {
    contenido: string;
    tipo_mensaje?: 'texto' | 'ubicacion_temporal' | 'link_juego';
    metadata?: MensajeChat['metadata'];
    remitente_id: string;
    nombre_remitente: string;
  }) => {
    const textoLimpio = params.contenido.trim();
    if (!textoLimpio || !comunidadId || enviando) return { error: null };

    setEnviando(true);
    const { data, error } = await supabase
      .from('mensajes')
      .insert({
        contenido: textoLimpio,
        tipo_mensaje: params.tipo_mensaje ?? 'texto',
        metadata: params.metadata ?? null,
        remitente_id: params.remitente_id,
        nombre_remitente: params.nombre_remitente,
        comunidad_id: comunidadId,
      })
      .select()
      .single();

    if (!error && data) {
      const insertado = data as MensajeChat;
      setMensajes((prev) => {
        if (prev.some((m) => m.id === insertado.id)) return prev;
        return [...prev, insertado];
      });
    }

    setEnviando(false);
    return { data, error };
  };

  return {
    mensajes,
    cargando,
    enviando,
    recargar: cargarMensajes,
    enviarMensaje,
  };
};