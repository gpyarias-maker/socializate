import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { supabase } from '../../../core/config/supabase';

export interface PerfilUsuario {
  id: string;
  nombre_usuario: string;
  email: string;
  sector_quito: string;
}

export const useAuth = () => {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);

  const cargarPerfil = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (data) setPerfil(data);
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  const iniciarSesion = async (email: string, password: string) => {
    try {
      setCargando(true);
      setError(null);
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) throw loginError;
      router.replace('/(tabs)/comunidades' as any);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setCargando(false);
    }
  };

  const registrar = async (nombre_usuario: string, email: string, password: string, sector_quito: string) => {
    try {
      setCargando(true);
      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;

      if (data.user) {
        const { error: perfilError } = await supabase.from('perfiles').insert({
          id: data.user.id,
          nombre_usuario: nombre_usuario.trim(),
          email: email.trim(),
          sector_quito: sector_quito.trim() || 'Norte',
        });
        if (perfilError) throw perfilError;
      }
      router.replace('/(tabs)/comunidades' as any);
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario');
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace('/' as any);
  };

  return { iniciarSesion, registrar, cerrarSesion, perfil, cargando, error };
};

