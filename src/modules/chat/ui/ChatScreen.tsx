import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../../core/config/supabase';

interface SalaComunidad {
  id: string;
  dbId: number;
  nombre: string;
}

interface MensajeItem {
  id: string;
  comunidadId: string;
  autor: string;
  texto: string;
  hora: string;
  editado?: boolean;
}

const SALAS_QUITO: SalaComunidad[] = [
  { id: 'general', dbId: 1, nombre: '🌐 General Quito' },
  { id: 'gaming', dbId: 2, nombre: '🎮 Gaming & LAN' },
  { id: 'musica', dbId: 3, nombre: '🎸 Bandas & Música' },
  { id: 'deportes', dbId: 4, nombre: '🏃 Deportes & Rodadas' },
];

const salaAString = (valor: any): string => {
  const txt = String(valor ?? '');
  const porDb = SALAS_QUITO.find((s) => String(s.dbId) === txt || s.id === txt);
  return porDb ? porDb.id : txt;
};

const salaADbId = (idSala: string): number => {
  const encontrada = SALAS_QUITO.find((s) => s.id === idSala);
  return encontrada ? encontrada.dbId : 1;
};

const MENSAJES_INICIALES_POR_SALA: Record<string, MensajeItem[]> = {
  general: [
    {
      id: 'g-1',
      comunidadId: 'general',
      autor: '@camila_uio',
      texto: '¡Hola gente! Bienvenidos a la sala general de Quito.',
      hora: '14:10',
    },
  ],
  gaming: [
    {
      id: 'gm-1',
      comunidadId: 'gaming',
      autor: '@diego_condado',
      texto: '¿Quién se arma unas partidas hoy en la tarde?',
      hora: '14:12',
    },
  ],
  musica: [
    {
      id: 'm-1',
      comunidadId: 'musica',
      autor: '@sofia_ronda',
      texto: 'Hoy hay buena música en vivo por La Ronda.',
      hora: '14:15',
    },
  ],
  deportes: [
    {
      id: 'd-1',
      comunidadId: 'deportes',
      autor: '@marco_carolina',
      texto: 'Salimos a trotar o rodar en grupo por La Carolina.',
      hora: '14:18',
    },
  ],
};

