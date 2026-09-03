import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';

interface DocumentBottomToolbarProps {
  isFavorite: boolean;
  bottomInset: number;
  onRename: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onJumpToPage: () => void;
}

const DocumentBottomToolbar: React.FC<DocumentBottomToolbarProps> = ({
  isFavorite,
  bottomInset,
  onRename,
  onToggleFavorite,
  onDelete,
  onJumpToPage,
}) => {
  return (
    <View
      style={[
        styles.bottomToolbar,
        { paddingBottom: Math.max(bottomInset, 12) },
      ]}
    >
      <TouchableOpacity
        style={styles.toolbarItem}
        onPress={onRename}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../Assets/icons/border_color.png')}
          style={styles.toolbarIcon}
        />
        <Text style={styles.toolbarLabel}>Rename</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toolbarItem}
        onPress={onToggleFavorite}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../Assets/icons/heart_minus.png')}
          style={styles.toolbarIcon}
        />
        <Text style={styles.toolbarLabel}>
          {isFavorite ? 'Unfavorite' : 'Favorite'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toolbarItem}
        onPress={onDelete}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../Assets/icons/delete_forever.png')}
          style={styles.toolbarIcon}
        />
        <Text style={styles.toolbarLabel}>Delete</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toolbarItem}
        onPress={onJumpToPage}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../Assets/icons/search.png')}
          style={styles.toolbarIcon}
        />
        <Text style={styles.toolbarLabel}>Jump to</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomToolbar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  toolbarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  toolbarIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#1F2937',
    marginBottom: 4,
  },
  toolbarLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
});

export default DocumentBottomToolbar;
