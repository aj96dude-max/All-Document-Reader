import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const AllFiles = () => {
  return (
    <View style={styles.container}>
        <Text>All Files</Text>
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
export default AllFiles