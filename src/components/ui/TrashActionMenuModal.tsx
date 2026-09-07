import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import Back from "../../../Assets/svgicons/chevron_backward.svg"
import Delte from "../../../Assets/svgicons/delete_forever.svg"
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

interface TrashActionMenuModalProps {
  visible: boolean;
  anchorPosition?: { top: number; right?: number } | null;
  onClose: () => void;
  onRestore: () => void;
  onDeletePermanently: () => void;
}

const MENU_HEIGHT = 120;
const MENU_WIDTH = 210;

const TrashActionMenuModal: React.FC<TrashActionMenuModalProps> = ({
  visible,
  anchorPosition,
  onClose,
  onRestore,
  onDeletePermanently,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const anim = useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = Dimensions.get('window');

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  const handleDismiss = (actionCallback?: () => void) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 90,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      onClose();
      if (actionCallback) {
        actionCallback();
      }
    });
  };

  if (!visible) return null;

  // Calculate clamped top position so menu never clips outside screen
  const targetTop =
    anchorPosition?.top !== undefined
      ? Math.min(Math.max(anchorPosition.top - 10, 50), windowHeight - MENU_HEIGHT - 30)
      : undefined;
  const targetRight = anchorPosition?.right !== undefined ? anchorPosition.right : 24;

  const cardStyle =
    targetTop !== undefined
      ? {
          position: 'absolute' as const,
          top: targetTop,
          right: targetRight,
        }
      : {
          alignSelf: 'center' as const,
        };

  const animatedStyle = {
    opacity: anim,
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
      },
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
        }),
      },
    ],
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={() => handleDismiss()}
    >
      <TouchableWithoutFeedback onPress={() => handleDismiss()}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View style={[styles.menuCard, cardStyle, animatedStyle]}>
              {/* 1. Restore */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDismiss(onRestore)}
                activeOpacity={0.7}
              >
                <Back 
                width={24}
                height={24}
                style={[styles.menuIcon as any, { tintColor: colors.primary }]}
                />
                <Text style={styles.menuText}>Restore</Text>
              </TouchableOpacity>

              {/* 2. Delete Permanently */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDismiss(onDeletePermanently)}
                activeOpacity={0.7}
              >
                <Delte width={24} height={24} style={[styles.menuIcon as any, { tintColor: colors.primary }]} />
                <Text style={styles.menuText}>Delete</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const getStyles = (colors: ColorPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  menuCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: MENU_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    marginRight: 14,
  },
  restoreIcon: {
    transform: [{ rotate: '90deg' }],
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default TrashActionMenuModal;
