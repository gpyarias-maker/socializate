import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '../../../core/config/supabase';

export interface Comunidad {
  id: number;
  nombre: string;
  descripcion: string;
  interes_nombre: string;
  total_miembros: number;
}

export const useComunidades = () => {
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarComunidades = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('comunidades')
        .select(`
          id,
          nombre,
          descripcion,
          intereses ( nombre ),
          miembros_comunidad ( count )
        `)
        .order('creado_en', { ascending: false });

      if (error) throw error;

      const formateadas: Comunidad[] = (data || []).map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        interes_nombre: c.intereses?.nombre || 'Hobby Quito',
        total_miembros: c.miembros_comunidad?.[0]?.count || 1,
      }));

      setComunidades(formateadas);
    } catch (e) {
      console.error('Error al cargar comunidades:', e);
    } finally {
      setCargando(false);
    }
  };

  const unirseYChatear = async (comunidad: Comunidad) => {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      await supabase.from('miembros_comunidad').upsert({
        usuario_id: authData.user.id,
        comunidad_id: comunidad.id,
        rol: 'miembro',
      });
    }
    await cargarComunidades();
    router.push({
      pathname: '/(tabs)/chat' as any,
      params: { comunidadId: comunidad.id, nombreComunidad: comunidad.nombre },
    });
  };

  useEffect(() => {
    cargarComunidades();
  }, []);

  return { comunidades, cargando, recargar: cargarComunidades, unirseYChatear };
};
