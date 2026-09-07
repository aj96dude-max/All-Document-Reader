import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';

import DeleteFileIcon from '../../../Assets/svgicons/delete_file.svg';

interface DeleteConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  const handleDismiss = (callback?: () => void) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      onClose();
      if (callback) {
        callback();
      }
    });
  };

  if (!visible) return null;

  const animatedStyle = {
    opacity: anim,
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
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
            <Animated.View style={[styles.card, animatedStyle]}>
              <View style={styles.iconContainer}>
                <DeleteFileIcon width={115} height={140} />
              </View>
              
              <Text style={styles.title}>Delete</Text>
              
              <Text style={styles.description}>
                Are you sure you want to delete this file? After <Text style={styles.boldRedText}>30 days</Text> file will be delete permanantely.
              </Text>

              <TouchableOpacity
                style={styles.allowButton}
                onPress={() => handleDismiss(onConfirm)}
                activeOpacity={0.8}
              >
                <Text style={styles.allowButtonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => handleDismiss()}
                activeOpacity={0.8}
              >
                <Text style={styles.skipButtonText}>Cancel</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  boldRedText: {
    color: '#ED1C24',
    fontWeight: '700',
  },
  allowButton: {
    backgroundColor: '#ED1C24',
    borderRadius: 30,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  allowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ED1C24',
  },
  skipButtonText: {
    color: '#ED1C24',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeleteConfirmationModal;