export const ChatScreen = () => {
  const [salaActiva, setSalaActiva] = useState<string>('general');
  const salaActivaRef = useRef<string>('general');

  const [mensajesPorSala, setMensajesPorSala] = useState<Record<string, MensajeItem[]>>(
    MENSAJES_INICIALES_POR_SALA
  );
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [mensajeEditando, setMensajeEditando] = useState<MensajeItem | null>(null);
  const [usuarioActual, setUsuarioActual] = useState('@invitado_uio');
  const [usuarioUuid, setUsuarioUuid] = useState<string | null>(null);

  useEffect(() => {
    salaActivaRef.current = salaActiva;
    setMensajeEditando(null);
    setNuevoMensaje('');
  }, [salaActiva]);

  const obtenerHora = () => {
    const ahora = new Date();
    return ahora.toTimeString().slice(0, 5);
  };

  const cargarUsuario = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) {
        setUsuarioUuid(user.id);
        const meta = user.user_metadata || {};
        const nick = meta.usuario || meta.nombre_usuario || user.email?.split('@')[0] || 'usuario';
        setUsuarioActual(`@${String(nick).replace(/^@+/, '')}`);
      }
    } catch {
      // Mantiene @invitado_uio si no hay sesión
    }
  };

  const cargarMensajesDeSala = useCallback(async (idSala: string) => {
    const dbComunidadId = salaADbId(idSala);
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('comunidad_id', dbComunidadId)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        const formateados: MensajeItem[] = data
          .filter((row: any) => salaAString(row.comunidad_id) === idSala)
          .map((row: any, index: number) => ({
            id: String(row.id ?? `${idSala}-${index + 1}`),
            comunidadId: idSala,
            autor: row.nombre_remitente || row.autor || '@usuario_uio',
            texto: row.contenido || row.texto || '',
            hora: row.enviado_en || row.created_at
              ? new Date(row.enviado_en || row.created_at).toTimeString().slice(0, 5)
              : obtenerHora(),
          }));

        if (formateados.length > 0) {
          setMensajesPorSala((prev) => {
            const base = MENSAJES_INICIALES_POR_SALA[idSala] || [];
            const combinados = [...base, ...formateados];
            const unicos = combinados.filter(
              (item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx
            );
            return {
              ...prev,
              [idSala]: unicos,
            };
          });
        }
      }
    } catch {
      // Mantiene los mensajes locales de la sala sin mezclar otras
    }
  }, []);

  useEffect(() => {
    cargarUsuario();
  }, []);

  useEffect(() => {
    cargarMensajesDeSala(salaActiva);
  }, [salaActiva, cargarMensajesDeSala]);

  useEffect(() => {
    const canal = supabase
      .channel('mensajes-aislados-por-sala')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes' },
        (payload: any) => {
          const nuevo = payload.new;
          if (!nuevo || nuevo.comunidad_id === undefined || nuevo.comunidad_id === null) return;

          const salaMsg = salaAString(nuevo.comunidad_id);
          const item: MensajeItem = {
            id: String(nuevo.id ?? Date.now()),
            comunidadId: salaMsg,
            autor: nuevo.nombre_remitente || nuevo.autor || '@usuario_uio',
            texto: nuevo.contenido || nuevo.texto || '',
            hora: nuevo.enviado_en || nuevo.created_at
              ? new Date(nuevo.enviado_en || nuevo.created_at).toTimeString().slice(0, 5)
              : obtenerHora(),
          };

          setMensajesPorSala((prev) => {
            const actualSala = prev[salaMsg] || [];
            if (actualSala.some((m) => m.id === item.id)) return prev;
            return {
              ...prev,
              [salaMsg]: [...actualSala, item],
            };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mensajes' },
        (payload: any) => {
          const act = payload.new;
          if (!act || act.comunidad_id === undefined || act.comunidad_id === null) return;

          const salaMsg = salaAString(act.comunidad_id);
          const idAct = String(act.id);
          const textoAct = act.contenido || act.texto || '';

          setMensajesPorSala((prev) => {
            const actualSala = prev[salaMsg] || [];
            return {
              ...prev,
              [salaMsg]: actualSala.map((m) =>
                m.id === idAct ? { ...m, texto: textoAct, editado: true } : m
              ),
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const iniciarEdicion = (item: MensajeItem) => {
    setMensajeEditando(item);
    setNuevoMensaje(item.texto);
  };

  const cancelarEdicion = () => {
    setMensajeEditando(null);
    setNuevoMensaje('');
  };

  const enviarMensaje = async () => {
    const textoLimpio = nuevoMensaje.trim();
    if (!textoLimpio) return;

    const salaDestino = salaActiva;

    if (mensajeEditando) {
      const idEditar = mensajeEditando.id;
      setMensajesPorSala((prev) => ({
        ...prev,
        [salaDestino]: (prev[salaDestino] || []).map((m) =>
          m.id === idEditar ? { ...m, texto: textoLimpio, editado: true } : m
        ),
      }));
      setMensajeEditando(null);
      setNuevoMensaje('');

      const idNumerico = Number(idEditar);
      if (!Number.isNaN(idNumerico)) {
        try {
          await supabase
            .from('mensajes')
            .update({ contenido: textoLimpio })
            .eq('id', idNumerico)
            .eq('comunidad_id', salaADbId(salaDestino));
        } catch {
          // Conserva la edición local
        }
      }
      return;
    }

    const mensajeLocal: MensajeItem = {
      id: `${salaDestino}-${Date.now()}`,
      comunidadId: salaDestino,
      autor: usuarioActual,
      texto: textoLimpio,
      hora: obtenerHora(),
    };

    setMensajesPorSala((prev) => ({
      ...prev,
      [salaDestino]: [...(prev[salaDestino] || []), mensajeLocal],
    }));
    setNuevoMensaje('');

    try {
      const { data } = await supabase
        .from('mensajes')
        .insert({
          comunidad_id: salaADbId(salaDestino),
          remitente_id: usuarioUuid ?? '00000000-0000-0000-0000-000000000000',
          nombre_remitente: usuarioActual,
          contenido: textoLimpio,
          tipo_mensaje: 'texto',
        })
        .select()
        .single();

      if (data?.id) {
        setMensajesPorSala((prev) => ({
          ...prev,
          [salaDestino]: (prev[salaDestino] || []).map((m) =>
            m.id === mensajeLocal.id ? { ...m, id: String(data.id) } : m
          ),
        }));
      }
    } catch {
      // Permanece únicamente en la sala donde se envió
    }
  };

  const mensajesVisibles = mensajesPorSala[salaActiva] || [];
  const salaActualObj = SALAS_QUITO.find((s) => s.id === salaActiva);

  return (
    <KeyboardAvoidingView
      style={styles.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>💬 {salaActualObj?.nombre || 'Chat'}</Text>
        <Text style={styles.subtitulo}>Conectado como {usuarioActual}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listaSalas}
        >
          {SALAS_QUITO.map((sala) => {
            const activa = sala.id === salaActiva;
            return (
              <TouchableOpacity
                key={sala.id}
                style={[styles.chipSala, activa && styles.chipSalaActiva]}
                onPress={() => setSalaActiva(sala.id)}
              >
                <Text style={[styles.textoChip, activa && styles.textoChipActiva]}>
                  {sala.nombre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={mensajesVisibles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vacio}>Aún no hay mensajes en esta comunidad. ¡Escribe el primero!</Text>
        }
        renderItem={({ item }) => {
          const esMio = item.autor === usuarioActual;
          return (
            <View style={[styles.burbuja, esMio ? styles.burbujaMia : styles.burbujaOtro]}>
              <View style={styles.filaSuperior}>
                <Text style={styles.autor}>{item.autor}</Text>
                <View style={styles.filaAccionesMensaje}>
                  {esMio && (
                    <TouchableOpacity
                      style={styles.btnEditarMsg}
                      onPress={() => iniciarEdicion(item)}
                    >
                      <Text style={styles.textoEditarMsg}>✏️ Editar</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.hora}>
                    {item.editado ? `(editado) ${item.hora}` : item.hora}
                  </Text>
                </View>
              </View>
              <Text style={styles.textoMensaje}>{item.texto}</Text>
            </View>
          );
        }}
      />

      {mensajeEditando && (
        <View style={styles.barraEdicion}>
          <Text style={styles.textoBarraEdicion} numberOfLines={1}>
            ✏️ Editando: "{mensajeEditando.texto}"
          </Text>
          <TouchableOpacity onPress={cancelarEdicion}>
            <Text style={styles.btnCancelarEdicion}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.barraEnvio}>
        <TextInput
          style={styles.input}
          placeholder={
            mensajeEditando
              ? 'Edita tu mensaje...'
              : `Escribir en ${salaActualObj?.nombre || 'comunidad'}...`
          }
          placeholderTextColor="#7E7E9A"
          value={nuevoMensaje}
          onChangeText={setNuevoMensaje}
        />
        <TouchableOpacity style={styles.botonEnviar} onPress={enviarMensaje}>
          <Text style={styles.textoBotonEnviar}>
            {mensajeEditando ? 'Guardar' : 'Enviar'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#0D0D15',
  },
  cabecera: {
    backgroundColor: '#1A1A2E',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A4A',
  },
  titulo: {
    color: '#00F0FF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitulo: {
    color: '#B8B8D1',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  listaSalas: {
    gap: 8,
    paddingVertical: 2,
  },
  chipSala: {
    backgroundColor: '#0D0D15',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  chipSalaActiva: {
    backgroundColor: '#00F0FF',
    borderColor: '#00F0FF',
  },
  textoChip: {
    color: '#B8B8D1',
    fontSize: 12,
    fontWeight: 'bold',
  },
  textoChipActiva: {
    color: '#0D0D15',
  },
  lista: {
    padding: 16,
    gap: 12,
  },
  vacio: {
    color: '#7E7E9A',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
  },
  burbuja: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  burbujaMia: {
    borderColor: '#00F0FF',
    backgroundColor: '#162436',
  },
  burbujaOtro: {
    borderColor: '#2A2A4A',
  },
  filaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  filaAccionesMensaje: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnEditarMsg: {
    backgroundColor: '#0D0D15',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  textoEditarMsg: {
    color: '#00F0FF',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  autor: {
    color: '#FF2A85',
    fontWeight: 'bold',
    fontSize: 12,
  },
  hora: {
    color: '#7E7E9A',
    fontSize: 11,
  },
  textoMensaje: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  barraEdicion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#162436',
    borderTopWidth: 1,
    borderTopColor: '#00F0FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  textoBarraEdicion: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  btnCancelarEdicion: {
    color: '#FF2A85',
    fontSize: 15,
    fontWeight: 'bold',
    paddingHorizontal: 6,
  },
  barraEnvio: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1A1A2E',
    borderTopWidth: 1,
    borderTopColor: '#2A2A4A',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#0D0D15',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  botonEnviar: {
    backgroundColor: '#00F0FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  textoBotonEnviar: {
    color: '#0D0D15',
    fontWeight: 'bold',
    fontSize: 14,
  },
});