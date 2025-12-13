import React, { useState } from "react";
import {
  Image,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export interface SwipeCardProps {
  title?: string; // small label/title at top
  name?: string; // big name
  gender?: string; // e.g. 'Kater' / 'Poes' / 'Male' / 'Female'
  age?: string; // e.g. '7 maand'
  breed?: string;
  description?: string;
  tags?: string[]; // small property chips
  secondaryTitle?: string;
  secondaryTags?: string[];
  // imageSource supports local static requires (require('./assets/maurice.png'))
  imageSource?: ImageSourcePropType;
  // imageUri supports remote (http(s) or file://) URIs
  imageUri?: string;
}

const CARD_WIDTH = 355;
const CARD_MAX_HEIGHT = 593;

export default function SwipeCard({
  title,
  name,
  gender,
  age,
  breed,
  description,
  tags = [],
  secondaryTitle,
  secondaryTags = [],
  imageSource,
  imageUri,
}: SwipeCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <View style={styles.cardWrap}>
      {imageSource ? (
        <Image
          source={imageSource}
          style={styles.image}
          onError={(e) => {
            console.warn(
              "SwipeCard image failed to load (local)",
              e.nativeEvent?.error || e.nativeEvent
            );
            setImageFailed(true);
          }}
          accessibilityLabel={name ? `${name} foto` : "card image"}
        />
      ) : imageUri && !imageFailed ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          onError={(e) => {
            console.warn(
              "SwipeCard image failed to load (remote)",
              e.nativeEvent?.error || e.nativeEvent
            );
            setImageFailed(true);
          }}
          accessibilityLabel={name ? `${name} foto` : "card image"}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>Geen afbeelding</Text>
        </View>
      )}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        {title ? <Text style={styles.title}>{title}</Text> : null}

        <View style={styles.rowTop}>
          <View style={styles.nameWrap}>
            <Text numberOfLines={2} style={styles.name}>
              {name}
            </Text>
          </View>
          <View style={styles.metaWrap}>
            <Text style={styles.metaText}>
              {gender}
              {gender && age ? " · " : ""}
              {age}
            </Text>
          </View>
        </View>

        {breed ? <Text style={styles.breed}>{breed}</Text> : null}

        {description ? (
          <View style={styles.descriptionBlock}>
            <Text style={styles.sectionHeading}>Beschrijving</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
        ) : null}

        {tags && tags.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Over mij</Text>
            <View style={styles.chipsRow}>
              {tags.map((t) => (
                <View key={t} style={styles.chip}>
                  <Text numberOfLines={1} style={styles.chipText}>
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {secondaryTags && secondaryTags.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>
              {secondaryTitle || "Wie zoek ik?"}
            </Text>
            <View style={styles.chipsRow}>
              {secondaryTags.map((t) => (
                <View key={`who-${t}`} style={styles.chip}>
                  <Text numberOfLines={1} style={styles.chipText}>
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    width: CARD_WIDTH,
    maxHeight: CARD_MAX_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: "hidden",
    // subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: -1, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5.2,
    elevation: 6,
    alignSelf: "center",
  },

  image: {
    width: CARD_WIDTH - 32,
    height: 320,
    resizeMode: "cover",
    alignSelf: "center",
    marginTop: 12,
    borderRadius: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 100,
  },
  imagePlaceholder: {
    width: CARD_WIDTH - 32,
    height: 320,
    backgroundColor: "#f2f2f2",
    alignSelf: "center",
    marginTop: 12,
    borderRadius: 16,
  },
  imagePlaceholderText: {
    color: "#9b9b9b",
    fontSize: 14,
    alignSelf: "center",
    marginTop: 12,
  },

  content: {
    flexGrow: 0,
    maxHeight: CARD_MAX_HEIGHT - 320,
  },
  contentInner: {
    padding: 20,
  },

  title: {
    fontSize: 12,
    color: "#9B9B9B",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  nameWrap: { flex: 1 },
  name: {
    fontSize: 32,
    fontWeight: "700",
    color: "#3F3F3F", // use provided selection color
    fontFamily: "MontserratAlternates-SemiBold",
  },
  metaWrap: {
    marginLeft: 12,
    alignItems: "flex-end",
  },
  metaText: {
    fontSize: 13,
    color: "#3F3F3F",
    fontFamily: "Montserrat_400Regular",
  },

  breed: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Montserrat_400Regular",
    marginBottom: 10,
  },

  description: {
    fontSize: 15,
    color: "#444",
    fontFamily: "Montserrat_400Regular",
    lineHeight: 22,
  },
  descriptionBlock: {
    marginBottom: 14,
  },

  sectionHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },

  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(174,186,64,0.20)", // #AEBA40 at 20%
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 13,
    color: "#333",
    fontFamily: "Montserrat_400Regular",
  },
});
