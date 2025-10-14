import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

type DisplayImageProps = {
  source: any;          // kan require() of uri zijn
  width?: number;       // optioneel
  height?: number;      // optioneel
  style?: object;       // extra styles
};

export const DisplayImage: React.FC<DisplayImageProps> = ({ source, width = 100, height = 100, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        style={{ width, height, resizeMode: 'contain' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
