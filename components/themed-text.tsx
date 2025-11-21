import React from "react";
import { Text as DefaultText, StyleSheet, TextProps } from "react-native";

export type ThemedTextProps = TextProps & {
  type?: "default" | "title" | "subtitle" | "link";
};

export function ThemedText({
  style,
  type = "default",
  ...rest
}: ThemedTextProps) {
  return (
    <DefaultText style={[styles.text, typeStyles[type], style]} {...rest} />
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "Montserrat_400Regular", // standaard font
    fontSize: 16,
    color: "#292929", // standaard zwarte kleur
  },
});

const typeStyles = StyleSheet.create({
  default: {},
  title: {
    fontFamily: "MontserratAlternates-SemiBold",
    fontSize: 24,
    color: "#292929", // ← hier kun je de titelkleur instellen
  },
  subtitle: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 18,
    color: "#292929", // ← hier kun je subtitelkleur instellen
  },
  link: {
    textDecorationLine: "underline",
    color: "#292929", // ← linkkleur
  },
});
