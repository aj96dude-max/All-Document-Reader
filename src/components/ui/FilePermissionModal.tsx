import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';

import FolderIcon from '../../../Assets/svgicons/folder.svg';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

interface FilePermissionModalProps {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
  title?: string;
  description?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FilePermissionModal: React.FC<FilePermissionModalProps> = ({
  visible,
  onAllow,
  onSkip,
  title = 'Documents',
  description = 'Allow Document Reader to access all your Documents on this Device ?',
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onSkip}
    >
      <TouchableWithoutFeedback onPress={onSkip}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.dialogCard}>
              {/* Top Folder Vector Illustration */}
              <View style={styles.illustrationContainer}>
                <FolderIcon width={100} height={100} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Description */}
              <Text style={styles.description}>{description}</Text>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                {/* Allow (Primary) Button */}
                <TouchableOpacity
                  style={styles.allowButton}
                  onPress={onAllow}
                  activeOpacity={0.8}
                >
                  <Text style={styles.allowButtonText}>Allow</Text>
                </TouchableOpacity>

                {/* Skip for now (Secondary Outlined) Button */}
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={onSkip}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipButtonText}>Skip for now</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: Math.min(SCREEN_WIDTH - 48, 330),
    backgroundColor: colors.surfaceElevated,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  illustrationContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  allowButton: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  allowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    width: '100%',
    height: 52,
    backgroundColor: 'transparent',
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default FilePermissionModal;
