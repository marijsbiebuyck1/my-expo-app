import { ThemedText } from "@/components/themed-text";
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { ADMIN_BASE, api } from "../../../_lib/api";
import { useAdminAuth } from "../../../_lib/useAuth";
// minimal settings page for admin (shelter): avatar, change button, name, delete account

export default function SettingsScreen() {
  const router = useRouter();
  const { admin, token, save, clear } = useAdminAuth();
  const [shelter, setShelter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  // local preview URI while uploading / immediately after selection
  const [selectedLocalUri, setSelectedLocalUri] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (admin && mounted) {
          setShelter(admin);
        } else {
          const raw = await SecureStore.getItemAsync("admin");
          if (!mounted) return;
          if (raw) {
            try {
              setShelter(JSON.parse(raw));
            } catch {
              setShelter(null);
            }
          } else setShelter(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [admin]);

  async function pickAndUploadPhoto() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Toestemming nodig", "Geef toegang tot je foto's om een profielfoto te kiezen.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        // request images only
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.7,
      });

      const wasCancelled = (result as any).cancelled ?? (result as any).canceled ?? false;
      if (wasCancelled) return;

  // get uri from new assets shape or legacy uri
  // @ts-ignore
  const uri: string | undefined = (result.assets && result.assets[0] && result.assets[0].uri) || (result as any).uri;
      if (!uri) return;

      // show local preview immediately (we'll try to replace with a base64 preview after manipulation)
  setSelectedLocalUri(uri);

      // attempt to resize/compress and produce a base64 preview
      let uploadUri = uri;
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 600 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        if (manipulated.uri) uploadUri = manipulated.uri;
        if (manipulated.base64) setSelectedLocalUri(`data:image/jpeg;base64,${manipulated.base64}`);
      } catch (e) {
        console.warn('image manipulation failed, proceeding with original uri', e);
      }

      const uriParts = uploadUri.split('/');
      const fileName = uriParts[uriParts.length - 1] || `photo-${Date.now()}.jpg`;
      const match = fileName.match(/\.([0-9a-zA-Z]+)$/);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      // Some Android URIs are content:// and can't be attached directly. Copy to cache when needed.
  // `uploadUri` is already set above (possibly the manipulated uri)
      try {
        if (Platform.OS === 'android' && uri.startsWith('content://')) {
          // Read file as base64 then write to cache so fetch can send it
          const fs: any = FileSystem;
          const b64 = await fs.readAsStringAsync(uri, { encoding: 'base64' }).catch(() => null as string | null);
          if (b64) {
            const dest = (fs.cacheDirectory || fs.documentDirectory || '') + fileName;
            await fs.writeAsStringAsync(dest, b64, { encoding: 'base64' });
            uploadUri = dest;
          }
        }
      } catch (e) {
        console.warn('Could not copy content URI to cache, using original uri', e);
      }

      // iOS may require file:// prefix
      if (Platform.OS === 'ios' && !uploadUri.startsWith('file://')) {
        uploadUri = 'file://' + uploadUri;
      }

      const form = new FormData();
      // @ts-ignore -- React Native FormData file object
      const fileField = { uri: uploadUri, name: fileName, type: mimeType } as any;
      form.append('avatar', fileField);

      let id = admin?.id || admin?._id || (await SecureStore.getItemAsync('adminId'));
      if (!id) id = shelter?.id || shelter?._id || (await SecureStore.getItemAsync('adminId'));
      if (!id) {
        Alert.alert('Fout', 'Asiel-id niet gevonden. Log in als asiel en probeer het opnieuw.');
        return;
      }

      // debug: show what we will upload so Metro/device logs contain the details
      try {
        console.debug("admin:upload ->", { id, uploadUri, fileName, mimeType, isAdmin: true });
      } catch {}
      setUploading(true);
      const resp = await api.post(`/asielen/${id}/avatar`, form as any, true);
      // log raw response for easier debugging
      try {
        const respText = await resp.clone().text().catch(() => null);
        console.debug("admin:upload:response", { status: resp.status, body: respText });
      } catch {}
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        let msg = text || `HTTP ${resp.status}`;
        try {
          const parsed = JSON.parse(text);
          msg = parsed.message || JSON.stringify(parsed);
        } catch {}
        // Show server response in alert for immediate feedback
        Alert.alert('Upload mislukt', msg);
        return;
      }

      const json = await resp.json().catch(() => null);
      const updated = Array.isArray(json) && json.length > 0 ? json[0] : json.data || json.admin || json.result || json;
      if (updated) {
        // server may return profileImage or other names; normalize into shelter state
        setShelter(updated);
        // clear local preview so the UI uses the server-provided image
        setSelectedLocalUri(null);
        try {
          await SecureStore.setItemAsync('admin', JSON.stringify(updated));
          const adminId = (updated as any).id ?? (updated as any)._id;
          if (adminId) await SecureStore.setItemAsync('adminId', String(adminId));
        } catch {}
        try { await save(token ?? null, updated as any); } catch {}
      }
      Alert.alert('Klaar', 'Profielfoto bijgewerkt.');
    } catch (e) {
      console.error('photo upload error', e);
      Alert.alert('Fout', 'Er is iets misgegaan bij het uploaden van de foto.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteAccount() {
    Alert.alert('Account verwijderen', 'Weet je zeker dat je dit asiel-account wilt verwijderen? Dit kan niet ongedaan gemaakt worden.', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Verwijder', style: 'destructive', onPress: async () => {
        try {
          const id = admin?.id || admin?._id || shelter?.id || shelter?._id || (await SecureStore.getItemAsync('adminId'));
          if (!id) throw new Error('Asiel-id niet gevonden');
          const res = await api.del(`/asielen/${id}`, true);
          if (!res.ok) {
            const t = await res.text().catch(() => '');
            throw new Error(t || `Status ${res.status}`);
          }
          try { await clear(); } catch {}
          router.replace('/login');
        } catch (err: any) {
          console.warn('delete failed', err);
          Alert.alert('Verwijderen mislukt', String(err?.message || err));
        }
      } }
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <LogoHeader />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = shelter?.name || shelter?.displayName || '-';
  // consider several server-side fields (profileImage, photo, avatar, image)
  const photo = shelter && (shelter.profileImage || shelter.photo || shelter.photoUrl || shelter.avatar || shelter.image)
    ? String(shelter.profileImage || shelter.photo || shelter.photoUrl || shelter.avatar || shelter.image)
    : null;
  let displayPhotoUri: string | null = photo;
  if (displayPhotoUri && !displayPhotoUri.startsWith('http')) {
    if (displayPhotoUri.startsWith('/')) displayPhotoUri = ADMIN_BASE + displayPhotoUri;
    else displayPhotoUri = ADMIN_BASE + '/' + displayPhotoUri;
  }

  // prefer local preview while present
  const shownUri = selectedLocalUri || displayPhotoUri;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <LogoHeader />
      <View style={styles.container}>
        <View style={styles.card}>
          <ThemedText type="title" style={{ marginBottom: 12 }}>Profiel</ThemedText>
          {shownUri ? (
            <Image source={{ uri: shownUri }} style={styles.avatarLarge} />
          ) : (
            <View style={styles.avatarLargePlaceholder} />
          )}

          <TouchableOpacity style={styles.photoBtn} onPress={pickAndUploadPhoto} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#333" /> : <ThemedText style={styles.photoBtnText}>{photo ? 'Wijzig profielfoto' : 'Upload profielfoto'}</ThemedText>}
          </TouchableOpacity>

          <ThemedText type="subtitle" style={styles.nameText}>{displayName}</ThemedText>

          <TouchableOpacity style={styles.deleteBtn} onPress={deleteAccount}>
            <ThemedText style={{ color: '#fff' }}>Verwijder account</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBF4E2" },
  container: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  nameText: {
    fontSize: 20,
    marginBottom: 6,
    textAlign: 'center',
  },
  avatarLarge: {
    width: 210,
    height: 210,
    borderRadius: 20,
    marginBottom: 18,
  },
  avatarLargePlaceholder: {
    width: 210,
    height: 210,
    borderRadius: 20,
    backgroundColor: '#EEE',
    marginBottom: 18,
  },
  photoBtn: {
    backgroundColor: '#fff',
    borderColor: '#eee',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 12,
    width: 220,
  },
  photoBtnText: {
    color: '#333',
    fontFamily: 'Montserrat_600SemiBold',
  },
  deleteBtn: {
    backgroundColor: '#e3342f',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 12,
  },
});

export const options = {
  title: "Profiel",
  tabBarLabel: "Profile",
};
