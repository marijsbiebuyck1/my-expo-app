import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Hide default header/title bar rendered by the Stack for this route
export const options = {
  headerShown: false,
  // defensively ensure no header component is rendered
  header: () => null,
};

export default function RegisterInterests() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (val: string) => {
    setSelected(prev => (prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]));
  };

  const sections = [
    {
      title: 'Werk of opleiding?',
      items: ['💻 Telewerk', '✈️ Vaak reizen', '💼 9-to-5', '📚 Nog op school', '🧓🏽 Op pensioen'],
    },
    {
      title: 'In mijn vrije tijd hou ik van...',
      items: ['🥾 Wandelen', '⛱️ Op vakantie gaan', '📺 Series kijken', '🥂 Iets gaan drinken', '⚽️ Sporten'],
    },
    {
      title: 'Heb je al ervaring met huisdieren?',
      items: ['Ik heb ervaring', 'Ik heb geen ervaring'],
    },
    {
      title: 'Met wie woon je samen?',
      items: ['👶 Gezin', '👱 Alleen', '👯 Met roomies', '❤️ Met partner'],
    },
  ];

  async function onSave() {
    setLoading(true);
    try {
      // find saved user id or user object
      let userId = await SecureStore.getItemAsync('userId');
      const rawUser = await SecureStore.getItemAsync('user');
      if (!userId && rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          userId = parsed?.id ?? parsed?._id ?? null;
        } catch {
          // noop
        }
      }

      if (!userId) {
        Alert.alert('Fout', 'Kon je gebruikers-id niet vinden. Probeer in te loggen of registreer opnieuw.');
        return;
      }

      const token = await SecureStore.getItemAsync('userToken');

      const resp = await fetch(`https://my-express-app-ne4l.onrender.com/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ interests: selected }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('Failed to save interests', { status: resp.status, body: text });
        throw new Error(text || `HTTP ${resp.status}`);
      }

      // success -> go into app
      router.replace('/home' as any);
    } catch (err) {
      console.error('save interests error', err);
      Alert.alert('Fout', (err as any)?.message || 'Kon voorkeuren niet opslaan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    // Ensure the status bar is hidden for debugging (matches register-owner behavior)
    <SafeAreaView style={styles.screen} edges={["top", "left", "right", "bottom"]}>
      <StatusBar hidden />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>Wat zijn jouw interesses?</ThemedText>

        {sections.map(section => (
          <View key={section.title} style={{ marginBottom: 18 }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.chipsRow}>
              {section.items.map(item => {
                const isSelected = selected.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggle(item)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ height: 20 }} />

        <TouchableOpacity style={styles.cta} onPress={onSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Verder</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBF4E2' },
  container: { padding: 24, paddingTop: 30 },
  title: { fontSize: 22, marginBottom: 18, fontFamily: 'MontserratAlternates-SemiBold', color: '#3F3F3F' },
  sectionTitle: { fontSize: 14, marginBottom: 8, color: '#333', fontFamily: 'Montserrat_700Bold' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#EFEFD1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: '#E0F0D9' },
  chipText: { color: '#333', fontFamily: 'Montserrat_400Regular' },
  chipTextSelected: { fontFamily: 'Montserrat_600SemiBold' },
  cta: { backgroundColor: '#FDA0E9', paddingVertical: 14, borderRadius: 50, alignItems: 'center' },
  ctaText: { color: '#fff', fontFamily: 'Montserrat_600SemiBold' },
});
