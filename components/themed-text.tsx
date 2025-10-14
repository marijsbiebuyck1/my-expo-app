import React from 'react';
import { Text as DefaultText, StyleSheet, TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  return (
    <DefaultText
      style={[styles.text, typeStyles[type], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'Montserrat_400Regular', // standaard font
    fontSize: 16,
    color: '#1a73e8', // standaard zwarte kleur
  },
});

const typeStyles = StyleSheet.create({
  default: {},
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    color: '#FF5733', // ← hier kun je de titelkleur instellen
  },
  subtitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    color: '#2E86C1', // ← hier kun je subtitelkleur instellen
  },
  link: {
    textDecorationLine: 'underline',
    color: '#1a73e8', // ← linkkleur
  },
});



