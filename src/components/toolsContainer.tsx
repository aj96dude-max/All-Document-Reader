import { StyleSheet, View } from "react-native";
import Tool from "./tool";

const ToolsContainer = () => {
  const tools = [
    {
      title: "All Files",
      icon: require("../../Assets/home/allfiles.png"),
    },
    {
      title: "PDF",
      icon: require("../../Assets/home/pdf.png"),
    },
    {
      title: "Word",
      icon: require("../../Assets/home/word.png"),
    },
    {
      title: "Excel",
      icon: require("../../Assets/home/excel.png"),
    },
    {
      title: "PPT",
      icon: require("../../Assets/home/ppt.png"),
    },
    {
      title: "TXT",
      icon: require("../../Assets/home/txt.png"),
    },
    {
      title: "EPUB",
      icon: require("../../Assets/home/epub.png"),
    },
    {
      title: "RTF",
      icon: require("../../Assets/home/rtf.png"),
    },
  ];

  return (
    <View style={styles.container}>
      {tools.map((item, index) => (
        <View style={{ width: "25%" }}>
          <Tool key={index} title={item.title} icon={item.icon} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
});

export default ToolsContainer;
