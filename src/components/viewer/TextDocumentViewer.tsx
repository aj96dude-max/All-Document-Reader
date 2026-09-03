import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

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

const styles = StyleSheet.create({
  textScroll: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  textContent: {
    padding: 16,
  },
  paperCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#1F2937',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
});

export default TextDocumentViewer;
