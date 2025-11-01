import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../components/logo-header";
import { ThemedText } from "../../../components/themed-text";

type Post = {
  _id?: string;
  caption?: string;
  image?: string; // backend returns a relative path like /uploads/xxx
  author?: string;
};

const API = "https://my-express-app-ne4l.onrender.com/posts";
const API_BASE = "https://my-express-app-ne4l.onrender.com";

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch(API);
      const data = await res.json();
      setPosts(Array.isArray(data) ? data.reverse() : []);
    } catch (err) {
      console.warn("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "We need access to your photos to upload a picture.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Image picker error", err);
    }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "We need camera access to take a photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
  if (!result.canceled && result.assets && result.assets.length > 0) setImage(result.assets[0].uri);
    } catch (err) {
      console.warn("Camera error", err);
    }
  }

  async function submitPost() {
    if (!image) {
      Alert.alert("Add an image", "Please add a photo before posting.");
      return;
    }

    setPosting(true);
    try {
      const uriParts = image.split("/");
      const name = uriParts[uriParts.length - 1];
      const match = name.match(/\.([0-9a-z]+)(?:\?|$)/i);
      const type = match ? `image/${match[1]}` : "image";

      const form = new FormData();
      // @ts-ignore - RN FormData expects a blob-like object
      form.append("image", {
        uri: Platform.OS === "ios" && image.startsWith("file://") ? image : image,
        name,
        type,
      });
      form.append("caption", caption || "");
      form.append("author", "Marijs");

      const res = await fetch(API, {
        method: "POST",
        body: form as any,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      setModalVisible(false);
      setImage(null);
      setCaption("");
      fetchPosts();
    } catch (err) {
      console.warn("Post upload failed", err);
      Alert.alert("Upload failed", String(err));
    } finally {
      setPosting(false);
    }
  }

  function renderPost({ item }: { item: Post }) {
    return (
      <View style={styles.postCard}>
        <ThemedText style={styles.author}>{item.author || "Anon"}</ThemedText>
        {item.image ? (
          <Image
            source={{ uri: item.image.startsWith("http") ? item.image : `${API_BASE}${item.image}` }}
            style={styles.postImage}
          />
        ) : null}
        {item.caption ? <ThemedText>{item.caption}</ThemedText> : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <LogoHeader />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <ThemedText type="title">Happy tails Feed 🐶🐱</ThemedText>
          <TouchableOpacity style={styles.postButton} onPress={() => setModalVisible(true)}>
            <ThemedText style={styles.postButtonText}>+ Voeg foto toe</ThemedText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(i) => (i._id ? i._id : String(Math.random()))}
            renderItem={renderPost}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <ThemedText type="title">Plaats een foto met jouw nieuwste huisgenoot</ThemedText>

          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.pickedImage} />
            ) : (
              <ThemedText>upload foto</ThemedText>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.smallButton} onPress={pickImage}>
              <ThemedText>Choose</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={takePhoto}>
              <ThemedText>Camera</ThemedText>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Onderschrift toevoegen..."
            value={caption}
            onChangeText={setCaption}
            multiline
            style={styles.captionInput}
          />

          <View style={{ width: "100%" }}>
            <TouchableOpacity style={styles.shareButton} onPress={submitPost} disabled={posting}>
              {posting ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: "#fff" }}>Delen</ThemedText>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.shareButton, { backgroundColor: "#eee", marginTop: 8 }]} onPress={() => setModalVisible(false)}>
              <ThemedText>Annuleren</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  postButton: {
    backgroundColor: "#FDA0E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  postButtonText: {
    color: "#fff",
    fontFamily: 'Montserrat_600SemiBold',
  },
  postCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  author: {
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#FFFCF5",
  },
  imagePicker: {
    width: 140,
    height: 140,
    backgroundColor: "#E6F0F8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  pickedImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  captionInput: {
    width: "100%",
    minHeight: 80,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    marginTop: 12,
  },
  shareButton: {
    backgroundColor: "#FDA0E9",
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 16,
  },
  smallButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
});

export const options = {
  title: "Feed",
  tabBarLabel: "Feed",
};
