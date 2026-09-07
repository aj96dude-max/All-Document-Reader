import React from 'react';
import { Image, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClearAllIcon from '../../Assets/svgicons/clear_all.svg';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/colors';

type Props = {
  title: string;
  onMenuPress?: () => void;
};

const CustomHeader = ({ title, onMenuPress }: Props) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onMenuPress}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <ClearAllIcon
          width={24}
          height={24}
          style={[styles.icon as any, { tintColor: colors.icon }]}
        />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.placeholder} />
    </View>
  );
};

const getStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.background,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  icon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
});

export default CustomHeader;
