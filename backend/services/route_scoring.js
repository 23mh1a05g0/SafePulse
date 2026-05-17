// ---------------------------------------------------------------------------
// Risk zone dataset
// Each zone has a center (lat, lng), radius in meters, and a severity 0–100.
// Replace / extend this array with data from your crime/incident source.
// ---------------------------------------------------------------------------
const RISK_ZONES = [
  // Format: { lat, lng, radiusM, severity, label }
  { lat: 17.3616, lng: 78.4747, radiusM: 800,  severity: 75, label: 'High incident area' },
  { lat: 17.3850, lng: 78.4867, radiusM: 900,  severity: 85, label: 'Reported unsafe zone' }, // Hyderabad High
  { lat: 16.5060, lng: 80.6480, radiusM: 1000, severity: 55, label: 'Low-light area' },       // Vijayawada Medium
  { lat: 17.3500, lng: 78.5100, radiusM: 1000, severity: 80, label: 'Frequent snatching'  },
  { lat: 17.4100, lng: 78.4600, radiusM: 500,  severity: 40, label: 'Low light area'       },
  { lat: 17.3700, lng: 78.5300, radiusM: 700,  severity: 65, label: 'Past incidents logged'},
];

/**
 * Haversine distance in meters between two lat/lng points.
 */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute a risk score (0–100) for a single coordinate.
 */
function pointRiskScore(lat, lng) {
  let maxScore = 0;
  for (const zone of RISK_ZONES) {
    const dist = haversineMeters(lat, lng, zone.lat, zone.lng);
    if (dist <= zone.radiusM) {
      // Severity scales linearly from zone.severity at center to 0 at edge.
      const proximity = 1 - dist / zone.radiusM;
      const contribution = zone.severity * proximity;
      if (contribution > maxScore) maxScore = contribution;
    }
  }
  return maxScore;
}

/**
 * Sample N evenly-spaced points from the route polyline and average their risk scores.
 * More samples = more accuracy, more CPU. 20 is a good balance.
 */
function routeRiskScore(polylinePoints, samples = 20) {
  if (!polylinePoints || polylinePoints.length === 0) return 0;

  const step = Math.max(1, Math.floor(polylinePoints.length / samples));
  let totalRisk = 0;
  let count = 0;

  for (let i = 0; i < polylinePoints.length; i += step) {
    const [lat, lng] = polylinePoints[i];
    totalRisk += pointRiskScore(lat, lng);
    count++;
  }

  return Math.round(totalRisk / count);
}

/**
 * Assign a type label and color to a risk score.
 */
function riskLabel(score) {
  if (score <= 30) return { type: 'SAFEST',   color: 'green',  label: 'Safest'   };
  if (score <= 65) return { type: 'BALANCED', color: 'yellow', label: 'Balanced' };
  return               { type: 'RISKY',    color: 'red',    label: 'Risky'    };
}

/**
 * Main export: accepts raw OSRM routes, returns scored and sorted routes.
 * Sorted: safest first.
 */
function scoreRoutes(routes) {
  const scored = routes.map(route => {
    const score = routeRiskScore(route.polyline);
    const { type, color, label } = riskLabel(score);
    return {
      ...route,
      riskScore: score,
      type,
      color,
      label,
    };
  });

  // Sort: lowest risk first
  scored.sort((a, b) => a.riskScore - b.riskScore);

  // If fewer than 3 routes from OSRM (some roads only return 1), pad with
  // synthetic variants to always give the user a choice.
  while (scored.length < 3) {
    const base = scored[scored.length - 1];
    const syntheticScore = Math.min(100, base.riskScore + 20 + Math.floor(Math.random() * 15));
    const { type, color, label } = riskLabel(syntheticScore);
    scored.push({
      id: `r${scored.length + 1}`,
      duration: base.duration * (1 - 0.08 * (3 - scored.length)), // faster but riskier
      distance: base.distance * (1 - 0.06 * (3 - scored.length)),
      polyline: base.polyline,
      riskScore: syntheticScore,
      type,
      color,
      label,
    });
  }

  return scored.slice(0, 3);
}


function getRiskZones() {
  return RISK_ZONES.map(z => ({
    lat: z.lat,
    lng: z.lng,
    radiusM: z.radiusM,
    severity: z.severity,
    label: z.label,
  }));
}

module.exports = { scoreRoutes, getRiskZones, pointRiskScore };
