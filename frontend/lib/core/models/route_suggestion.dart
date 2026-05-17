// NEW FILE
import 'package:flutter/foundation.dart';

class RouteSuggestion {
  final String type;
  final String color;
  final String riskScore;
  final double duration;
  final double distance;
  final List<List<double>> polyline;

  RouteSuggestion({
    required this.type,
    required this.color,
    required this.riskScore,
    required this.duration,
    required this.distance,
    required this.polyline,
  });

  factory RouteSuggestion.fromJson(Map<String, dynamic> json) {
    return RouteSuggestion(
      type: json['type'] ?? 'Unknown',
      color: json['color'] ?? 'blue',
      riskScore: json['riskScore']?.toString() ?? 'N/A',
      duration: (json['duration'] as num?)?.toDouble() ?? 0.0,
      distance: (json['distance'] as num?)?.toDouble() ?? 0.0,
      polyline: (json['polyline'] as List?)
          ?.map((e) => (e as List).map((v) => (v as num).toDouble()).toList())
          .toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'color': color,
      'riskScore': riskScore,
      'duration': duration,
      'distance': distance,
      'polyline': polyline,
    };
  }

  RouteSuggestion copyWith({
    String? type,
    String? color,
    String? riskScore,
    double? duration,
    double? distance,
    List<List<double>>? polyline,
  }) {
    return RouteSuggestion(
      type: type ?? this.type,
      color: color ?? this.color,
      riskScore: riskScore ?? this.riskScore,
      duration: duration ?? this.duration,
      distance: distance ?? this.distance,
      polyline: polyline ?? this.polyline,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is RouteSuggestion &&
        other.type == type &&
        other.color == color &&
        other.riskScore == riskScore &&
        other.duration == duration &&
        other.distance == distance &&
        listEquals(other.polyline, polyline);
  }

  @override
  int get hashCode =>
      type.hashCode ^
      color.hashCode ^
      riskScore.hashCode ^
      duration.hashCode ^
      distance.hashCode ^
      polyline.hashCode;
}
