import React from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export default function BgCard({ children, style, contentStyle }: Props) {
  return (
    <View style={[styles.container, style]}>
      <ScrollView
        contentContainerStyle={[styles.contentContainer, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 360,
    paddingHorizontal: 24,
    paddingVertical: 26,
    borderRadius: 36,
    backgroundColor: "#FFF",
    alignSelf: "center",
    // drop shadow (match admin chatCard styling)
    shadowColor: "#0F0B06",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    // elevation for Android
    elevation: 8,
  },
  contentContainer: {
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
    paddingBottom: 10,
  },
});
