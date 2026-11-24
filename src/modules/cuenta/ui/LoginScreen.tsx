import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../../../shared/theme/colors';

export const LoginScreen = () => {
  const [esRegistro, setEsRegistro] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sectorQuito, setSectorQuito] = useState('');

  const { iniciarSesion, registrar, cargando, error } = useAuth();

  const manejarSubmit = () => {
    if (esRegistro) {
      registrar(nombreUsuario, email, password, sectorQuito);
    } else {
      iniciarSesion(email, password);
    }
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.logo}>Socialízate</Text>
      <Text style={styles.subtitulo}>Conecta con grupos, conciertos y hobbies en Quito</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {esRegistro && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario (ej. victor_uio)"
            placeholderTextColor={COLORS.textMuted}
            value={nombreUsuario}
            onChangeText={setNombreUsuario}
          />
          <TextInput
            style={styles.input}
            placeholder="Sector en Quito (ej. El Condado, La Carolina)"
            placeholderTextColor={COLORS.textMuted}
            value={sectorQuito}
            onChangeText={setSectorQuito}
          />
        </>
      )}

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña (mínimo 6 caracteres)"
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.boton} onPress={manejarSubmit} disabled={cargando}>
        {cargando ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.textoBoton}>{esRegistro ? 'Crear Cuenta' : 'Iniciar Sesión'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setEsRegistro(!esRegistro)}>
        <Text style={styles.link}>
          {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿Nuevo aquí? Regístrate gratis'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 38, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center' },
  subtitulo: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30, marginTop: 6 },
  error: { color: COLORS.accent, textAlign: 'center', marginBottom: 12 },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  boton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  textoBoton: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
  link: { color: COLORS.accent, textAlign: 'center', marginTop: 20, fontSize: 14 },
});
