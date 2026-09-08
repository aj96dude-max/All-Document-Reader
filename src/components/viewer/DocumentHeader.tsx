import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';

import ChevronBackwardIcon from '../../../Assets/svgicons/chevron_backward.svg';
import ShareIcon from '../../../Assets/svgicons/share.svg';
import PdfIcon from '../../../Assets/svgicons/picture_as_pdf.svg';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

interface DocumentHeaderProps {
  title: string;
  isPdf?: boolean;
  onBack: () => void;
  onShare: () => void;
  onConvert?: () => void;
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  title,
  isPdf = true,
  onBack,
  onShare,
  onConvert,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconBtn}
        onPress={onBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <ChevronBackwardIcon
          width={22}
          height={22}
          style={styles.headerBackIcon as any}
          color={colors.icon}
        />
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>

      {isPdf ? (
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={onShare}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ShareIcon
            width={22}
            height={22}
            style={styles.headerShareIcon as any}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={onConvert}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <PdfIcon
            width={22}
            height={22}
            style={styles.headerShareIcon as any}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: colors.background,
    },
    headerIconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBackIcon: {
      width: 22,
      height: 22,
      resizeMode: 'contain',
      color: colors.icon,
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginHorizontal: 8,
    },
    headerShareIcon: {
      width: 22,
      height: 22,
      resizeMode: 'contain',
      tintColor: colors.icon,
      color: colors.icon,
    },
  });

export default DocumentHeader;
