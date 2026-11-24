import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useComunidades } from '../hooks/useComunidades';
import { COLORS } from '../../../shared/theme/colors';

export const ComunidadesScreen = () => {
  const { comunidades, cargando, recargar, unirseYChatear } = useComunidades();

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Comunidades en Quito</Text>
      <Text style={styles.subtitulo}>Únete a tu grupo de interés para chatear y quedar</Text>

      <FlatList
        data={comunidades}
        keyExtractor={(item) => item.id.toString()}
        refreshing={cargando}
        onRefresh={recargar}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.filaSuperior}>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.badge}>{item.interes_nombre}</Text>
            </View>
            <Text style={styles.descripcion}>{item.descripcion}</Text>

            <View style={styles.filaInferior}>
              <Text style={styles.miembros}>👥 {item.total_miembros} miembros</Text>
              <TouchableOpacity style={styles.boton} onPress={() => unirseYChatear(item)}>
                <Text style={styles.textoBoton}>Unirse y Chatear →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORS.background, padding: 16, paddingTop: 50 },
  centrado: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  subtitulo: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, flex: 1 },
  badge: {
    backgroundColor: COLORS.accent,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  descripcion: { color: COLORS.textSecondary, marginTop: 8, fontSize: 14 },
  filaInferior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  miembros: { color: COLORS.textMuted, fontSize: 12 },
  boton: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  textoBoton: { color: COLORS.background, fontWeight: 'bold', fontSize: 12 },
});
