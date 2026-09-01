import { Image } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type prop = {
  title: string;
  style?: string;
};

const CustomHeader = ({ title }: prop) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Image source={require("../../Assets/clear_all.png")} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginTop: 30,
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 30,
  },
  icon: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    paddingLeft: 50,
  },
});

export default CustomHeader;
