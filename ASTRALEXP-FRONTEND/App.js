import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: '#111417', flex: 1 }}>
      <StatusBar style="light" />
      <AuthProvider>
        {Platform.OS === 'web' ? (
          <View style={styles.webWrapper}>
            <View style={styles.appWrapper}>
              <AppNavigator />
            </View>
          </View>
        ) : (
          <AppNavigator />
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    backgroundColor: '#0A0C0E',
    alignItems: 'center',
  },
  appWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#111417',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1E2226',
    boxShadow: '0 0 20px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
});
