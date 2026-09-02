import { Image, TouchableOpacity, StyleSheet, Text, View } from "react-native";

type ToolProp = {
  title: string;
  icon: any;
  onPress: () => void;
};

const Tool = ({ title, icon, onPress }: ToolProp) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconPlaceHolder}>
        <Image source={icon} style={styles.image} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 90,
    height: 90,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconPlaceHolder: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 12,
  },
});
export default Tool;
