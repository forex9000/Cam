import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface VideoData {
  id: string;
  video_data: string;
  timestamp: string;
  location_lat?: number;
  location_lng?: number;
  phone_number?: string;
}

interface VideoViewScreenProps {
  route: any;
}

export default function VideoViewScreen({ route }: VideoViewScreenProps) {
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const { videoId } = route.params;

  useEffect(() => {
    fetchVideo();
  }, []);

  const fetchVideo = async () => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const video = await response.json();
        setVideoData(video);
      } else {
        throw new Error('Failed to fetch video');
      }
    } catch (error) {
      console.error('Error fetching video:', error);
      Alert.alert('Error', 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLocation = (lat?: number, lng?: number) => {
    if (!lat || !lng) return 'Location not available';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const openInMaps = (lat?: number, lng?: number) => {
    if (!lat || !lng) {
      Alert.alert('No Location', 'Location data is not available for this video');
      return;
    }
    
    // This would open the location in maps app
    Alert.alert(
      'Location',
      `Latitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}`,
      [
        { text: 'OK' }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!videoData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF4444" />
          <Text style={styles.errorText}>Video not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Video Player */}
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: videoData.video_data }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
          />
        </View>

        {/* Video Metadata */}
        <View style={styles.metadataContainer}>
          <Text style={styles.sectionTitle}>Video Information</Text>
          
          <View style={styles.metadataCard}>
            <View style={styles.metadataRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <View style={styles.metadataContent}>
                <Text style={styles.metadataLabel}>Recorded</Text>
                <Text style={styles.metadataValue}>{formatDate(videoData.timestamp)}</Text>
              </View>
            </View>

            <View style={styles.metadataRow}>
              <Ionicons 
                name={videoData.location_lat ? "location" : "location-outline"} 
                size={20} 
                color={videoData.location_lat ? "#4CAF50" : "#666"} 
              />
              <View style={styles.metadataContent}>
                <Text style={styles.metadataLabel}>Location</Text>
                <Text style={styles.metadataValue}>
                  {formatLocation(videoData.location_lat, videoData.location_lng)}
                </Text>
                {videoData.location_lat && videoData.location_lng && (
                  <Text 
                    style={styles.linkText}
                    onPress={() => openInMaps(videoData.location_lat, videoData.location_lng)}
                  >
                    View on map
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.metadataRow}>
              <Ionicons 
                name={videoData.phone_number ? "call" : "call-outline"} 
                size={20} 
                color={videoData.phone_number ? "#4CAF50" : "#666"} 
              />
              <View style={styles.metadataContent}>
                <Text style={styles.metadataLabel}>Device/Phone</Text>
                <Text style={styles.metadataValue}>
                  {videoData.phone_number || 'Not available'}
                </Text>
              </View>
            </View>
          </View>

          {/* Technical Info */}
          <View style={styles.technicalInfo}>
            <Text style={styles.sectionTitle}>Technical Details</Text>
            <View style={styles.techRow}>
              <Text style={styles.techLabel}>Video ID:</Text>
              <Text style={styles.techValue}>{videoData.id}</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techLabel}>Format:</Text>
              <Text style={styles.techValue}>MP4 (Base64 encoded)</Text>
            </View>
            <View style={styles.techRow}>
              <Text style={styles.techLabel}>Storage:</Text>
              <Text style={styles.techValue}>Local Database</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  scrollContainer: {
    padding: 16,
  },
  videoContainer: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  video: {
    width: width - 32,
    height: (width - 32) * 0.75, // 4:3 aspect ratio
  },
  metadataContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  metadataCard: {
    marginBottom: 24,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metadataContent: {
    flex: 1,
    marginLeft: 16,
  },
  metadataLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  technicalInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  techRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  techLabel: {
    fontSize: 14,
    color: '#666',
  },
  techValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
});