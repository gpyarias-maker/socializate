import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../core/config/supabase';

export interface EventoQuito {
  id: number;
  titulo: string;
  descripcion: string;
  nombre_lugar: string;
  latitud: number;
  longitud: number;
  enlace_externo?: string;
  comunidad_id?: number;
  comunidad_nombre: string;
  total_asistentes: number;
}

export interface DatosFormularioEvento {
  titulo: string;
  descripcion: string;
  nombre_lugar: string;
  latitud: number;
  longitud: number;
  enlace_externo?: string;
  comunidad_id?: number;
}

export const useEventos = () => {
  const [eventos, setEventos] = useState<EventoQuito[]>([]);
  const [seleccionado, setSeleccionado] = useState<EventoQuito | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargarEventos = useCallback(async (mantenerSeleccion = true) => {
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
          comunidad_id,
          comunidades ( nombre ),
          asistentes_evento ( count )
        `)
        .order('fecha_hora_inicio', { ascending: true });

      if (error) throw error;

      const lista: EventoQuito[] = (data || []).map((e: any) => ({
        id: e.id,
        titulo: e.titulo,
        descripcion: e.descripcion || '',
        nombre_lugar: e.nombre_lugar || 'Quito',
        latitud: Number(e.latitud),
        longitud: Number(e.longitud),
        enlace_externo: e.enlace_externo || undefined,
        comunidad_id: e.comunidad_id ?? 1,
        comunidad_nombre: e.comunidades?.nombre || 'Evento UIO',
        total_asistentes: e.asistentes_evento?.[0]?.count || 1,
      }));

      setEventos(lista);

      setSeleccionado((prev) => {
        if (!mantenerSeleccion) return null;
        if (prev) {
          const actualizado = lista.find((item) => item.id === prev.id);
          return actualizado || null;
        }
        return lista.length > 0 ? lista[0] : null;
      });
    } catch (e) {
      console.error('Error cargando eventos:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  const confirmarAsistencia = async (eventoId: number) => {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      await supabase.from('asistentes_evento').upsert({
        evento_id: eventoId,
        usuario_id: authData.user.id,
        estado: 'confirmado',
      });
      await cargarEventos(true);
    }
  };

  const crearEvento = async (datos: DatosFormularioEvento) => {
    setGuardando(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const payload: any = {
        titulo: datos.titulo.trim(),
        descripcion: datos.descripcion.trim(),
        nombre_lugar: datos.nombre_lugar.trim() || 'Quito',
        latitud: datos.latitud,
        longitud: datos.longitud,
        enlace_externo: datos.enlace_externo?.trim() || null,
        comunidad_id: datos.comunidad_id ?? 1,
        fecha_hora_inicio: new Date().toISOString(),
      };

      if (authData?.user?.id) {
        payload.creador_id = authData.user.id;
      }

      const { data, error } = await supabase
        .from('eventos')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;

      await cargarEventos(false);
      if (data?.id) {
        setEventos((prev) => {
          const creado = prev.find((ev) => ev.id === data.id) || null;
          setSeleccionado(creado);
          return prev;
        });
      }
      return { ok: true };
    } catch (e) {
      console.error('Error creando evento:', e);
      return { ok: false, error: e };
    } finally {
      setGuardando(false);
    }
  };

  const editarEvento = async (eventoId: number, datos: DatosFormularioEvento) => {
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('eventos')
        .update({
          titulo: datos.titulo.trim(),
          descripcion: datos.descripcion.trim(),
          nombre_lugar: datos.nombre_lugar.trim() || 'Quito',
          latitud: datos.latitud,
          longitud: datos.longitud,
          enlace_externo: datos.enlace_externo?.trim() || null,
        })
        .eq('id', eventoId);

      if (error) throw error;

      await cargarEventos(true);
      return { ok: true };
    } catch (e) {
      console.error('Error editando evento:', e);
      return { ok: false, error: e };
    } finally {
      setGuardando(false);
    }
  };

  const eliminarEvento = async (eventoId: number) => {
    setGuardando(true);
    try {
      await supabase.from('asistentes_evento').delete().eq('evento_id', eventoId);
      const { error } = await supabase.from('eventos').delete().eq('id', eventoId);
      if (error) throw error;

      setEventos((prev) => prev.filter((ev) => ev.id !== eventoId));
      setSeleccionado((prev) => (prev?.id === eventoId ? null : prev));
      return { ok: true };
    } catch (e) {
      console.error('Error eliminando evento:', e);
      return { ok: false, error: e };
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    cargarEventos(true);

    const canal = supabase
      .channel('eventos-mapa-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eventos' },
        () => {
          cargarEventos(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargarEventos]);

  return {
    eventos,
    seleccionado,
    setSeleccionado,
    cargando,
    guardando,
    confirmarAsistencia,
    crearEvento,
    editarEvento,
    eliminarEvento,
  };
};