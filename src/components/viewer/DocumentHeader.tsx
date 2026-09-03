import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';

interface DocumentHeaderProps {
  title: string;
  onBack: () => void;
  onShare: () => void;
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({ title, onBack, onShare }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerIconBtn}
        onPress={onBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../Assets/icons/chevron_backward.png')}
          style={styles.headerBackIcon}
        />
      </TouchableOpacity>

      <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>

      <TouchableOpacity
        style={styles.headerIconBtn}
        onPress={onShare}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../Assets/icons/share.png')}
          style={styles.headerShareIcon}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F4F5F7',
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
    tintColor: '#111827',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerShareIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#111827',
  },
});

export default DocumentHeader;
