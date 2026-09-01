import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const RecentDocuments = () => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [search, setSearch] = useState('');
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Text style={styles.title}>Recent Documents</Text>
          <Pressable onPress={() => setIsSearchActive(false)}>
            <Image
              style={{ width: 34, height: 34 }}
              source={require('../../../Assets/home/search.png')}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 30,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecentDocuments;
