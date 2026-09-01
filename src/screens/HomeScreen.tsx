import React from 'react'
import { Text, View } from 'react-native'
import ToolsContainer from '../components/home/toolsContainer'
import RecentDocuments from '../components/home/RecentDocuments'

const HomeScreen = () => {
  return (
    <View>
        <ToolsContainer />
        <RecentDocuments />
    </View>
  )
}

export default HomeScreen