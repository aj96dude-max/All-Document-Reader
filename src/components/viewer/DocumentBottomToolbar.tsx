import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';

import HeartMinusIcon from '../../../Assets/svgicons/favorite_active.svg';
import FavoriteIcon from '../../../Assets/svgicons/un_favorite.svg';
import DeleteForeverIcon from '../../../Assets/svgicons/delete_forever.svg';
import SearchIcon from '../../../Assets/svgicons/search_bold.svg';
import DeleteConfirmationModal from '../ui/DeleteConfirmationModal';
import PdfIcon from '../../../Assets/svgicons/black_picture_as_pdf.svg';

import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

interface DocumentBottomToolbarProps {
  isFavorite: boolean;
  bottomInset: number;
  onConvert: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onJumpToPage: () => void;
}

const DocumentBottomToolbar: React.FC<DocumentBottomToolbarProps> = ({
  isFavorite,
  bottomInset,
  onConvert,
  onToggleFavorite,
  onDelete,
  onJumpToPage,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

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
          onPress={onConvert}
          activeOpacity={0.7}
        >
          <PdfIcon width={22} height={22} style={styles.toolbarIcon as any} />
          <Text style={styles.toolbarLabel}>Convert to PDF</Text>
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
              style={[
                styles.toolbarIcon as any,
                styles.favoriteActiveIcon as any,
              ]}
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

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    bottomToolbar: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
      marginBottom: 4,
      color: colors.icon,
    },
    favoriteActiveIcon: {
      tintColor: colors.primary,
    },
    toolbarLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },
    favoriteActiveLabel: {
      color: colors.primary,
      fontWeight: '600',
    },
  });

export default DocumentBottomToolbar;
