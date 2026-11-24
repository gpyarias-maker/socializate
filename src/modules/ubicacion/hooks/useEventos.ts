import { useState, useEffect } from 'react';
import { supabase } from '../../../core/config/supabase';

export interface EventoQuito {
  id: number;
  titulo: string;
  descripcion: string;
  nombre_lugar: string;
  latitud: number;
  longitud: number;
  enlace_externo?: string;
  comunidad_nombre: string;
  total_asistentes: number;
}

export const useEventos = () => {
  const [eventos, setEventos] = useState<EventoQuito[]>([]);
  const [seleccionado, setSeleccionado] = useState<EventoQuito | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarEventos = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('eventos')
        .select(`
          id,
          titulo,
          descripcion,
          nombre_lugar,
          latitud,
          longitud,
          enlace_externo,
          comunidades ( nombre ),
          asistentes_evento ( count )
        `)
        .order('fecha_hora_inicio', { ascending: true });

      if (error) throw error;

      const lista: EventoQuito[] = (data || []).map((e: any) => ({
        id: e.id,
        titulo: e.titulo,
        descripcion: e.descripcion,
        nombre_lugar: e.nombre_lugar,
        latitud: Number(e.latitud),
        longitud: Number(e.longitud),
        enlace_externo: e.enlace_externo,
        comunidad_nombre: e.comunidades?.nombre || 'Evento UIO',
        total_asistentes: e.asistentes_evento?.[0]?.count || 1,
      }));

      setEventos(lista);
      if (lista.length > 0 && !seleccionado) {
        setSeleccionado(lista[0]);
      }
    } catch (e) {
      console.error('Error cargando eventos:', e);
    } finally {
      setCargando(false);
    }
  };

  const confirmarAsistencia = async (eventoId: number) => {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      await supabase.from('asistentes_evento').upsert({
        evento_id: eventoId,
        usuario_id: authData.user.id,
        estado: 'confirmado',
      });
      await cargarEventos();
    }
  };

  useEffect(() => {
    cargarEventos();
  }, []);

  return { eventos, seleccionado, setSeleccionado, cargando, confirmarAsistencia };
};