import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PoiClickEvent, Region } from 'react-native-maps';
import { QUITO_INITIAL_REGION } from '../../../core/constants/quito.constants';
import { COLORS } from '../../../shared/theme/colors';
import { EventoQuito, useEventos } from '../hooks/useEventos';

export const MapaEventosScreen = () => {
  const {
    eventos,
    seleccionado,
    setSeleccionado,
    cargando,
    guardando,
    confirmarAsistencia,
    crearEvento,
    editarEvento,
    eliminarEvento,
  } = useEventos();

  const mapRef = useRef<MapView | null>(null);

  const [modoFormulario, setModoFormulario] = useState<'crear' | 'editar' | null>(null);
  const [eventoEditandoId, setEventoEditandoId] = useState<number | null>(null);
  const [tituloForm, setTituloForm] = useState('');
  const [lugarForm, setLugarForm] = useState('');
  const [descripcionForm, setDescripcionForm] = useState('');
  const [enlaceForm, setEnlaceForm] = useState('');
  const [centroMapa, setCentroMapa] = useState<{ latitude: number; longitude: number }>({
    latitude: QUITO_INITIAL_REGION.latitude,
    longitude: QUITO_INITIAL_REGION.longitude,
  });
  const [coordPin, setCoordPin] = useState<{ latitude: number; longitude: number }>({
    latitude: QUITO_INITIAL_REGION.latitude,
    longitude: QUITO_INITIAL_REGION.longitude,
  });

  const seleccionarEvento = (ev: EventoQuito) => {
    if (modoFormulario) return;
    setSeleccionado(ev);
    mapRef.current?.animateToRegion(
      {
        latitude: ev.latitud,
        longitude: ev.longitud,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      350
    );
  };

  const abrirCrearEvento = () => {
    setEventoEditandoId(null);
    setTituloForm('');
    setLugarForm('');
    setDescripcionForm('');
    setEnlaceForm('');
    setCoordPin({
      latitude: centroMapa.latitude,
      longitude: centroMapa.longitude,
    });
    setModoFormulario('crear');
  };

  const abrirEditarEvento = (ev: EventoQuito) => {
    setEventoEditandoId(ev.id);
    setTituloForm(ev.titulo);
    setLugarForm(ev.nombre_lugar);
    setDescripcionForm(ev.descripcion);
    setEnlaceForm(ev.enlace_externo || '');
    setCoordPin({
      latitude: ev.latitud,
      longitude: ev.longitud,
    });
    setModoFormulario('editar');
  };

  const cerrarFormulario = () => {
    setModoFormulario(null);
    setEventoEditandoId(null);
  };

  const fijarCoordenada = (coordinate: { latitude: number; longitude: number }) => {
    setCoordPin({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
  };

  const manejarToqueMapa = (e: any) => {
    const coord = e.nativeEvent?.coordinate;
    if (!coord) return;
    if (modoFormulario) {
      fijarCoordenada(coord);
    } else if (seleccionado) {
      setSeleccionado(null);
    }
  };

  const manejarToquePoi = (e: PoiClickEvent) => {
    const { coordinate, name } = e.nativeEvent;
    if (modoFormulario && coordinate) {
      fijarCoordenada(coordinate);
      if (!lugarForm.trim() && name) {
        setLugarForm(name.replace(/\n/g, ' '));
      }
    }
  };

  const manejarCambioRegion = (region: Region) => {
    setCentroMapa({
      latitude: region.latitude,
      longitude: region.longitude,
    });
  };

  const guardarFormulario = async () => {
    if (!tituloForm.trim()) {
      Alert.alert('Falta título', 'Escribe un nombre para el evento.');
      return;
    }

    const datos = {
      titulo: tituloForm,
      descripcion: descripcionForm,
      nombre_lugar: lugarForm || 'Quito',
      latitud: coordPin.latitude,
      longitud: coordPin.longitude,
      enlace_externo: enlaceForm,
    };

    if (modoFormulario === 'editar' && eventoEditandoId !== null) {
      const res = await editarEvento(eventoEditandoId, datos);
      if (res.ok) {
        cerrarFormulario();
      } else {
        Alert.alert('Error', 'No se pudo actualizar el evento.');
      }
    } else {
      const res = await crearEvento(datos);
      if (res.ok) {
        cerrarFormulario();
      } else {
        Alert.alert('Error', 'No se pudo crear el evento.');
      }
    }
  };

  const confirmarEliminar = (ev: EventoQuito) => {
    Alert.alert(
      'Eliminar evento',
      `¿Seguro que deseas eliminar "${ev.titulo}" del mapa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const res = await eliminarEvento(ev.id);
            if (!res.ok) {
              Alert.alert('Error', 'No se pudo eliminar el evento.');
            }
          },
        },
      ]
    );
  };

  if (cargando && eventos.length === 0) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <MapView
        ref={mapRef}
        style={styles.mapa}
        initialRegion={QUITO_INITIAL_REGION}
        showsUserLocation
        onPress={manejarToqueMapa}
        onLongPress={manejarToqueMapa}
        onPoiClick={manejarToquePoi}
        onRegionChangeComplete={manejarCambioRegion}
      >
        {!modoFormulario &&
          eventos.map((ev) => {
            const esActivo = seleccionado?.id === ev.id;
            return (
              <Marker
                key={ev.id}
                coordinate={{ latitude: ev.latitud, longitude: ev.longitud }}
                title={ev.titulo}
                description={ev.nombre_lugar}
                pinColor={esActivo ? COLORS.primary : COLORS.accent}
                onPress={(e) => {
                  e.stopPropagation();
                  seleccionarEvento(ev);
                }}
              />
            );
          })}

        {modoFormulario && (
          <Marker
            coordinate={coordPin}
            draggable
            pinColor={COLORS.primary}
            title="Punto seleccionado"
            description="Arrastra o toca otro lugar del mapa"
            onDragEnd={(e) => fijarCoordenada(e.nativeEvent.coordinate)}
          />
        )}
      </MapView>

      {modoFormulario && (
        <View pointerEvents="none" style={styles.miraCentro}>
          <Text style={styles.textoMira}>+</Text>
        </View>
      )}

      <View pointerEvents="box-none" style={styles.barraSuperior}>
        <View style={styles.pillContador}>
          <Text style={styles.textoPill}>📍 {eventos.length} eventos en Quito</Text>
        </View>
        {!modoFormulario && (
          <TouchableOpacity style={styles.botonNuevo} onPress={abrirCrearEvento}>
            <Text style={styles.textoBotonNuevo}>+ Evento</Text>
          </TouchableOpacity>
        )}
      </View>

      {!modoFormulario && seleccionado && (
        <View style={styles.tarjetaEvento}>
          <View style={styles.headerTarjeta}>
            <Text style={styles.tag}>{seleccionado.comunidad_nombre}</Text>
            <View style={styles.accionesTop}>
              <Text style={styles.asistentes}>🔥 {seleccionado.total_asistentes}</Text>
              <TouchableOpacity
                style={styles.btnMiniEditar}
                onPress={() => abrirEditarEvento(seleccionado)}
              >
                <Text style={styles.textoMiniEditar}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnMiniEliminar}
                onPress={() => confirmarEliminar(seleccionado)}
              >
                <Text style={styles.textoMiniEliminar}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSeleccionado(null)}>
                <Text style={styles.btnCerrar}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.titulo}>{seleccionado.titulo}</Text>
          <Text style={styles.lugar}>📍 {seleccionado.nombre_lugar}</Text>
          {!!seleccionado.descripcion && (
            <Text style={styles.descripcion}>{seleccionado.descripcion}</Text>
          )}

          <View style={styles.filaBotones}>
            <TouchableOpacity
              style={styles.botonAsistir}
              onPress={() => confirmarAsistencia(seleccionado.id)}
            >
              <Text style={styles.textoAsistir}>¡Voy a Asistir!</Text>
            </TouchableOpacity>

            {seleccionado.enlace_externo && (
              <TouchableOpacity
                style={styles.botonExterno}
                onPress={() => Linking.openURL(seleccionado.enlace_externo!)}
              >
                <Text style={styles.textoExterno}>Ver Link / Lobby</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {modoFormulario && (
        <View style={styles.panelFormulario}>
          <View style={styles.headerForm}>
            <Text style={styles.tituloForm}>
              {modoFormulario === 'editar' ? '✏️ Editar Evento' : '✨ Nuevo Evento'}
            </Text>
            <TouchableOpacity onPress={cerrarFormulario}>
              <Text style={styles.btnCerrar}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filaCoord}>
            <Text style={styles.ayudaMapa}>
              📍 {coordPin.latitude.toFixed(5)}, {coordPin.longitude.toFixed(5)}
            </Text>
            <TouchableOpacity
              style={styles.btnUsarCentro}
              onPress={() => fijarCoordenada(centroMapa)}
            >
              <Text style={styles.textoUsarCentro}>🎯 Fijar centro</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollForm} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Título del evento *"
              placeholderTextColor={COLORS.textMuted}
              value={tituloForm}
              onChangeText={setTituloForm}
            />
            <TextInput
              style={styles.input}
              placeholder="Nombre del lugar (ej. Parque La Carolina)"
              placeholderTextColor={COLORS.textMuted}
              value={lugarForm}
              onChangeText={setLugarForm}
            />
            <TextInput
              style={styles.input}
              placeholder="Descripción breve"
              placeholderTextColor={COLORS.textMuted}
              value={descripcionForm}
              onChangeText={setDescripcionForm}
            />
            <TextInput
              style={styles.input}
              placeholder="Enlace externo / Lobby (opcional)"
              placeholderTextColor={COLORS.textMuted}
              value={enlaceForm}
              onChangeText={setEnlaceForm}
              autoCapitalize="none"
            />
          </ScrollView>

          <TouchableOpacity
            style={styles.botonGuardar}
            onPress={guardarFormulario}
            disabled={guardando}
          >
            <Text style={styles.textoAsistir}>
              {guardando
                ? 'Guardando...'
                : modoFormulario === 'editar'
                ? 'Guardar Cambios'
                : 'Publicar en el Mapa'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORS.background },
  centrado: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapa: { flex: 1 },
  miraCentro: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoMira: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  barraSuperior: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillContador: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  textoPill: { color: COLORS.text, fontWeight: 'bold', fontSize: 12 },
  botonNuevo: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  textoBotonNuevo: { color: COLORS.background, fontWeight: 'bold', fontSize: 13 },
  tarjetaEvento: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  headerTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  accionesTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { color: COLORS.primary, fontWeight: 'bold', fontSize: 12 },
  asistentes: { color: COLORS.accent, fontWeight: 'bold', fontSize: 12 },
  btnMiniEditar: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  textoMiniEditar: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
  btnMiniEliminar: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  textoMiniEliminar: { color: COLORS.accent, fontSize: 11, fontWeight: 'bold' },
  btnCerrar: { color: COLORS.textMuted, fontSize: 16, fontWeight: 'bold', paddingHorizontal: 4 },
  titulo: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  lugar: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  descripcion: { color: COLORS.textMuted, fontSize: 13, marginVertical: 8 },
  filaBotones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  botonAsistir: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoAsistir: { color: COLORS.background, fontWeight: 'bold', fontSize: 13 },
  botonExterno: {
    flex: 1,
    backgroundColor: COLORS.accent,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoExterno: { color: COLORS.text, fontWeight: 'bold', fontSize: 13 },
  panelFormulario: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
    maxHeight: '52%',
  },
  headerForm: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tituloForm: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
  filaCoord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ayudaMapa: { color: COLORS.textSecondary, fontSize: 11.5 },
  btnUsarCentro: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  textoUsarCentro: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
  scrollForm: { maxHeight: 165 },
  input: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 8,
    fontSize: 13,
  },
  botonGuardar: {
    backgroundColor: COLORS.primary,
    padding: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
});