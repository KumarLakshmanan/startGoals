# Flutter Integration Guide for Zoom & Agora Live Sessions

## 📱 Overview

This guide provides comprehensive instructions for integrating Zoom and Agora live sessions into your Flutter mobile application. The backend API supports both platforms, allowing you to create, join, and manage live streaming sessions seamlessly.

## 🚀 Quick Start

### Prerequisites

- Flutter SDK (3.0+)
- Node.js backend with live session API
- Agora account and credentials
- Zoom account and credentials

### Backend API Base URL
```dart
const String API_BASE_URL = 'http://your-backend-url.com/api';
```

## 📋 Table of Contents

1. [Flutter Dependencies](#flutter-dependencies)
2. [Agora Integration](#agora-integration)
3. [Zoom Integration](#zoom-integration)
4. [API Service Layer](#api-service-layer)
5. [UI Components](#ui-components)
6. [Complete Examples](#complete-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## 📦 Flutter Dependencies

Add these dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP requests
  http: ^1.1.0
  dio: ^5.3.2
  
  # Agora SDK
  agora_rtc_engine: ^6.3.2
  permission_handler: ^11.0.1
  
  # Zoom SDK (if using Zoom)
  zoom_sdk: ^0.0.6
  
  # State management
  provider: ^6.1.1
  # or
  flutter_bloc: ^8.1.3
  
  # UI & Utils
  fluttertoast: ^8.2.4
  loading_animation_widget: ^1.2.0+4
  cached_network_image: ^3.3.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

Run:
```bash
flutter pub get
```

---

## 🎥 Agora Integration

### 1. Agora Service Setup

Create `lib/services/agora_service.dart`:

```dart
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:developer' as developer;

class AgoraService {
  static const String appId = 'YOUR_AGORA_APP_ID';
  
  RtcEngine? _engine;
  bool _isJoined = false;
  int? _remoteUid;
  bool _isMuted = false;
  bool _isVideoEnabled = true;

  // Getters
  bool get isJoined => _isJoined;
  bool get isMuted => _isMuted;
  bool get isVideoEnabled => _isVideoEnabled;
  int? get remoteUid => _remoteUid;

  // Initialize Agora Engine
  Future<void> initializeAgora() async {
    try {
      // Request permissions
      await _requestPermissions();
      
      // Create RTC engine
      _engine = createAgoraRtcEngine();
      
      await _engine!.initialize(RtcEngineContext(
        appId: appId,
        channelProfile: ChannelProfileType.channelProfileCommunication,
      ));

      // Set up event handlers
      _engine!.registerEventHandler(RtcEngineEventHandler(
        onJoinChannelSuccess: (RtcConnection connection, int elapsed) {
          developer.log('Successfully joined channel: ${connection.channelId}');
          _isJoined = true;
        },
        onUserJoined: (RtcConnection connection, int remoteUid, int elapsed) {
          developer.log('Remote user joined: $remoteUid');
          _remoteUid = remoteUid;
        },
        onUserOffline: (RtcConnection connection, int remoteUid, UserOfflineReasonType reason) {
          developer.log('Remote user left: $remoteUid');
          _remoteUid = null;
        },
        onError: (ErrorCodeType err, String msg) {
          developer.log('Agora Error: $err - $msg');
        },
      ));

      // Enable video
      await _engine!.enableVideo();
      await _engine!.enableAudio();
      
    } catch (e) {
      developer.log('Error initializing Agora: $e');
      throw Exception('Failed to initialize Agora: $e');
    }
  }

  // Request necessary permissions
  Future<void> _requestPermissions() async {
    await [Permission.microphone, Permission.camera].request();
  }

  // Join channel with token
  Future<void> joinChannel({
    required String channelName,
    required String token,
    required int userId,
  }) async {
    try {
      if (_engine == null) {
        throw Exception('Agora engine not initialized');
      }

      ChannelMediaOptions options = const ChannelMediaOptions(
        clientRoleType: ClientRoleType.clientRoleBroadcaster,
        channelProfile: ChannelProfileType.channelProfileCommunication,
      );

      await _engine!.joinChannel(
        token: token,
        channelId: channelName,
        uid: userId,
        options: options,
      );
      
    } catch (e) {
      developer.log('Error joining channel: $e');
      throw Exception('Failed to join channel: $e');
    }
  }

  // Leave channel
  Future<void> leaveChannel() async {
    try {
      await _engine?.leaveChannel();
      _isJoined = false;
      _remoteUid = null;
    } catch (e) {
      developer.log('Error leaving channel: $e');
    }
  }

  // Toggle microphone
  Future<void> toggleMicrophone() async {
    try {
      _isMuted = !_isMuted;
      await _engine?.muteLocalAudioStream(_isMuted);
    } catch (e) {
      developer.log('Error toggling microphone: $e');
    }
  }

  // Toggle camera
  Future<void> toggleCamera() async {
    try {
      _isVideoEnabled = !_isVideoEnabled;
      await _engine?.muteLocalVideoStream(!_isVideoEnabled);
    } catch (e) {
      developer.log('Error toggling camera: $e');
    }
  }

  // Switch camera
  Future<void> switchCamera() async {
    try {
      await _engine?.switchCamera();
    } catch (e) {
      developer.log('Error switching camera: $e');
    }
  }

  // Dispose
  Future<void> dispose() async {
    try {
      await leaveChannel();
      await _engine?.release();
      _engine = null;
    } catch (e) {
      developer.log('Error disposing Agora: $e');
    }
  }
}
```

### 2. Agora Live Session Widget

Create `lib/widgets/agora_live_session.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import '../services/agora_service.dart';
import '../services/api_service.dart';

class AgoraLiveSessionWidget extends StatefulWidget {
  final String sessionId;
  final String channelName;
  final int userId;
  final bool isHost;

  const AgoraLiveSessionWidget({
    Key? key,
    required this.sessionId,
    required this.channelName,
    required this.userId,
    required this.isHost,
  }) : super(key: key);

  @override
  State<AgoraLiveSessionWidget> createState() => _AgoraLiveSessionWidgetState();
}

class _AgoraLiveSessionWidgetState extends State<AgoraLiveSessionWidget> {
  final AgoraService _agoraService = AgoraService();
  final ApiService _apiService = ApiService();
  
  bool _isLoading = true;
  String? _error;
  String? _token;

  @override
  void initState() {
    super.initState();
    _initializeSession();
  }

  Future<void> _initializeSession() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      // Initialize Agora
      await _agoraService.initializeAgora();

      // Get token from backend
      final tokenData = await _apiService.getAgoraToken(
        channelName: widget.channelName,
        userId: widget.userId,
        role: widget.isHost ? 'publisher' : 'subscriber',
      );

      _token = tokenData['token'];

      // Join channel
      await _agoraService.joinChannel(
        channelName: widget.channelName,
        token: _token!,
        userId: widget.userId,
      );

      setState(() => _isLoading = false);
      
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Joining session...'),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error, size: 64, color: Colors.red),
              SizedBox(height: 16),
              Text('Error: $_error'),
              SizedBox(height: 16),
              ElevatedButton(
                onPressed: _initializeSession,
                child: Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Live Session'),
        backgroundColor: Colors.blue,
        actions: [
          IconButton(
            onPressed: _agoraService.switchCamera,
            icon: Icon(Icons.cameraswitch),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Video views
          _buildVideoViews(),
          
          // Controls overlay
          _buildControlsOverlay(),
        ],
      ),
    );
  }

  Widget _buildVideoViews() {
    return Stack(
      children: [
        // Remote video (full screen)
        if (_agoraService.remoteUid != null)
          AgoraVideoView(
            controller: VideoViewController.remote(
              rtcEngine: _agoraService._engine!,
              canvas: VideoCanvas(uid: _agoraService.remoteUid),
              connection: RtcConnection(channelId: widget.channelName),
            ),
          ),
        
        // Local video (small overlay)
        Positioned(
          top: 20,
          right: 20,
          width: 120,
          height: 160,
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: _agoraService.isVideoEnabled
                  ? AgoraVideoView(
                      controller: VideoViewController(
                        rtcEngine: _agoraService._engine!,
                        canvas: const VideoCanvas(uid: 0),
                      ),
                    )
                  : Container(
                      color: Colors.black,
                      child: Icon(
                        Icons.videocam_off,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildControlsOverlay() {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: [
              Colors.black.withOpacity(0.8),
              Colors.transparent,
            ],
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            // Microphone toggle
            _buildControlButton(
              icon: _agoraService.isMuted ? Icons.mic_off : Icons.mic,
              onPressed: () async {
                await _agoraService.toggleMicrophone();
                setState(() {});
              },
              backgroundColor: _agoraService.isMuted ? Colors.red : Colors.white,
              iconColor: _agoraService.isMuted ? Colors.white : Colors.black,
            ),
            
            // Camera toggle
            _buildControlButton(
              icon: _agoraService.isVideoEnabled ? Icons.videocam : Icons.videocam_off,
              onPressed: () async {
                await _agoraService.toggleCamera();
                setState(() {});
              },
              backgroundColor: _agoraService.isVideoEnabled ? Colors.white : Colors.red,
              iconColor: _agoraService.isVideoEnabled ? Colors.black : Colors.white,
            ),
            
            // End call
            _buildControlButton(
              icon: Icons.call_end,
              onPressed: () async {
                await _agoraService.leaveChannel();
                Navigator.pop(context);
              },
              backgroundColor: Colors.red,
              iconColor: Colors.white,
            ),
            
            // Raise hand (if student)
            if (!widget.isHost)
              _buildControlButton(
                icon: Icons.pan_tool,
                onPressed: _raiseHand,
                backgroundColor: Colors.orange,
                iconColor: Colors.white,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required VoidCallback onPressed,
    required Color backgroundColor,
    required Color iconColor,
  }) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: backgroundColor,
        shape: BoxShape.circle,
      ),
      child: IconButton(
        onPressed: onPressed,
        icon: Icon(icon, color: iconColor),
      ),
    );
  }

  Future<void> _raiseHand() async {
    try {
      await _apiService.raiseHand(widget.sessionId);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Hand raised!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error raising hand: $e')),
      );
    }
  }

  @override
  void dispose() {
    _agoraService.dispose();
    super.dispose();
  }
}
```

---

## 📹 Zoom Integration

### 1. Zoom Service Setup

Create `lib/services/zoom_service.dart`:

```dart
import 'package:zoom_sdk/zoom_sdk.dart';
import 'dart:developer' as developer;

class ZoomService {
  static const String jwtToken = 'YOUR_ZOOM_JWT_TOKEN';
  
  bool _isInitialized = false;
  bool _isInMeeting = false;

  // Getters
  bool get isInitialized => _isInitialized;
  bool get isInMeeting => _isInMeeting;

  // Initialize Zoom SDK
  Future<void> initializeZoomSDK() async {
    try {
      ZoomOptions zoomOptions = ZoomOptions(
        domain: "zoom.us",
        jwtToken: jwtToken,
      );

      var initResult = await ZoomSdk.initZoom(zoomOptions);
      
      if (initResult[0] == 0) {
        _isInitialized = true;
        developer.log('Zoom SDK initialized successfully');
        
        // Set up event listeners
        ZoomSdk.onMeetingStatus.listen((status) {
          developer.log('Meeting status: $status');
          _isInMeeting = status == "MEETING_STATUS_INMEETING";
        });
        
      } else {
        throw Exception('Failed to initialize Zoom SDK: ${initResult[1]}');
      }
      
    } catch (e) {
      developer.log('Error initializing Zoom SDK: $e');
      throw Exception('Failed to initialize Zoom SDK: $e');
    }
  }

  // Join meeting with meeting ID and password
  Future<void> joinMeeting({
    required String meetingId,
    required String meetingPassword,
    String? displayName,
  }) async {
    try {
      if (!_isInitialized) {
        throw Exception('Zoom SDK not initialized');
      }

      ZoomMeetingOptions meetingOptions = ZoomMeetingOptions(
        userId: displayName ?? 'Flutter User',
        meetingId: meetingId,
        meetingPassword: meetingPassword,
        disableDialIn: "true",
        disableDrive: "true",
        disableInvite: "true",
        disableShare: "true",
        disableTitlebar: "false",
        viewOptions: "true",
        noAudio: "false",
        noDisconnectAudio: "false"
      );

      var joinResult = await ZoomSdk.joinMeeting(meetingOptions);
      
      if (joinResult[0] == 0) {
        developer.log('Successfully joined Zoom meeting');
      } else {
        throw Exception('Failed to join meeting: ${joinResult[1]}');
      }
      
    } catch (e) {
      developer.log('Error joining Zoom meeting: $e');
      throw Exception('Failed to join meeting: $e');
    }
  }

  // Start meeting (for hosts)
  Future<void> startMeeting({
    required String meetingId,
    required String zoomToken,
    required String zoomAccessToken,
    String? displayName,
  }) async {
    try {
      if (!_isInitialized) {
        throw Exception('Zoom SDK not initialized');
      }

      ZoomMeetingOptions meetingOptions = ZoomMeetingOptions(
        userId: displayName ?? 'Host',
        meetingId: meetingId,
        zoomToken: zoomToken,
        zoomAccessToken: zoomAccessToken,
        disableDialIn: "true",
        disableDrive: "true",
        disableInvite: "true",
        disableShare: "true",
        disableTitlebar: "false",
        viewOptions: "true",
        noAudio: "false",
        noDisconnectAudio: "false"
      );

      var startResult = await ZoomSdk.startMeeting(meetingOptions);
      
      if (startResult[0] == 0) {
        developer.log('Successfully started Zoom meeting');
      } else {
        throw Exception('Failed to start meeting: ${startResult[1]}');
      }
      
    } catch (e) {
      developer.log('Error starting Zoom meeting: $e');
      throw Exception('Failed to start meeting: $e');
    }
  }

  // Leave meeting
  Future<void> leaveMeeting() async {
    try {
      await ZoomSdk.leaveMeeting();
      _isInMeeting = false;
      developer.log('Left Zoom meeting');
    } catch (e) {
      developer.log('Error leaving meeting: $e');
    }
  }

  // Clean up
  Future<void> dispose() async {
    try {
      if (_isInMeeting) {
        await leaveMeeting();
      }
      await ZoomSdk.cleanSdk();
      _isInitialized = false;
    } catch (e) {
      developer.log('Error disposing Zoom SDK: $e');
    }
  }
}
```

### 2. Zoom Live Session Widget

Create `lib/widgets/zoom_live_session.dart`:

```dart
import 'package:flutter/material.dart';
import '../services/zoom_service.dart';
import '../services/api_service.dart';

class ZoomLiveSessionWidget extends StatefulWidget {
  final String sessionId;
  final String meetingId;
  final String? meetingPassword;
  final bool isHost;
  final String? displayName;

  const ZoomLiveSessionWidget({
    Key? key,
    required this.sessionId,
    required this.meetingId,
    this.meetingPassword,
    required this.isHost,
    this.displayName,
  }) : super(key: key);

  @override
  State<ZoomLiveSessionWidget> createState() => _ZoomLiveSessionWidgetState();
}

class _ZoomLiveSessionWidgetState extends State<ZoomLiveSessionWidget> {
  final ZoomService _zoomService = ZoomService();
  final ApiService _apiService = ApiService();
  
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initializeSession();
  }

  Future<void> _initializeSession() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      // Initialize Zoom SDK
      await _zoomService.initializeZoomSDK();

      if (widget.isHost) {
        // Get Zoom tokens for host
        final tokenData = await _apiService.getZoomTokens(widget.sessionId);
        
        await _zoomService.startMeeting(
          meetingId: widget.meetingId,
          zoomToken: tokenData['zoomToken'],
          zoomAccessToken: tokenData['zoomAccessToken'],
          displayName: widget.displayName,
        );
      } else {
        // Join as participant
        await _zoomService.joinMeeting(
          meetingId: widget.meetingId,
          meetingPassword: widget.meetingPassword ?? '',
          displayName: widget.displayName,
        );
      }

      setState(() => _isLoading = false);
      
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text('Zoom Session')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Joining Zoom meeting...'),
            ],
          ),
        ),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: Text('Zoom Session')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error, size: 64, color: Colors.red),
              SizedBox(height: 16),
              Text('Error: $_error'),
              SizedBox(height: 16),
              ElevatedButton(
                onPressed: _initializeSession,
                child: Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Zoom Meeting'),
        backgroundColor: Colors.blue,
      ),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        color: Colors.black,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.video_call,
              size: 100,
              color: Colors.white,
            ),
            SizedBox(height: 20),
            Text(
              'Zoom Meeting Active',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 10),
            Text(
              'Meeting ID: ${widget.meetingId}',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 16,
              ),
            ),
            SizedBox(height: 40),
            
            // Control buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                if (!widget.isHost)
                  _buildActionButton(
                    icon: Icons.pan_tool,
                    label: 'Raise Hand',
                    onPressed: _raiseHand,
                    color: Colors.orange,
                  ),
                
                _buildActionButton(
                  icon: Icons.call_end,
                  label: 'Leave',
                  onPressed: () async {
                    await _zoomService.leaveMeeting();
                    Navigator.pop(context);
                  },
                  color: Colors.red,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    required Color color,
  }) {
    return Column(
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
          child: IconButton(
            onPressed: onPressed,
            icon: Icon(icon, color: Colors.white, size: 28),
          ),
        ),
        SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(color: Colors.white, fontSize: 12),
        ),
      ],
    );
  }

  Future<void> _raiseHand() async {
    try {
      await _apiService.raiseHand(widget.sessionId);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Hand raised in session!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error raising hand: $e')),
      );
    }
  }

  @override
  void dispose() {
    _zoomService.dispose();
    super.dispose();
  }
}
```

---

## 🌐 API Service Layer

Create `lib/services/api_service.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;

class ApiService {
  static const String baseUrl = 'http://your-backend-url.com/api';
  String? _authToken;

  // Set authentication token
  void setAuthToken(String token) {
    _authToken = token;
  }

  // Get headers with authentication
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  // Create live session
  Future<Map<String, dynamic>> createLiveSession({
    required String courseId,
    required String batchId,
    required String title,
    required String sessionDate,
    required String startTime,
    required String endTime,
    int? durationMinutes,
    required String platform, // 'agora' or 'zoom'
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/live-sessions/createLiveSession'),
        headers: _headers,
        body: jsonEncode({
          'courseId': courseId,
          'batchId': batchId,
          'title': title,
          'sessionDate': sessionDate,
          'startTime': startTime,
          'endTime': endTime,
          'durationMinutes': durationMinutes,
          'platform': platform,
        }),
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error creating live session: $e');
      throw Exception('Failed to create live session: $e');
    }
  }

  // Get live session details
  Future<Map<String, dynamic>> getLiveSession(String sessionId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/live-sessions/$sessionId'),
        headers: _headers,
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error getting live session: $e');
      throw Exception('Failed to get live session: $e');
    }
  }

  // Start live session
  Future<Map<String, dynamic>> startLiveSession(String sessionId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/live-sessions/$sessionId/start'),
        headers: _headers,
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error starting live session: $e');
      throw Exception('Failed to start live session: $e');
    }
  }

  // End live session
  Future<Map<String, dynamic>> endLiveSession(String sessionId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/live-sessions/$sessionId/end'),
        headers: _headers,
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error ending live session: $e');
      throw Exception('Failed to end live session: $e');
    }
  }

  // Get Agora token
  Future<Map<String, dynamic>> getAgoraToken({
    required String channelName,
    required int userId,
    required String role, // 'publisher' or 'subscriber'
    int expirationTimeInSeconds = 3600,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/live-sessions/agora-token'),
        headers: _headers,
        body: jsonEncode({
          'channelName': channelName,
          'userId': userId,
          'role': role,
          'expirationTimeInSeconds': expirationTimeInSeconds,
        }),
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error getting Agora token: $e');
      throw Exception('Failed to get Agora token: $e');
    }
  }

  // Get Zoom tokens (for hosts)
  Future<Map<String, dynamic>> getZoomTokens(String sessionId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/live-sessions/$sessionId/zoom-tokens'),
        headers: _headers,
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error getting Zoom tokens: $e');
      throw Exception('Failed to get Zoom tokens: $e');
    }
  }

  // Join session as participant
  Future<Map<String, dynamic>> joinSession(String sessionId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/live-sessions/$sessionId/join'),
        headers: _headers,
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error joining session: $e');
      throw Exception('Failed to join session: $e');
    }
  }

  // Leave session
  Future<Map<String, dynamic>> leaveSession(String sessionId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/live-sessions/$sessionId/leave'),
        headers: _headers,
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error leaving session: $e');
      throw Exception('Failed to leave session: $e');
    }
  }

  // Raise hand
  Future<Map<String, dynamic>> raiseHand(String sessionId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/live-sessions/$sessionId/raise-hand'),
        headers: _headers,
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error raising hand: $e');
      throw Exception('Failed to raise hand: $e');
    }
  }

  // Get raised hands
  Future<Map<String, dynamic>> getRaisedHands(String sessionId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/live-sessions/$sessionId/raised-hands'),
        headers: _headers,
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error getting raised hands: $e');
      throw Exception('Failed to get raised hands: $e');
    }
  }

  // Respond to raised hand
  Future<Map<String, dynamic>> respondToRaisedHand({
    required String sessionId,
    required String raisedHandId,
    required String action, // 'accept' or 'reject'
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/live-sessions/$sessionId/raised-hands/$raisedHandId/respond'),
        headers: _headers,
        body: jsonEncode({
          'action': action,
        }),
      );

      return _handleResponse(response);
    } catch (e) {
      developer.log('Error responding to raised hand: $e');
      throw Exception('Failed to respond to raised hand: $e');
    }
  }

  // Handle HTTP response
  Map<String, dynamic> _handleResponse(http.Response response) {
    final Map<String, dynamic> data = jsonDecode(response.body);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else {
      throw Exception(data['message'] ?? 'API request failed');
    }
  }
}
```

---

## 🎨 UI Components

### Live Session List Widget

Create `lib/widgets/live_session_list.dart`:

```dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/live_session.dart';
import 'agora_live_session.dart';
import 'zoom_live_session.dart';

class LiveSessionListWidget extends StatefulWidget {
  final String batchId;

  const LiveSessionListWidget({
    Key? key,
    required this.batchId,
  }) : super(key: key);

  @override
  State<LiveSessionListWidget> createState() => _LiveSessionListWidgetState();
}

class _LiveSessionListWidgetState extends State<LiveSessionListWidget> {
  final ApiService _apiService = ApiService();
  List<LiveSession> _sessions = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSessions();
  }

  Future<void> _loadSessions() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      // Note: You'll need to implement this endpoint in your backend
      final response = await _apiService.getLiveSessionsByBatch(widget.batchId);
      
      _sessions = (response['data'] as List)
          .map((json) => LiveSession.fromJson(json))
          .toList();

      setState(() => _isLoading = false);
      
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error, size: 64, color: Colors.red),
            SizedBox(height: 16),
            Text('Error: $_error'),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadSessions,
              child: Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_sessions.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.video_call_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('No live sessions available'),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: _sessions.length,
      itemBuilder: (context, index) {
        final session = _sessions[index];
        return _buildSessionCard(session);
      },
    );
  }

  Widget _buildSessionCard(LiveSession session) {
    return Card(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: session.platform.toLowerCase() == 'agora' 
              ? Colors.blue 
              : Colors.orange,
          child: Icon(
            Icons.video_call,
            color: Colors.white,
          ),
        ),
        title: Text(
          session.title,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Platform: ${session.platform.toUpperCase()}'),
            Text('Date: ${session.sessionDate}'),
            Text('Time: ${session.startTime} - ${session.endTime}'),
            Text('Status: ${session.status}'),
          ],
        ),
        trailing: _buildJoinButton(session),
        onTap: () => _joinSession(session),
      ),
    );
  }

  Widget _buildJoinButton(LiveSession session) {
    if (session.status != 'active') {
      return Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.grey,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          'Not Active',
          style: TextStyle(color: Colors.white, fontSize: 12),
        ),
      );
    }

    return ElevatedButton(
      onPressed: () => _joinSession(session),
      style: ElevatedButton.styleFrom(
        backgroundColor: session.platform.toLowerCase() == 'agora' 
            ? Colors.blue 
            : Colors.orange,
      ),
      child: Text('Join'),
    );
  }

  Future<void> _joinSession(LiveSession session) async {
    try {
      // Join session via API
      await _apiService.joinSession(session.sessionId);

      // Navigate to appropriate platform widget
      if (session.platform.toLowerCase() == 'agora') {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => AgoraLiveSessionWidget(
              sessionId: session.sessionId,
              channelName: session.platformSessionId,
              userId: 12345, // Get from user session
              isHost: false, // Determine based on user role
            ),
          ),
        );
      } else if (session.platform.toLowerCase() == 'zoom') {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ZoomLiveSessionWidget(
              sessionId: session.sessionId,
              meetingId: session.platformSessionId,
              meetingPassword: session.meetingPassword,
              isHost: false, // Determine based on user role
              displayName: 'Student Name', // Get from user profile
            ),
          ),
        );
      }
      
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error joining session: $e')),
      );
    }
  }
}
```

---

## 📱 Complete Examples

### Main App Entry Point

Update your `lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'screens/live_session_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Live Sessions App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: LiveSessionScreen(),
    );
  }
}
```

### Live Session Screen

Create `lib/screens/live_session_screen.dart`:

```dart
import 'package:flutter/material.dart';
import '../widgets/live_session_list.dart';
import '../services/api_service.dart';

class LiveSessionScreen extends StatefulWidget {
  @override
  State<LiveSessionScreen> createState() => _LiveSessionScreenState();
}

class _LiveSessionScreenState extends State<LiveSessionScreen> {
  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    // Set auth token (get from secure storage or login)
    _apiService.setAuthToken('your-jwt-token-here');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Live Sessions'),
        backgroundColor: Colors.blue,
      ),
      body: LiveSessionListWidget(
        batchId: 'your-batch-id-here', // Get from navigation or state
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _createNewSession,
        child: Icon(Icons.add),
        tooltip: 'Create New Session',
      ),
    );
  }

  Future<void> _createNewSession() async {
    // Navigate to create session screen or show dialog
    showDialog(
      context: context,
      builder: (context) => CreateSessionDialog(),
    );
  }
}

class CreateSessionDialog extends StatefulWidget {
  @override
  State<CreateSessionDialog> createState() => _CreateSessionDialogState();
}

class _CreateSessionDialogState extends State<CreateSessionDialog> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _apiService = ApiService();
  
  String _selectedPlatform = 'agora';
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _startTime = TimeOfDay.now();
  TimeOfDay _endTime = TimeOfDay(hour: TimeOfDay.now().hour + 1, minute: TimeOfDay.now().minute);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Create Live Session'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(labelText: 'Session Title'),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter a title';
                  }
                  return null;
                },
              ),
              SizedBox(height: 16),
              
              DropdownButtonFormField<String>(
                value: _selectedPlatform,
                decoration: InputDecoration(labelText: 'Platform'),
                items: [
                  DropdownMenuItem(value: 'agora', child: Text('Agora')),
                  DropdownMenuItem(value: 'zoom', child: Text('Zoom')),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedPlatform = value!;
                  });
                },
              ),
              SizedBox(height: 16),
              
              ListTile(
                title: Text('Date'),
                subtitle: Text('${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}'),
                trailing: Icon(Icons.calendar_today),
                onTap: _selectDate,
              ),
              
              Row(
                children: [
                  Expanded(
                    child: ListTile(
                      title: Text('Start Time'),
                      subtitle: Text(_startTime.format(context)),
                      onTap: () => _selectTime(true),
                    ),
                  ),
                  Expanded(
                    child: ListTile(
                      title: Text('End Time'),
                      subtitle: Text(_endTime.format(context)),
                      onTap: () => _selectTime(false),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _createSession,
          child: Text('Create'),
        ),
      ],
    );
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(Duration(days: 365)),
    );
    
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _selectTime(bool isStartTime) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStartTime ? _startTime : _endTime,
    );
    
    if (picked != null) {
      setState(() {
        if (isStartTime) {
          _startTime = picked;
        } else {
          _endTime = picked;
        }
      });
    }
  }

  Future<void> _createSession() async {
    if (_formKey.currentState!.validate()) {
      try {
        await _apiService.createLiveSession(
          courseId: 'your-course-id', // Get from state/navigation
          batchId: 'your-batch-id', // Get from state/navigation
          title: _titleController.text,
          sessionDate: '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}',
          startTime: '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}',
          endTime: '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}',
          platform: _selectedPlatform,
        );

        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Session created successfully!')),
        );
        
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error creating session: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }
}
```

### Data Models

Create `lib/models/live_session.dart`:

```dart
class LiveSession {
  final String sessionId;
  final String courseId;
  final String batchId;
  final String title;
  final String meetingLink;
  final String sessionDate;
  final String startTime;
  final String endTime;
  final int durationMinutes;
  final String platform;
  final String platformSessionId;
  final String status;
  final String? meetingPassword;

  LiveSession({
    required this.sessionId,
    required this.courseId,
    required this.batchId,
    required this.title,
    required this.meetingLink,
    required this.sessionDate,
    required this.startTime,
    required this.endTime,
    required this.durationMinutes,
    required this.platform,
    required this.platformSessionId,
    required this.status,
    this.meetingPassword,
  });

  factory LiveSession.fromJson(Map<String, dynamic> json) {
    return LiveSession(
      sessionId: json['sessionId'],
      courseId: json['courseId'],
      batchId: json['batchId'],
      title: json['title'],
      meetingLink: json['meetingLink'],
      sessionDate: json['sessionDate'],
      startTime: json['startTime'],
      endTime: json['endTime'],
      durationMinutes: json['durationMinutes'],
      platform: json['platform'],
      platformSessionId: json['platformSessionId'],
      status: json['status'],
      meetingPassword: json['meetingPassword'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
      'courseId': courseId,
      'batchId': batchId,
      'title': title,
      'meetingLink': meetingLink,
      'sessionDate': sessionDate,
      'startTime': startTime,
      'endTime': endTime,
      'durationMinutes': durationMinutes,
      'platform': platform,
      'platformSessionId': platformSessionId,
      'status': status,
      'meetingPassword': meetingPassword,
    };
  }
}
```

---

## ⚠️ Error Handling

### Error Handler Service

Create `lib/services/error_handler.dart`:

```dart
import 'package:flutter/material.dart';

class ErrorHandler {
  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: Duration(seconds: 3),
      ),
    );
  }

  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: Duration(seconds: 2),
      ),
    );
  }

  static String getReadableError(dynamic error) {
    if (error.toString().contains('SocketException')) {
      return 'No internet connection';
    } else if (error.toString().contains('TimeoutException')) {
      return 'Request timeout. Please try again.';
    } else if (error.toString().contains('FormatException')) {
      return 'Invalid data format';
    } else {
      return 'An unexpected error occurred';
    }
  }
}
```

---

## 🎯 Best Practices

### 1. **State Management**
- Use Provider, Bloc, or Riverpod for complex state management
- Keep platform-specific logic separated
- Handle loading states properly

### 2. **Security**
- Never store sensitive tokens in plain text
- Use secure storage for authentication tokens
- Validate all user inputs

### 3. **Performance**
- Dispose of resources properly (cameras, microphones)
- Handle memory management for video streams
- Implement proper error recovery

### 4. **User Experience**
- Show loading indicators during session joining
- Provide clear error messages
- Implement retry mechanisms

### 5. **Platform Considerations**
- Test on both iOS and Android
- Handle platform-specific permissions
- Consider platform-specific UI guidelines

---

## 📚 Additional Resources

### Backend API Endpoints
Your Node.js backend should implement these endpoints:

```javascript
// Live Session Routes
POST   /api/live-sessions/createLiveSession
GET    /api/live-sessions/:id
POST   /api/live-sessions/:id/start
POST   /api/live-sessions/:id/end
POST   /api/live-sessions/:id/join
POST   /api/live-sessions/:id/leave

// Agora Specific
POST   /api/live-sessions/agora-token

// Zoom Specific  
GET    /api/live-sessions/:id/zoom-tokens

// Raise Hands
POST   /api/live-sessions/:id/raise-hand
GET    /api/live-sessions/:id/raised-hands
POST   /api/live-sessions/:id/raised-hands/:handId/respond
```

### Environment Setup
Create `.env` file in your Flutter project root:

```bash
# API Configuration
API_BASE_URL=http://your-backend-url.com/api

# Agora Configuration
AGORA_APP_ID=your_agora_app_id

# Zoom Configuration (if needed for client)
ZOOM_JWT_TOKEN=your_zoom_jwt_token
```

### Testing
1. **Unit Tests**: Test API service methods
2. **Widget Tests**: Test UI components
3. **Integration Tests**: Test complete user flows

---

## 🚀 Deployment

### Android
1. Add required permissions in `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### iOS
1. Add permissions in `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for voice calls</string>
```

---

## 📞 Support

For issues and questions:
1. Check the backend API documentation
2. Review platform-specific SDK documentation
3. Test with provided examples
4. Check error logs for debugging

---

**Happy Coding! 🎉**

This Flutter integration guide provides everything you need to implement live sessions with both Zoom and Agora platforms. Follow the examples and adapt them to your specific requirements.
