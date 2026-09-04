import { Image, TouchableOpacity, StyleSheet, Text, View } from "react-native";

type ToolProps = {
  title: string;
  icon: React.FC<import('react-native-svg').SvgProps>;
  onPress: () => void;
};

const Tool = ({ title, icon: Icon, onPress }: ToolProps) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconPlaceHolder}>
        <Icon width="100%" height="100%" />
      </View>

      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
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
