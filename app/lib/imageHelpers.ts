import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
// Platform not needed here but keep minimal dependencies

type CaptureResult = {
  uploadUri: string | null;
  previewBase64: string | null; // data URL if available
};

/**
 * Manipulate a given image URI: resize to 600px wide, compress and optionally return base64 preview.
 */
export async function manipulateImage(uri: string, wantBase64 = true): Promise<CaptureResult> {
  if (!uri) return { uploadUri: null, previewBase64: null };
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: wantBase64 }
    );
    const uploadUri = manipulated && manipulated.uri ? manipulated.uri : uri;
    const previewBase64 = manipulated && (manipulated as any).base64 ? `data:image/jpeg;base64,${(manipulated as any).base64}` : null;
    return { uploadUri, previewBase64 };
  } catch (err) {
    // If manipulation fails, fall back to original uri
    console.warn('manipulateImage failed', err);
    return { uploadUri: uri, previewBase64: null };
  }
}

/**
 * Capture a photo from a cameraRef (Expo Camera) if provided, otherwise fall back to ImagePicker.launchCameraAsync.
 * Returns manipulated uploadUri and optional base64 preview.
 */
export async function captureFromCameraOrPicker(cameraRef?: any): Promise<CaptureResult> {
  try {
    let uri: string | null = null;
    if (cameraRef && cameraRef.current && typeof cameraRef.current.takePictureAsync === 'function') {
      // capture using cameraRef (expo-camera)
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (photo && (photo as any).uri) uri = (photo as any).uri;
    } else {
      // fallback to ImagePicker camera
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
      const wasCancelled = (res as any).cancelled ?? (res as any).canceled ?? false;
      if (!wasCancelled) {
        // new shape has res.assets
        // @ts-ignore
        uri = (res.assets && res.assets[0] && res.assets[0].uri) || (res as any).uri || null;
      }
    }

    if (!uri) return { uploadUri: null, previewBase64: null };

    // Manipulate and return both uploadUri and base64 preview
    return await manipulateImage(uri, true);
  } catch (err) {
    console.warn('captureFromCameraOrPicker failed', err);
    return { uploadUri: null, previewBase64: null };
  }
}

export default { manipulateImage, captureFromCameraOrPicker };
