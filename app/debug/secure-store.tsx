import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SecureStoreDebug() {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userObj, setUserObj] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const readAll = useCallback(async () => {
    setLoading(true);
    try {
      const t = await SecureStore.getItemAsync('userToken');
      const id = await SecureStore.getItemAsync('userId');
      const u = await SecureStore.getItemAsync('user');
      setUserToken(t);
      setUserId(id);
      setUserObj(u);
    } catch (e) {
      console.error('secure store read error', e);
      Alert.alert('Fout', 'Kon SecureStore niet lezen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    readAll();
  }, [readAll]);

  const clearAll = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userId');
      await SecureStore.deleteItemAsync('user');
      setUserToken(null);
      setUserId(null);
      setUserObj(null);
      Alert.alert('Verwijderd', 'SecureStore keys zijn verwijderd (dev).');
    } catch (e) {
      console.error('secure store clear error', e);
      Alert.alert('Fout', 'Kon SecureStore niet leegmaken.');
    }
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>SecureStore debug</Text>

        <View style={styles.row}>
          <Text style={styles.label}>userToken</Text>
          <Text style={styles.value}>{loading ? 'Loading...' : (userToken ?? '—')}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>userId</Text>
          <Text style={styles.value}>{loading ? 'Loading...' : (userId ?? '—')}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>user (raw)</Text>
          <Text style={styles.value}>{loading ? 'Loading...' : (userObj ? userObj : '—')}</Text>
        </View>

        <View style={{ height: 20 }} />

        <Button title="Refresh" onPress={readAll} />
        <View style={{ height: 10 }} />
        <Button title="Clear keys (dev)" color="#d33" onPress={clearAll} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF' },
  container: { padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  row: { marginBottom: 12 },
  label: { fontSize: 14, color: '#333', fontWeight: '600' },
  value: { fontSize: 13, color: '#111', marginTop: 6 },
});
