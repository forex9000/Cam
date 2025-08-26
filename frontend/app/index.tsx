import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthProvider, { useAuth } from '../src/contexts/AuthContext';
import LoginScreen from '../src/screens/LoginScreen';
import MainApp from '../src/components/MainApp';

function AppContent() {
  const { user, loading } = useAuth();

  console.log('🔍 AppContent - user:', user, 'loading:', loading);

  if (loading) {
    console.log('⏳ Still loading...');
    return <View style={styles.container} />;
  }

  if (!user) {
    console.log('👤 No user, showing LoginScreen');
    return <LoginScreen navigation={null} />;
  }

  console.log('✅ User found, showing MainApp');
  return <MainApp />;
}

export default function Index() {
  console.log('🚀 App starting...');
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <View style={styles.container}>
          <AppContent />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});