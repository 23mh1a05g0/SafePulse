// NEW FILE
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import '../engine/safepulse_engine.dart';
import '../../../core/repositories/sos_repository.dart';
import '../../../core/services/location_service.dart';
import '../../../core/enums.dart';

class SafePulseProvider extends ChangeNotifier {
  final SOSRepository _sosRepo;
  final LocationService _locationService;
  late final SafePulseEngine _engine;

  SafePulseProvider(this._sosRepo, this._locationService) {
    _engine = SafePulseEngine();
    _subscribeToEngine();
  }

  // State
  EngineState _state = EngineState.idle;
  double _currentSpeed = 0.0;
  int _distractionSeconds = 0;
  final List<LogMessage> _logs = [];
  LogMessage? _lastCriticalLog;

  // Getters
  EngineState get state => _state;
  double get currentSpeed => _currentSpeed;
  int get distractionSeconds => _distractionSeconds;
  List<LogMessage> get logs => List.unmodifiable(_logs);
  LogMessage? get lastCriticalLog => _lastCriticalLog;
  bool get isMonitoring => _state == EngineState.monitoring;
  bool get isProcessing => _state == EngineState.processingSos;

  void initialize() {
    // Sync with background service if running
    _subscribeToBackgroundService();
  }

  void _subscribeToEngine() {
    _engine.stateStream.stream.listen((state) {
      _state = state;
      notifyListeners();
    });

    _engine.speedStream.stream.listen((speed) {
      _currentSpeed = speed;
      notifyListeners();
    });

    _engine.distractionStream.stream.listen((seconds) {
      _distractionSeconds = seconds;
      notifyListeners();
    });

    _engine.logStream.stream.listen((log) {
      _logs.insert(0, log);
      if (log.level == LogLevel.critical) {
        _lastCriticalLog = log;
      }
      notifyListeners();
    });
  }

  void _subscribeToBackgroundService() {
    final service = FlutterBackgroundService();
    
    service.on('state').listen((event) {
      if (event != null) {
        _state = EngineState.values[event['state'] as int];
        notifyListeners();
      }
    });

    service.on('speed').listen((event) {
      if (event != null) {
        _currentSpeed = event['speed'] as double;
        notifyListeners();
      }
    });

    service.on('log').listen((event) {
      if (event != null) {
        final log = LogMessage(
          event['message'] as String,
          level: LogLevel.values[event['level'] as int],
        );
        _logs.insert(0, log);
        if (log.level == LogLevel.critical) _lastCriticalLog = log;
        notifyListeners();
      }
    });
  }

  Future<void> startMonitoring() async {
    await _engine.start();
  }

  Future<void> stopMonitoring() async {
    await _engine.stop();
  }

  Future<void> triggerManualSOS() async {
    final pos = await _locationService.getCurrentPositionSafe();
    if (pos != null) {
      await _sosRepo.startSOS(
        lat: pos.latitude,
        lng: pos.longitude,
        address: "Manual Emergency",
      );
    }
  }

  @override
  void dispose() {
    _engine.dispose();
    super.dispose();
  }
}
