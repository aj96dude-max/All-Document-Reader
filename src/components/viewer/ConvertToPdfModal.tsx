import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

interface ConvertToPdfModalProps {
  visible: boolean;
  status: 'converting' | 'success';
  onClose: () => void;
}

const ConvertToPdfModal: React.FC<ConvertToPdfModalProps> = ({
  visible,
  status,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={status === 'success' ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {status === 'converting' ? (
            <>
              <View style={styles.lottieContainer}>
                <LottieView
                  source={require('../../../Assets/anim/Converting PDF Jason.json')}
                  autoPlay
                  loop
                  style={styles.lottie}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.statusText}>Converting....</Text>
            </>
          ) : (
            <>
              <Text style={[styles.statusText, { marginTop: 12, marginBottom: 24 }]}>
                Converted Sucessfully
              </Text>
              <View style={styles.successLottieContainer}>
                <LottieView
                  source={require('../../../Assets/anim/After converting done lootie.json')}
                  autoPlay
                  loop={false}
                  style={styles.lottie}
                  resizeMode="contain"
                />
              </View>
              <TouchableOpacity
                style={styles.doneButton}
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalContainer: {
      width: '100%',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    lottieContainer: {
      width: 150,
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successLottieContainer: {
      width: 150,
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    lottie: {
      width: '100%',
      height: '100%',
    },
    statusText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      textAlign: 'center',
    },
    doneButton: {
      width: '100%',
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    doneButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

export default ConvertToPdfModal;
