import React from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";

type FileListItemProps = {
  name: string;
  size: string;
  date: string;
  time: string;
  icon: any;
  onPress: () => void;
  onMorePress?: (position: { pageX: number; pageY: number }) => void;
};

const FileListItem = ({
  name,
  size,
  date,
  time,
  icon,
  onPress,
  onMorePress,
}: FileListItemProps) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Image source={icon} style={styles.icon} />
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        <Text style={styles.info}>
          {size} · {date}, {time}
        </Text>
      </View>

      <Pressable
        style={styles.moreButton}
        onPress={(e) => {
          e.stopPropagation?.();
          const { pageX, pageY } = e.nativeEvent;
          onMorePress?.({ pageX, pageY });
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.more}>⋮</Text>
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 72,
    backgroundColor: "#fff",
    borderRadius: 36,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginVertical: 6,
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ffe1e1",
    justifyContent: "center",
    alignItems: "center",
  },

  icon: {
    width: 52,
    height: 52,
    resizeMode: "contain",
    borderRadius: 100,
  },

  details: {
    flex: 1,
    marginLeft: 14,
  },

  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },

  info: {
    marginTop: 4,
    fontSize: 12,
    color: "#999",
  },

  moreButton: {
    width: 35,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  more: {
    fontSize: 25,
    color: "#999",
    lineHeight: 28,
  },
});

export default FileListItem;