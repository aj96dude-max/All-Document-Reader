import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

interface TextDocumentViewerProps {
  content: string;
  loading: boolean;
  error: string | null;
}

const TextDocumentViewer: React.FC<TextDocumentViewerProps> = ({
  content,
  loading,
  error,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading text file...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.textScroll} contentContainerStyle={styles.textContent}>
      <View style={styles.paperCard}>
        <Text style={styles.textBody} selectable>
          {content}
        </Text>
      </View>
    </ScrollView>
  );
};

const getStyles = (colors: ColorPalette) => StyleSheet.create({
  textScroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  textContent: {
    padding: 16,
  },
  paperCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 20,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  textBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
  },
});

export default TextDocumentViewer;
