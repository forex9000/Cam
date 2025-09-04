import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { user, token } = useAuth();

  useEffect(() => {
    getPermissions();
  }, []);

  const getPermissions = async () => {
    console.log('🔐 Requesting permissions...');
    
    // Camera permission (handled by hooks)
    if (!cameraPermission?.granted) {
      console.log('📷 Requesting camera permission...');
      const result = await requestCameraPermission();
      console.log('📷 Camera permission result:', result);
    }

    // Microphone permission (handled by hooks)  
    if (!microphonePermission?.granted) {
      console.log('🎤 Requesting microphone permission...');
      const result = await requestMicrophonePermission();
      console.log('🎤 Microphone permission result:', result);
    }
    
    // Location permission
    console.log('📍 Requesting location permission...');
    const locationStatus = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(locationStatus.status === 'granted');
    console.log('📍 Location permission result:', locationStatus.status);

    if (!cameraPermission?.granted) {
      Alert.alert('إذن مطلوب', 'يحتاج التطبيق إذن الكاميرا لتسجيل الفيديو');
    }
    
    if (locationStatus.status !== 'granted') {
      Alert.alert('إذن الموقع', 'إذن الموقع يساعد في إضافة بيانات الموقع للفيديوهات');
    }
  };

  const getDevicePhoneNumber = async () => {
    try {
      // Note: Modern Android/iOS severely restrict phone number access
      // This is a fallback that tries different approaches
      
      // Method 1: User's stored phone (from registration)
      if (user?.phone) {
        return user.phone;
      }

      // Method 2: Device model as identifier (not a phone number but device info)
      const deviceInfo = {
        model: Device.modelName || 'Unknown',
        brand: Device.brand || 'Unknown',
        osVersion: Device.osVersion || 'Unknown'
      };
      
      // For demo purposes, return device info or ask user to update profile
      return `Device: ${deviceInfo.model} (${deviceInfo.brand})`;
      
    } catch (error) {
      console.log('Phone detection failed:', error);
      return user?.phone || 'Phone not detected';
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (!locationPermission) {
        return null;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 1,
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.log('Location error:', error);
      return null;
    }
  };

  const startRecording = async () => {
    console.log('🎬 Attempting to start recording...');
    console.log('📹 Camera permission:', cameraPermission?.granted);
    console.log('🎤 Microphone permission:', microphonePermission?.granted);
    
    if (cameraRef.current && cameraPermission?.granted && microphonePermission?.granted) {
      try {
        console.log('🔴 Starting video recording...');
        setIsRecording(true);
        
        // Use the new API without parameters - options are set on the component
        const video = await cameraRef.current.recordAsync();
        
        console.log('✅ Recording completed:', video);
        
        if (video && video.uri) {
          console.log('📹 Video URI:', video.uri);
          await handleVideoRecorded(video.uri);
        } else {
          console.error('❌ No video URI received');
          Alert.alert('خطأ', 'لم يتم إنشاء الفيديو بشكل صحيح');
        }
      } catch (error) {
        console.error('❌ Recording error:', error);
        Alert.alert('خطأ في التسجيل', `فشل في تسجيل الفيديو: ${error.message}`);
      } finally {
        setIsRecording(false);
      }
    } else {
      if (!cameraPermission?.granted) {
        Alert.alert('خطأ', 'يجب منح إذن الكاميرا لتسجيل الفيديو');
      } else if (!microphonePermission?.granted) {
        Alert.alert('خطأ', 'يجب منح إذن الميكروفون لتسجيل الصوت');
      } else {
        Alert.alert('خطأ', 'لا يمكن الوصول للكاميرا');
      }
      console.error('❌ Missing permissions or camera ref');
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const handleVideoRecorded = async (videoUri: string) => {
    try {
      setUploadingVideo(true);

      // Get location data
      const location = await getCurrentLocation();
      
      // Get phone number
      const phoneNumber = await getDevicePhoneNumber();

      // Convert video to base64
      const response = await fetch(videoUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          
          // Upload to backend
          await uploadVideo({
            video_data: base64Data,
            location_lat: location?.latitude || null,
            location_lng: location?.longitude || null,
            phone_number: phoneNumber,
          });

          Alert.alert(
            'Success!', 
            'Video recorded and uploaded successfully',
            [{ text: 'OK' }]
          );
          
        } catch (error) {
          console.error('Upload error:', error);
          Alert.alert('Upload Error', 'Failed to upload video');
        } finally {
          setUploadingVideo(false);
        }
      };

      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Error processing video:', error);
      Alert.alert('Error', 'Failed to process video');
      setUploadingVideo(false);
    }
  };

  const uploadVideo = async (videoData: any) => {
    const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
    
    const response = await fetch(`${API_BASE_URL}/api/videos/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(videoData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Upload failed');
    }

    return response.json();
  };

  if (cameraPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.permissionText}>Requesting permissions...</Text>
      </View>
    );
  }

  if (!cameraPermission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#ccc" />
        <Text style={styles.permissionText}>No access to camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={getPermissions}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView 
        ref={cameraRef}
        style={styles.camera} 
        facing={type}
        mode="video"
        videoQuality="720p"
      >
        <View style={styles.overlay}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setType(type === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse-outline" size={32} color="white" />
            </TouchableOpacity>
          </View>

          {/* Status Indicators */}
          <View style={styles.statusContainer}>
            {locationPermission ? (
              <View style={styles.statusItem}>
                <Ionicons name="location" size={16} color="#4CAF50" />
                <Text style={styles.statusText}>Location ON</Text>
              </View>
            ) : (
              <View style={styles.statusItem}>
                <Ionicons name="location-outline" size={16} color="#FF9800" />
                <Text style={styles.statusText}>Location OFF</Text>
              </View>
            )}
          </View>

          {/* Recording Indicator */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>REC</Text>
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {uploadingVideo ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.uploadingText}>Uploading video...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordingButton]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <View style={[styles.recordButtonInner, isRecording && styles.recordingButtonInner]} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  permissionText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
    color: '#666',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 10,
  },
  statusContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 80,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 4,
    marginRight: 6,
  },
  recordingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FF4444',
  },
  recordingButton: {
    backgroundColor: '#FF4444',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF4444',
  },
  recordingButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  uploadingContainer: {
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 8,
  },
});