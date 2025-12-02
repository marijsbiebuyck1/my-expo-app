import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// expo-camera is optional; import namespace to inspect exports at runtime
// @ts-ignore
import * as ExpoCamera from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { manipulateImage } from "../app/lib/imageHelpers";
// Resolve Camera component from the module in a safe way.
const Cam: any = (ExpoCamera && (ExpoCamera as any).Camera) || (ExpoCamera as any).default || ExpoCamera;

type Props = {
  visible: boolean;
  onClose: () => void;
  onCapture: (result: { uploadUri: string | null; previewBase64: string | null }) => void;
};

export default function CameraCapture({ visible, onClose, onCapture }: Props) {
  const cameraRef = useRef<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [useFallbackCamera, setUseFallbackCamera] = useState(false);
  const [fallbackLaunched, setFallbackLaunched] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await (ExpoCamera as any).requestCameraPermissionsAsync();
        if (!mounted) return;
        const granted = status === "granted";
        setHasPermission(granted);
        // determine if the native Camera component looks usable; if not, fallback to ImagePicker camera
        const camRenderable = !!Cam && (typeof Cam === "function" || typeof Cam === "object");
        setUseFallbackCamera(!camRenderable);
      } catch (err) {
        if (!mounted) return;
        console.warn("camera permission error", err);
        setHasPermission(false);
        setUseFallbackCamera(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      setBusy(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (photo && (photo as any).uri) {
        const uri = (photo as any).uri;
        const processed = await manipulateImage(uri, true);
        onCapture(processed);
        onClose();
      }
    } catch (e) {
      console.warn("Camera capture failed", e);
      Alert.alert("Fout", "Kon foto niet nemen. Probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  // If the native Camera component isn't usable on this platform/build,
  // fall back to the system camera UI via ImagePicker.launchCameraAsync.
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!visible || !hasPermission || !useFallbackCamera || fallbackLaunched) return;
      setFallbackLaunched(true);
      try {
        const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
        const wasCancelled = (res as any).cancelled ?? (res as any).canceled ?? false;
        if (wasCancelled) {
          // user cancelled camera; just close modal
          if (mounted) onClose();
          return;
        }
        // new expo returns assets
        // @ts-ignore
        const uri = (res.assets && res.assets[0] && res.assets[0].uri) || (res as any).uri;
        if (!uri) {
          if (mounted) onClose();
          return;
        }
        const processed = await manipulateImage(uri, true);
        if (mounted) onCapture(processed);
        if (mounted) onClose();
      } catch (err) {
        console.warn("fallback camera failed", err);
        if (mounted) {
          Alert.alert("Fout", "Kon camera niet openen.");
          onClose();
        }
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, hasPermission, useFallbackCamera]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
  <View style={styles.container}>
        {hasPermission === false ? (
          <View style={styles.center}>
            <Text>Camera toegang geweigerd</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: "#fff" }}>Sluit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Cam style={styles.preview} ref={(r: any) => (cameraRef.current = r)} />
            <View style={styles.controls}>
              <TouchableOpacity onPress={onClose} style={styles.smallBtn}>
                <Text>Annuleren</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takePicture} style={styles.captureBtn} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Neem foto</Text>}
              </TouchableOpacity>
              <View style={{ width: 64 }} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  preview: { flex: 1 },
  controls: { flexDirection: "row", justifyContent: "space-around", padding: 16, backgroundColor: "rgba(0,0,0,0.4)" },
  captureBtn: { backgroundColor: "#FDA0E9", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
  smallBtn: { backgroundColor: "#fff", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  closeBtn: { marginTop: 12, backgroundColor: "#c0392b", padding: 8, borderRadius: 8 },
});
