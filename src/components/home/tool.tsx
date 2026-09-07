import { TouchableOpacity, StyleSheet, Text, View } from "react-native";

type ToolProps = {
  title: string;
  icon: React.FC<import('react-native-svg').SvgProps>;
  onPress: () => void;
};

const Tool = ({ title, icon: Icon, onPress }: ToolProps) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconPlaceHolder}>
        <Icon width="100%" height="100%" />
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 98,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },

  iconPlaceHolder: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },

  title: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default Tool;
