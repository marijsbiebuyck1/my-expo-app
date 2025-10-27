import { ThemedText } from '@/components/themed-text';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Hide the default header/title bar rendered by the Stack for this route
export const options = {
  headerShown: false,
};

export default function RegisterOwnerScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [region, setRegion] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Toestemming nodig", "Geef toegang tot je foto's om een profielfoto te kiezen.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.7,
      });

      // handle both new and old result shapes
      // newer expo returns { canceled: false, assets: [{ uri }] } (US spelling)
      const wasCancelled = (result as any).cancelled ?? (result as any).canceled ?? false;
      if (!wasCancelled) {
        // @ts-ignore
        const uri = (result.assets && result.assets[0] && result.assets[0].uri) || (result as any).uri;
        if (uri) setPhotoUri(uri);
      }
    } catch (err) {
      console.warn('Image pick error', err);
    }
  }
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!name.trim()) return 'Vul je naam in.';
    if (!email.trim() || !email.includes('@')) return 'Vul een geldig e-mail adres in.';
    if (!birthdate.trim()) return 'Vul je geboortedatum in (YYYY-MM-DD).';
    if (!password || password.length < 6) return 'Kies een wachtwoord van minstens 6 tekens.';
    if (!region.trim()) return 'Vul je regio in.';
    return null;
  }

  async function onContinue() {
    const err = validate();
    if (err) {
      Alert.alert('Ongeldige invoer', err);
      return;
    }

    setLoading(true);
    try {
      // NOTE: the backend returned a validation error for the `role` enum.
      // Temporarily omit `role` so the server can pick its default value (or return a clearer error).

      // If user picked a photo, send multipart/form-data so backend can handle file upload.
      let resp;
      // build a debug payload object for logging when something fails
      const debugPayload: any = { name, email, password, birthdate, region };
      if (photoUri) {
        const form = new FormData();
        form.append('name', name);
        form.append('email', email);
        form.append('password', password);
        form.append('birthdate', birthdate);
        form.append('region', region);

        const uriParts = photoUri.split('/');
        const fileName = uriParts[uriParts.length - 1];
        const match = fileName.match(/\.([0-9a-zA-Z]+)$/);
        const ext = match ? match[1].toLowerCase() : 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  // @ts-ignore - React Native FormData file object
  form.append('photo', { uri: photoUri, name: fileName, type: mimeType });

  debugPayload.photo = fileName;
  console.debug('Register payload (multipart)', debugPayload);

        resp = await fetch('https://my-express-app-ne4l.onrender.com/users', {
          method: 'POST',
          // DO NOT set Content-Type header; fetch will set the multipart boundary automatically
          body: form as any,
        });
      } else {
        const payload = { name, email, password, birthdate, region };
        debugPayload.payload = payload;
        console.debug('Register payload (no role)', payload);

        resp = await fetch('https://my-express-app-ne4l.onrender.com/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!resp.ok) {
        const text = await resp.text();
        let message = text || 'Server error';
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || JSON.stringify(parsed);
        } catch {
          // not JSON, keep raw text
        }
        // Log status + raw text to help debugging server-side validation failures
  console.error('register failed', { status: resp.status, body: text, payload: debugPayload });
        // include HTTP status in the thrown error so the alert shows more context
        throw new Error(`HTTP ${resp.status}: ${message}`);
      }

      const json = await resp.json();

      // Try to find a token in the response using common keys.
      const possibleTokenKeys = [
        'token',
        'accessToken',
        'access_token',
        'authToken',
        'jwt',
        'id',
      ];

      let token: string | null = null;

      if (json && typeof json === 'object') {
        for (const k of possibleTokenKeys) {
          if ((json as any)[k]) {
            token = String((json as any)[k]);
            break;
          }
        }

        // check nested common shapes (e.g. { data: { token: '...' } } or { user: { token: '...' } })
        if (!token) {
          const nested = (json as any).data ?? (json as any).user ?? (json as any).result ?? null;
          if (nested && typeof nested === 'object') {
            for (const k of possibleTokenKeys) {
              if (nested[k]) {
                token = String(nested[k]);
                break;
              }
            }
          }
        }
      }

      if (token) {
        // store token securely
        await SecureStore.setItemAsync('userToken', token);
      } else if (json && (json as any).id) {
        // Backend returned a created user object (no token). Store the user id
        // and the user object so the app can identify the created account.
        await SecureStore.setItemAsync('userId', String((json as any).id));
        await SecureStore.setItemAsync('user', JSON.stringify(json));
      } else {
        console.warn('No auth token or id found in register response', json);
      }

      // success - navigate into the app (replace so user cannot go back to registration)
      router.replace('/home');
    } catch (e) {
      console.error('register error', e);
      Alert.alert('Fout', (e && (e as any).message) || 'Er is iets misgegaan bij het registreren.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>Eerst even over jou</ThemedText>

          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <Text style={styles.photoBtnText}>{photoUri ? 'Wijzig profielfoto' : 'Upload profielfoto'}</Text>
          </TouchableOpacity>

          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : null}

          <Text style={styles.label}>Wat is je naam?</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Voornaam Achternaam" />

          <Text style={styles.label}>Wat is je e-mailadres?</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Wachtwoord</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Wachtwoord" secureTextEntry />

          <Text style={styles.label}>Je geboortedatum</Text>
          <TextInput style={styles.input} value={birthdate} onChangeText={setBirthdate} placeholder="DD-MM-YYYY" />

          <Text style={styles.label}>Regio</Text>
          <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="Bijv. Antwerpen" />

          <View style={{ height: 20 }} />

          <TouchableOpacity style={styles.cta} onPress={onContinue} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Verder</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBF4E2' },
  container: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'stretch',
  },
  title: {
    fontFamily: 'MontserratAlternates-SemiBold',
    color: '#3F3F3F',
    fontSize: 22,
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    fontFamily: 'Montserrat_400Regular',
  },
  cta: {
    backgroundColor: '#FDA0E9',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',

  },
  ctaText: {
    color: '#fff',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
  },
  photoBtn: {
    backgroundColor: '#fff',
    borderColor: '#eee',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 12,
  },
  photoBtnText: {
    color: '#333',
    fontFamily: 'Montserrat_600SemiBold',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 12,
  },
});
