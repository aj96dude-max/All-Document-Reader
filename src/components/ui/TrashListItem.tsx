import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

export type TrashListItemProps = {
  name: string;
  date: string;
  time?: string;
  daysRemainingText: string;
  icon: React.FC<import('react-native-svg').SvgProps>;
  iconBgColor?: string;
  onPress?: () => void;
  onMorePress?: (position: { pageX: number; pageY: number }) => void;
};

const TrashListItem: React.FC<TrashListItemProps> = ({
  name,
  date,
  time,
  daysRemainingText,
  icon: Icon,
  iconBgColor,
  onPress,
  onMorePress,
}) => {
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, mode), [colors, mode]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
    >
      {/* Icon Circle */}
      <View style={[styles.iconContainer, iconBgColor ? { backgroundColor: iconBgColor } : null]}>
        <Icon width="100%" height="100%" style={styles.icon as any} />
      </View>

      {/* Details: Name & Date/Days Left */}
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">
          {name}
        </Text>

        <View style={styles.subInfoRow}>
          <Text style={styles.dateText} numberOfLines={1}>
            {date}{time ? `, ${time}` : ''}
          </Text>
          <Text style={styles.daysBadgeText}>
            {daysRemainingText}
          </Text>
        </View>
      </View>

      {/* 3-Dots More Menu Trigger */}
      <Pressable
        style={styles.moreButton}
        onPress={(e) => {
          e.stopPropagation?.();
          const { pageX, pageY } = e.nativeEvent;
          onMorePress?.({ pageX, pageY });
        }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.more}>⋮</Text>
      </Pressable>
    </Pressable>
  );
};

const getStyles = (colors: ColorPalette, mode: 'light' | 'dark' | 'system') => StyleSheet.create({
  container: {
    height: 72,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: mode === 'dark' ? 1 : 0,
    borderColor: colors.border,
  },
  containerPressed: {
    opacity: 0.9,
    backgroundColor: mode === 'dark' ? '#2C2C2E' : '#FAFAFA',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: 'cover',
  },
  details: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
  },
  daysBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  moreButton: {
    width: 36,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  more: {
    fontSize: 22,
    color: colors.iconInactive,
    fontWeight: '700',
    lineHeight: 24,
  },
});

export default TrashListItem;
