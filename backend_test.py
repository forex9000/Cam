#!/usr/bin/env python3
"""
Backend API Testing for Video Recording App
Tests authentication system and video management APIs
"""

import requests
import json
import base64
import os
from datetime import datetime
import sys

# Load environment variables
def load_env_file(file_path):
    env_vars = {}
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"\'')
                    env_vars[key] = value
    except FileNotFoundError:
        print(f"Environment file {file_path} not found")
    return env_vars

# Load frontend environment to get backend URL
frontend_env = load_env_file('/app/frontend/.env')
BACKEND_URL = frontend_env.get('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')
API_BASE_URL = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE_URL}")

class VideoRecordingAPITest:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.user_data = {
            "email": "sarah.johnson@example.com",
            "password": "SecurePass2024!",
            "phone": "+1-555-0123"
        }
        self.video_id = None
        
    def test_register(self):
        """Test user registration"""
        print("\n=== Testing User Registration ===")
        
        url = f"{API_BASE_URL}/register"
        payload = {
            "email": self.user_data["email"],
            "password": self.user_data["password"],
            "phone": self.user_data["phone"]
        }
        
        try:
            response = self.session.post(url, json=payload)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "token_type" in data:
                    self.access_token = data["access_token"]
                    print("✅ Registration successful - JWT token received")
                    return True
                else:
                    print("❌ Registration failed - No token in response")
                    return False
            elif response.status_code == 400 and "already registered" in response.text:
                print("⚠️  User already exists, proceeding to login test")
                return True
            else:
                print(f"❌ Registration failed with status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Registration request failed: {str(e)}")
            return False
    
    def test_login(self):
        """Test user login"""
        print("\n=== Testing User Login ===")
        
        url = f"{API_BASE_URL}/login"
        payload = {
            "email": self.user_data["email"],
            "password": self.user_data["password"]
        }
        
        try:
            response = self.session.post(url, json=payload)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "token_type" in data:
                    self.access_token = data["access_token"]
                    print("✅ Login successful - JWT token received")
                    return True
                else:
                    print("❌ Login failed - No token in response")
                    return False
            else:
                print(f"❌ Login failed with status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Login request failed: {str(e)}")
            return False
    
    def test_get_user_info(self):
        """Test getting current user info with JWT"""
        print("\n=== Testing Get User Info (/me) ===")
        
        if not self.access_token:
            print("❌ No access token available")
            return False
            
        url = f"{API_BASE_URL}/me"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = self.session.get(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if "email" in data and data["email"] == self.user_data["email"]:
                    print("✅ User info retrieved successfully")
                    print(f"   Email: {data.get('email')}")
                    print(f"   Phone: {data.get('phone')}")
                    print(f"   ID: {data.get('id')}")
                    return True
                else:
                    print("❌ User info mismatch")
                    return False
            else:
                print(f"❌ Get user info failed with status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Get user info request failed: {str(e)}")
            return False
    
    def test_upload_video(self):
        """Test video upload with base64 data"""
        print("\n=== Testing Video Upload ===")
        
        if not self.access_token:
            print("❌ No access token available")
            return False
            
        # Create sample base64 video data (simulated)
        sample_video_content = "This is a sample video content for testing purposes"
        video_base64 = base64.b64encode(sample_video_content.encode()).decode()
        
        url = f"{API_BASE_URL}/videos/upload"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        payload = {
            "video_data": video_base64,
            "location_lat": 37.7749,  # San Francisco coordinates
            "location_lng": -122.4194,
            "phone_number": "+1-555-0987"
        }
        
        try:
            response = self.session.post(url, json=payload, headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if "video_id" in data:
                    self.video_id = data["video_id"]
                    print("✅ Video upload successful")
                    print(f"   Video ID: {self.video_id}")
                    return True
                else:
                    print("❌ Video upload failed - No video_id in response")
                    return False
            else:
                print(f"❌ Video upload failed with status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Video upload request failed: {str(e)}")
            return False
    
    def test_list_videos(self):
        """Test listing user's videos"""
        print("\n=== Testing List Videos ===")
        
        if not self.access_token:
            print("❌ No access token available")
            return False
            
        url = f"{API_BASE_URL}/videos"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = self.session.get(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                videos = response.json()
                if isinstance(videos, list):
                    print(f"✅ Videos list retrieved successfully - {len(videos)} videos found")
                    
                    # Check if our uploaded video is in the list
                    if self.video_id:
                        video_found = any(video.get("id") == self.video_id for video in videos)
                        if video_found:
                            print(f"✅ Uploaded video found in list")
                        else:
                            print(f"⚠️  Uploaded video not found in list")
                    
                    # Display video metadata (should not include full video_data)
                    for i, video in enumerate(videos[:3]):  # Show first 3 videos
                        print(f"   Video {i+1}: ID={video.get('id')}, Timestamp={video.get('timestamp')}")
                        print(f"             Location=({video.get('location_lat')}, {video.get('location_lng')})")
                        # Verify video_data is not included for performance
                        if "video_data" in video:
                            print(f"⚠️  Warning: video_data included in list (performance issue)")
                    
                    return True
                else:
                    print("❌ Invalid response format - expected list")
                    return False
            else:
                print(f"❌ List videos failed with status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ List videos request failed: {str(e)}")
            return False
    
    def test_get_specific_video(self):
        """Test getting specific video by ID"""
        print("\n=== Testing Get Specific Video ===")
        
        if not self.access_token:
            print("❌ No access token available")
            return False
            
        if not self.video_id:
            print("❌ No video ID available")
            return False
            
        url = f"{API_BASE_URL}/videos/{self.video_id}"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = self.session.get(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                video = response.json()
                if video.get("id") == self.video_id:
                    print("✅ Specific video retrieved successfully")
                    print(f"   Video ID: {video.get('id')}")
                    print(f"   Timestamp: {video.get('timestamp')}")
                    print(f"   Location: ({video.get('location_lat')}, {video.get('location_lng')})")
                    print(f"   Phone: {video.get('phone_number')}")
                    
                    # Verify full video data is included
                    if "video_data" in video:
                        print(f"✅ Full video data included (length: {len(video['video_data'])} chars)")
                    else:
                        print(f"❌ Video data missing from specific video response")
                    
                    return True
                else:
                    print("❌ Video ID mismatch")
                    return False
            elif response.status_code == 404:
                print("❌ Video not found")
                return False
            else:
                print(f"❌ Get specific video failed with status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Get specific video request failed: {str(e)}")
            return False
    
    def test_delete_video(self):
        """Test deleting specific video"""
        print("\n=== Testing Delete Video ===")
        
        if not self.access_token:
            print("❌ No access token available")
            return False
            
        if not self.video_id:
            print("❌ No video ID available")
            return False
            
        url = f"{API_BASE_URL}/videos/{self.video_id}"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = self.session.delete(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    print("✅ Video deleted successfully")
                    return True
                else:
                    print("❌ Delete response missing message")
                    return False
            elif response.status_code == 404:
                print("❌ Video not found for deletion")
                return False
            else:
                print(f"❌ Delete video failed with status {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Delete video request failed: {str(e)}")
            return False
    
    def test_verify_video_deleted(self):
        """Verify video is removed from list after deletion"""
        print("\n=== Verifying Video Deletion ===")
        
        if not self.access_token:
            print("❌ No access token available")
            return False
            
        url = f"{API_BASE_URL}/videos"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            response = self.session.get(url, headers=headers)
            
            if response.status_code == 200:
                videos = response.json()
                if isinstance(videos, list):
                    # Check if our deleted video is still in the list
                    if self.video_id:
                        video_found = any(video.get("id") == self.video_id for video in videos)
                        if not video_found:
                            print(f"✅ Video successfully removed from list")
                            return True
                        else:
                            print(f"❌ Deleted video still appears in list")
                            return False
                    else:
                        print("⚠️  No video ID to verify deletion")
                        return True
                else:
                    print("❌ Invalid response format")
                    return False
            else:
                print(f"❌ Failed to get videos list for verification")
                return False
                
        except Exception as e:
            print(f"❌ Verification request failed: {str(e)}")
            return False

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Video Recording App Backend API Tests")
        print(f"Backend URL: {API_BASE_URL}")
        
        test_results = {}
        
        # Test authentication flow
        test_results['register'] = self.test_register()
        test_results['login'] = self.test_login()
        test_results['get_user_info'] = self.test_get_user_info()
        
        # Test video management flow
        test_results['upload_video'] = self.test_upload_video()
        test_results['list_videos'] = self.test_list_videos()
        test_results['get_specific_video'] = self.test_get_specific_video()
        test_results['delete_video'] = self.test_delete_video()
        test_results['verify_deletion'] = self.test_verify_video_deleted()
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Please check the issues above.")
            return False

if __name__ == "__main__":
    tester = VideoRecordingAPITest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)