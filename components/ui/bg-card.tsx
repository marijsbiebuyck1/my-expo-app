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
    display: "flex",
    width: 343,
    height: 666,
    paddingTop: 45,
    paddingRight: 15,
    paddingBottom: 15,
    paddingLeft: 15,
    flexDirection: "column",
    alignItems: "center",
    gap: 32, // ignored on RN but kept for readability
    flexShrink: 0,
    borderRadius: 20,
    backgroundColor: "#FFF",
    overflow: "hidden", // clip content
    // drop shadow (iOS)
    shadowColor: "#000",
    shadowOffset: { width: -1, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 23.4,
    // elevation for Android
    elevation: 6,
  },
  contentContainer: {
    width: "100%",
    // keep layout column + centered items
    flexDirection: "column",
    alignItems: "center",
    // vertical spacing between children: use margin on child elements or gap polyfill
    paddingBottom: 10,
  },
});
