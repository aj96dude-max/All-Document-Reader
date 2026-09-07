import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';

import BorderColorIcon from '../../../Assets/svgicons/border_color.svg';
import HeartMinusIcon from '../../../Assets/svgicons/favorite_active.svg';
import FavoriteIcon from '../../../Assets/svgicons/un_favorite.svg';
import DeleteForeverIcon from '../../../Assets/svgicons/delete_forever.svg';
import SearchIcon from '../../../Assets/svgicons/search_bold.svg';
import DeleteConfirmationModal from '../ui/DeleteConfirmationModal';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
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
        <BorderColorIcon
          width={22}
          height={22}
          style={styles.toolbarIcon as any}
        />
        <Text style={styles.toolbarLabel}>Rename</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toolbarItem}
        onPress={onToggleFavorite}
        activeOpacity={0.7}
      >
        {isFavorite ? (
          <HeartMinusIcon
            width={22}
            height={22}
            style={[styles.toolbarIcon as any, styles.favoriteActiveIcon as any]}
          />
        ) : (
          <FavoriteIcon
            width={22}
            height={22}
            style={[styles.toolbarIcon as any]}
          />
        )}
        <Text
          style={[
            styles.toolbarLabel,
            isFavorite && styles.favoriteActiveLabel,
          ]}
        >
          {isFavorite ? 'Unfavorite' : 'Favorite'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toolbarItem}
        onPress={() => setShowDeleteConfirm(true)}
        activeOpacity={0.7}
      >
        <DeleteForeverIcon
          width={22}
          height={22}
          style={styles.toolbarIcon as any}
        />
        <Text style={styles.toolbarLabel}>Delete</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toolbarItem}
        onPress={onJumpToPage}
        activeOpacity={0.7}
      >
        <SearchIcon
          width={22}
          height={22}
          style={styles.toolbarIcon as any}
        />
        <Text style={styles.toolbarLabel}>Jump to</Text>
      </TouchableOpacity>
    </View>
    <DeleteConfirmationModal
      visible={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      onConfirm={() => {
        setShowDeleteConfirm(false);
        onDelete();
      }}
    />
    </>
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
  favoriteActiveIcon: {
    tintColor: '#ED1C24',
  },
  toolbarLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
  favoriteActiveLabel: {
    color: '#ED1C24',
    fontWeight: '600',
  },
});

export default DocumentBottomToolbar;
