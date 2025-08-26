import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import CameraScreen from '../screens/CameraScreen';
import VideosScreen from '../screens/VideosScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VideoViewScreen from '../screens/VideoViewScreen';

type TabScreen = 'Camera' | 'Videos' | 'Profile';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<TabScreen>('Camera');
  const [videoViewId, setVideoViewId] = useState<string | null>(null);

  const navigation = {
    navigate: (screen: string, params?: any) => {
      if (screen === 'VideoView') {
        setVideoViewId(params?.videoId || null);
      } else {
        setVideoViewId(null);
        setActiveTab(screen as TabScreen);
      }
    },
    goBack: () => {
      setVideoViewId(null);
    }
  };

  const renderScreen = () => {
    if (videoViewId) {
      return <VideoViewScreen route={{ params: { videoId: videoViewId } }} />;
    }

    switch (activeTab) {
      case 'Camera':
        return <CameraScreen />;
      case 'Videos':
        return <VideosScreen navigation={navigation} />;
      case 'Profile':
        return <ProfileScreen />;
      default:
        return <CameraScreen />;
    }
  };

  if (videoViewId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setVideoViewId(null)}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>View Video</Text>
        </View>
        {renderScreen()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Camera' && styles.activeTab]}
          onPress={() => setActiveTab('Camera')}
        >
          <Ionicons 
            name={activeTab === 'Camera' ? 'camera' : 'camera-outline'} 
            size={24} 
            color={activeTab === 'Camera' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'Camera' && styles.activeTabText]}>
            Camera
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Videos' && styles.activeTab]}
          onPress={() => setActiveTab('Videos')}
        >
          <Ionicons 
            name={activeTab === 'Videos' ? 'videocam' : 'videocam-outline'} 
            size={24} 
            color={activeTab === 'Videos' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'Videos' && styles.activeTabText]}>
            Videos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Profile' && styles.activeTab]}
          onPress={() => setActiveTab('Profile')}
        >
          <Ionicons 
            name={activeTab === 'Profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={activeTab === 'Profile' ? '#007AFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'Profile' && styles.activeTabText]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    backgroundColor: '#f0f8ff',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '500',
  },
});