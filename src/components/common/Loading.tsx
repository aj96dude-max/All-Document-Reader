import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';

export interface LoadingProps {
  /** Text message to display under the loader */
  message?: string;
  /** Optional secondary helper text */
  subMessage?: string;
  /** Size (width and height) of the loader gif in pixels. Defaults to 120 */
  size?: number;
  /** Style for the container view */
  style?: StyleProp<ViewStyle>;
  /** Style for the GIF image */
  imageStyle?: StyleProp<ImageStyle>;
  /** Style for the message text */
  textStyle?: StyleProp<TextStyle>;
  /** Style for the sub-message text */
  subTextStyle?: StyleProp<TextStyle>;
}

const Loading: React.FC<LoadingProps> = ({
  message = 'Scanning files…',
  subMessage,
  size = 120,
  style,
  imageStyle,
  textStyle,
  subTextStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../../Assets/loading.gif')}
        style={[{ width: size, height: size }, styles.gif, imageStyle]}
        resizeMode="contain"
      />
      {Boolean(message) && (
        <Text style={[styles.message, textStyle]}>{message}</Text>
      )}
      {Boolean(subMessage) && (
        <Text style={[styles.subMessage, subTextStyle]}>{subMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  gif: {
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default Loading;
