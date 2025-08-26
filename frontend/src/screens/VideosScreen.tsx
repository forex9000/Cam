import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

interface Video {
  id: string;
  timestamp: string;
  location_lat?: number;
  location_lng?: number;
  phone_number?: string;
}

interface VideosScreenProps {
  navigation: any;
}

export default function VideosScreen({ navigation }: VideosScreenProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuth();

  // Fetch videos when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchVideos();
    }, [])
  );

  const fetchVideos = async () => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${API_BASE_URL}/api/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const videosData = await response.json();
        setVideos(videosData.sort((a: Video, b: Video) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      } else {
        throw new Error('Failed to fetch videos');
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      Alert.alert('Error', 'Failed to load videos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVideos();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatLocation = (lat?: number, lng?: number) => {
    if (!lat || !lng) return 'Location not available';
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const handleDeleteVideo = (videoId: string) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteVideo(videoId) },
      ]
    );
  };

  const deleteVideo = async (videoId: string) => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setVideos(videos.filter(video => video.id !== videoId));
        Alert.alert('Success', 'Video deleted successfully');
      } else {
        throw new Error('Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      Alert.alert('Error', 'Failed to delete video');
    }
  };

  const renderVideoItem = ({ item }: { item: Video }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => navigation.navigate('VideoView', { videoId: item.id })}
    >
      <View style={styles.videoHeader}>
        <View style={styles.videoIcon}>
          <Ionicons name="play-circle" size={40} color="#007AFF" />
        </View>
        <View style={styles.videoInfo}>
          <Text style={styles.videoDate}>{formatDate(item.timestamp)}</Text>
          <Text style={styles.videoLocation}>
            {formatLocation(item.location_lat, item.location_lng)}
          </Text>
          {item.phone_number && (
            <Text style={styles.videoPhone}>{item.phone_number}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteVideo(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.videoFooter}>
        <View style={styles.metadataRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.metadataText}>
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
        </View>
        {(item.location_lat && item.location_lng) && (
          <View style={styles.metadataRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.metadataText}>GPS Available</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {videos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Videos Yet</Text>
          <Text style={styles.emptySubtitle}>
            Use the Camera tab to record your first video
          </Text>
          <TouchableOpacity 
            style={styles.recordButton}
            onPress={() => navigation.navigate('Camera')}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.recordButtonText}>Record Video</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>My Videos ({videos.length})</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Ionicons name="refresh-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={videos}
            renderItem={renderVideoItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
              />
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  recordButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  videoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoIcon: {
    marginRight: 16,
  },
  videoInfo: {
    flex: 1,
  },
  videoDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  videoLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  videoPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  videoFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metadataText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
});