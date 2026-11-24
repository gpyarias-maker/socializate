import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [ubicacion, setUbicacion] = useState<Location.LocationObject | null>(null);
  const [direccion, setDireccion] = useState<string>('Buscando tu sector en Quito...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);

  const obtenerUbicacion = async () => {
    setCargando(true);
    setErrorMsg(null);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permiso denegado. Activa el GPS.');
      setCargando(false);
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setUbicacion(location);

    try {
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (geocode.length > 0) {
        const lugar = geocode[0];
        const ciudad = lugar.city || lugar.subregion || 'Quito';
        const calle = lugar.street ? `${lugar.street}, ` : '';
        setDireccion(`${calle}${ciudad}, Ecuador`);
      }
    } catch {
      setDireccion('Quito, Ecuador');
    }
    setCargando(false);
  };

  useEffect(() => {
    obtenerUbicacion();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Socialízate</Text>
      <Text style={styles.subtitulo}>Conecta con grupos, conciertos y hobbies en Quito</Text>

      <View style={styles.tarjeta}>
        <Text style={styles.labelTarjeta}>TU UBICACIÓN ACTUAL</Text>
        {cargando ? (
          <ActivityIndicator size="large" color="#00F0FF" style={{ marginVertical: 20 }} />
        ) : errorMsg ? (
          <Text style={styles.error}>{errorMsg}</Text>
        ) : (
          <Text style={styles.ciudad}>{direccion}</Text>
        )}
      </View>

      <TouchableOpacity style={styles.botonPrimario} onPress={() => router.push('/(tabs)/comunidades' as any)}>
        <Text style={styles.textoBotonPrimario}>⚡ Entrar a la App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D15', alignItems: 'center', justifyContent: 'center', padding: 22 },
  titulo: { fontSize: 32, fontWeight: 'bold', color: '#00F0FF', marginBottom: 6, textAlign: 'center' },
  subtitulo: { fontSize: 13, color: '#B8B8D1', marginBottom: 24, textAlign: 'center' },
  tarjeta: {
    backgroundColor: '#1A1A2E', width: '100%', padding: 24, borderRadius: 18,
    alignItems: 'center', borderWidth: 1, borderColor: '#00F0FF', marginBottom: 20,
  },
  labelTarjeta: { color: '#7E7E9A', fontSize: 11, fontWeight: 'bold', marginBottom: 10 },
  ciudad: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  error: { color: '#FF2A85', textAlign: 'center', fontSize: 13 },
  botonPrimario: {
    backgroundColor: '#00F0FF', width: '100%', paddingVertical: 15,
    borderRadius: 12, alignItems: 'center',
  },
  textoBotonPrimario: { color: '#0D0D15', fontSize: 15, fontWeight: 'bold' },
});