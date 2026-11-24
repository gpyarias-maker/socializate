import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../../../shared/theme/colors';

export const CuentaScreen = () => {
  const { perfil, cerrarSesion } = useAuth();

  return (
    <View style={styles.contenedor}>
      <View style={styles.card}>
        <Text style={styles.icono}>⚡</Text>
        <Text style={styles.nombre}>@{perfil?.nombre_usuario || 'Usuario'}</Text>
        <Text style={styles.sector}>📍 Sector: {perfil?.sector_quito || 'Quito'}</Text>
        <Text style={styles.email}>{perfil?.email}</Text>
      </View>

      <TouchableOpacity style={styles.botonSalir} onPress={cerrarSesion}>
        <Text style={styles.textoSalir}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: COLORS.card,
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  icono: { fontSize: 48, marginBottom: 10 },
  nombre: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  sector: { fontSize: 15, color: COLORS.text, marginTop: 8 },
  email: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  botonSalir: { backgroundColor: COLORS.accent, padding: 16, borderRadius: 12, alignItems: 'center' },
  textoSalir: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
});