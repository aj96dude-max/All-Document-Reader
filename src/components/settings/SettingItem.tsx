import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from 'react-native';

import ChevronBackwardIcon from '../../../Assets/svgicons/chevron_backward.svg';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

export type SettingItemType = 'link' | 'switch';

export interface SettingItemProps {
  icon: React.FC<import('react-native-svg').SvgProps>;
  title: string;
  type?: SettingItemType;
  value?: boolean;
  onValueChange?: (val: boolean) => void;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ImageStyle>;
  testID?: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon: Icon,
  title,
  type = 'link',
  value = false,
  onValueChange,
  onPress,
  style,
  iconStyle,
  testID,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const isSwitch = type === 'switch';

  const content = (
    <View style={[styles.card, style]} testID={testID}>
      {/* Left Icon */}
      <View style={styles.iconContainer}>
        <Icon width="100%" height="100%" style={styles.leftIcon as any} {...(StyleSheet.flatten(iconStyle) as any)} color={colors.icon} />
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right Action: Switch or Chevron */}
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.border}
          style={styles.switch}
        />
      ) : (
        <View style={styles.chevronContainer}>
          <ChevronBackwardIcon
            width={14}
            height={14}
            style={styles.chevronIcon as any}
            color={colors.icon}
          />
        </View>
      )}
    </View>
  );

  if (isSwitch) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onValueChange && onValueChange(!value)}
        accessible={true}
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked: value }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {content}
    </TouchableOpacity>
  );
};
const getStyles = (colors: ColorPalette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 32,
    minHeight: 64,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftIcon: {
    width: 24,
    height: 24,
    tintColor: colors.icon,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 18,
  },
  switch: {
    transform: [{ scaleX: 0.95 }, { scaleY: 0.95 }],
  },
  chevronContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronIcon: {
    width: 14,
    height: 14,
    tintColor: colors.icon,
    transform: [{ rotate: '180deg' }],
  },
});

export default SettingItem;
