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
    
    if (!cameraPermission?.granted) {
      console.log('📷 Requesting camera permission...');
      await requestCameraPermission();
    }

    if (!microphonePermission?.granted) {
      console.log('🎤 Requesting microphone permission...');
      await requestMicrophonePermission();
    }
    
    console.log('📍 Requesting location permission...');
    const locationStatus = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(locationStatus.status === 'granted');

    if (!cameraPermission?.granted) {
      Alert.alert('إذن مطلوب', 'يحتاج التطبيق إذن الكاميرا لتسجيل الفيديو');
    }
    
    if (locationStatus.status !== 'granted') {
      Alert.alert('إذن الموقع', 'إذن الموقع يساعد في إضافة بيانات الموقع للفيديوهات');
    }
  };

  const getDevicePhoneNumber = async () => {
    try {
      if (user?.phone) {
        return user.phone;
      }

      const deviceInfo = {
        model: Device.modelName || 'Unknown',
        brand: Device.brand || 'Unknown',
        osVersion: Device.osVersion || 'Unknown'
      };
      
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

  const handleVideoRecorded = async (videoUri: string) => {
    try {
      setUploadingVideo(true);

      const location = await getCurrentLocation();
      const phoneNumber = await getDevicePhoneNumber();

      const response = await fetch(videoUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          
          await uploadVideo({
            video_data: base64Data,
            location_lat: location?.latitude || null,
            location_lng: location?.longitude || null,
            phone_number: phoneNumber,
          });

          Alert.alert('نجح!', 'تم تسجيل ورفع الفيديو بنجاح');
          
        } catch (error) {
          console.error('Upload error:', error);
          Alert.alert('خطأ في الرفع', 'فشل في رفع الفيديو');
        } finally {
          setUploadingVideo(false);
        }
      };

      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Error processing video:', error);
      Alert.alert('خطأ', 'فشل في معالجة الفيديو');
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

  const startRecording = async () => {
    console.log('🎬 === START RECORDING FUNCTION CALLED ===');
    
    if (!cameraPermission?.granted) {
      Alert.alert('خطأ', 'يجب منح إذن الكاميرا أولاً');
      return;
    }
    
    if (!microphonePermission?.granted) {
      Alert.alert('خطأ', 'يجب منح إذن الميكروفون أولاً');
      return;
    }
    
    if (!cameraRef.current) {
      Alert.alert('خطأ', 'الكاميرا غير جاهزة');
      return;
    }

    try {
      console.log('🔴 Setting recording state to true...');
      setIsRecording(true);
      
      console.log('🎥 Calling recordAsync...');
      const video = await cameraRef.current.recordAsync();
      
      console.log('✅ Recording completed successfully!');
      
      if (video?.uri) {
        console.log('🎯 Video URI exists:', video.uri);
        await handleVideoRecorded(video.uri);
      } else {
        Alert.alert('خطأ', 'لم يتم إنشاء ملف الفيديو');
      }
      
    } catch (error) {
      console.log('❌ Recording error:', error);
      Alert.alert('خطأ', `فشل التسجيل: ${error.message}`);
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  // Test button handler
  const handleTestPress = () => {
    console.log('🔵 TEST BUTTON PRESSED SUCCESSFULLY!');
    Alert.alert('اختبار', 'الزر يعمل بشكل مثالي! 🎉');
  };

  if (cameraPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>طلب الأذونات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!cameraPermission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="camera-outline" size={64} color="#ccc" />
          <Text style={styles.permissionText}>لا يمكن الوصول للكاميرا</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={getPermissions}>
            <Text style={styles.permissionButtonText}>منح الأذونات</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera} 
          facing={type}
          mode="video"
        />
        
        {/* Camera Overlay */}
        <View style={styles.overlay}>
          {/* Flip Camera Button */}
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setType(type === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse-outline" size={28} color="white" />
          </TouchableOpacity>

          {/* Recording Indicator */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>تسجيل</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom Controls - Outside Camera */}
      <View style={styles.controlsSection}>
        {uploadingVideo ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#FF4444" />
            <Text style={styles.uploadingText}>جاري رفع الفيديو...</Text>
          </View>
        ) : (
          <>
            {/* Test Button */}
            <TouchableOpacity 
              style={styles.testButton}
              onPress={handleTestPress}
            >
              <Text style={styles.testButtonText}>اختبار الزر</Text>
            </TouchableOpacity>
            
            {/* Record Button */}
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordingActive]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
            </TouchableOpacity>
            
            {/* Status Text */}
            <Text style={styles.statusText}>
              {isRecording ? 'اضغط لإيقاف التسجيل' : 'اضغط لبدء التسجيل'}
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bottomControlsExternal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 30,
    paddingHorizontal: 20,
    zIndex: 1000,
    elevation: 1000,
  },
  controlsContainer: {
    alignItems: 'center',
    gap: 15,
    zIndex: 1001,
    elevation: 1001,
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
    zIndex: 1002,
    elevation: 1002,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#FF4444',
    elevation: 1003,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 1003,
  },
  recordingButton: {
    backgroundColor: '#FF4444',
    borderColor: 'white',
  },
  recordButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF4444',
  },
  recordingButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  uploadingContainer: {
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
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
  recordButtonContainer: {
    alignItems: 'center',
    gap: 20,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#FF4444',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  recordingButton: {
    backgroundColor: '#FF4444',
  },
  recordButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF4444',
  },
  recordingButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  uploadingContainer: {
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});