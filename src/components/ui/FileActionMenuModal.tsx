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


import HeartMinusIcon from '../../../Assets/svgicons/heart_minus.svg';
import FavoriteIcon from '../../../Assets/svgicons/black_favorite.svg';
import BorderColorIcon from '../../../Assets/svgicons/border_color.svg';
import DeleteForeverIcon from '../../../Assets/svgicons/delete_forever.svg';
import ShareIcon from '../../../Assets/svgicons/share.svg';

interface FileActionMenuModalProps {
  visible: boolean;
  anchorPosition?: { top: number; right?: number } | null;
  isFavorite?: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onRename: () => void;
  onDelete: () => void;
  onShare: () => void;
}

const MENU_HEIGHT = 210;
const MENU_WIDTH = 210;

const FileActionMenuModal: React.FC<FileActionMenuModalProps> = ({
  visible,
  anchorPosition,
  isFavorite = false,
  onClose,
  onToggleFavorite,
  onRename,
  onDelete,
  onShare,
}) => {
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
              {/* 1. Favorite / Unfavorite */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDismiss(onToggleFavorite)}
                activeOpacity={0.7}
              >
                {isFavorite ? (
                  <HeartMinusIcon width={22} height={22} style={styles.menuIcon as any} />
                ) : (
                  <FavoriteIcon width={22} height={22} style={styles.menuIcon as any} />
                )}
                <Text style={styles.menuText}>
                  {isFavorite ? 'Unfavorite' : 'Favorite'}
                </Text>
              </TouchableOpacity>

              {/* 2. Rename */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDismiss(onRename)}
                activeOpacity={0.7}
              >
                <BorderColorIcon width={22} height={22} style={styles.menuIcon as any} />
                <Text style={styles.menuText}>Rename</Text>
              </TouchableOpacity>

              {/* 3. Delete */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDismiss(onDelete)}
                activeOpacity={0.7}
              >
                <DeleteForeverIcon width={22} height={22} style={styles.menuIcon as any} />
                <Text style={styles.menuText}>Delete</Text>
              </TouchableOpacity>

              {/* 4. Share */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleDismiss(onShare)}
                activeOpacity={0.7}
              >
                <ShareIcon width={22} height={22} style={styles.menuIcon as any} />
                <Text style={styles.menuText}>Share</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
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
    paddingVertical: 11,
  },
  menuIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#ED1C24',
    marginRight: 14,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1C',
  },
});

export default FileActionMenuModal;
