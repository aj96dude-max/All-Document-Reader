import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

interface RenameModalProps {
  visible: boolean;
  initialName: string;
  isRenaming: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
}

const RenameModal: React.FC<RenameModalProps> = ({
  visible,
  initialName,
  isRenaming,
  onClose,
  onSave,
}) => {
  const [nameInput, setNameInput] = useState<string>(initialName);
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  useEffect(() => {
    if (visible) {
      setNameInput(initialName);
    }
  }, [visible, initialName]);

  const handleSave = () => {
    onSave(nameInput);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlayContent}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.renameDialog}>
                <Text style={styles.renameDialogTitle}>Rename Document</Text>
                <TextInput
                  style={styles.renameTextInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  selectTextOnFocus
                  placeholder="Document Name"
                  placeholderTextColor="#9CA3AF"
                  editable={!isRenaming}
                />
                <View style={styles.dialogActionsRow}>
                  <TouchableOpacity
                    style={styles.dialogCancelBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                    disabled={isRenaming}
                  >
                    <Text style={styles.dialogCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dialogSaveBtn}
                    onPress={handleSave}
                    activeOpacity={0.8}
                    disabled={isRenaming}
                  >
                    <Text style={styles.dialogSaveText}>
                      {isRenaming ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (colors: ColorPalette) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
  },
  modalOverlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  renameDialog: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  renameDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  renameTextInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 20,
  },
  dialogActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dialogCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dialogSaveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  dialogSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default RenameModal;
