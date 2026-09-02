import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type ToolProps = {
  title: string;
  icon: any;
  onPress: () => void;
};

const Tool = ({ title, icon, onPress }: ToolProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.iconPlaceHolder}>
        <Image source={icon} style={styles.image} />
      </View>

      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '22%',
    minWidth: 75,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },

  pressed: {
    opacity: 0.6,
  },

  iconPlaceHolder: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },

  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  title: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default Tool;
