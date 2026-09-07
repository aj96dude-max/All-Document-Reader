import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';

import CancelIcon from '../../../Assets/svgicons/cancel.svg';
import ArrowDropDownIcon from '../../../Assets/svgicons/arrow_drop_down.svg';
import ArrowDropDownUpIcon from '../../../Assets/svgicons/arrow_drop_down (1).svg';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

interface JumpToPageModalProps {
  visible: boolean;
  currentPage: number;
  totalPages: number;
  bottomInset: number;
  onClose: () => void;
  onJump: (page: number) => void;
}

const JumpToPageModal: React.FC<JumpToPageModalProps> = ({
  visible,
  currentPage,
  totalPages,
  bottomInset,
  onClose,
  onJump,
}) => {
  const [pageInput, setPageInput] = useState<string>(String(currentPage));
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, mode), [colors, mode]);

  useEffect(() => {
    if (visible) {
      setPageInput(String(currentPage));
    }
  }, [visible, currentPage]);

  const handleStep = (delta: number) => {
    const currentNum = parseInt(pageInput, 10) || currentPage;
    const nextNum = Math.min(Math.max(currentNum + delta, 1), Math.max(totalPages, 1));
    setPageInput(String(nextNum));
  };

  const handleGo = () => {
    const target = parseInt(pageInput, 10);
    const maxPage = Math.max(totalPages, 1);
    if (!isNaN(target) && target >= 1 && target <= maxPage) {
      onJump(target);
      onClose();
    } else {
      Alert.alert('Invalid Page', `Please enter a page number between 1 and ${maxPage}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.modalContainer,
                { paddingBottom: Math.max(bottomInset, 24) },
              ]}
            >
              {/* Drag Handle Indicator */}
              <View style={styles.modalHandle} />

              {/* Modal Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerSpacer} />
                <Text style={styles.headerTitle}>
                  Enter Page {currentPage} of {totalPages}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                  style={styles.closeBtn}
                >
                  <CancelIcon
                    width={24}
                    height={24}
                    style={[styles.closeIcon as any, { tintColor: colors.icon }]}
                  />
                </TouchableOpacity>
              </View>

              {/* Stepper with Input & Increment/Decrement Buttons */}
              <View style={styles.pageStepperBox}>
                <TouchableOpacity
                  onPress={() => handleStep(-1)}
                  style={styles.stepArrowBtn}
                  activeOpacity={0.6}
                >
                  <ArrowDropDownIcon
                    width={14}
                    height={14}
                    style={[styles.stepArrowIcon as any, { tintColor: colors.icon }]}
                  />
                </TouchableOpacity>

                <TextInput
                  style={styles.pageNumberInput}
                  value={pageInput}
                  onChangeText={setPageInput}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  maxLength={5}
                />

                <TouchableOpacity
                  onPress={() => handleStep(1)}
                  style={styles.stepArrowBtn}
                  activeOpacity={0.6}
                >
                  <ArrowDropDownUpIcon
                    width={14}
                    height={14}
                    style={[styles.stepArrowIcon as any, { tintColor: colors.icon }]}
                  />
                </TouchableOpacity>
              </View>

              {/* Go Button */}
              <TouchableOpacity
                style={styles.goButton}
                onPress={handleGo}
                activeOpacity={0.8}
              >
                <Text style={styles.goButtonText}>Go</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const getStyles = (colors: ColorPalette, mode: 'light' | 'dark' | 'system') => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  modalHandle: {
    width: 64,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerSpacer: {
    width: 28,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  pageStepperBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 30,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: mode === 'dark' ? 1 : 0,
    borderColor: colors.border,
  },
  stepArrowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepArrowIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  pageNumberInput: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    minWidth: 60,
    paddingVertical: 0,
  },
  goButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 13,
    paddingHorizontal: 64,
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  goButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});

export default JumpToPageModal;
