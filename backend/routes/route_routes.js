const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const polyline = require('@mapbox/polyline');
const { requireAuth } = require('../middleware/auth');
const routeScoringService = require('../services/route_scoring');


// Accepts: { start: {lat, lng}, destination: {lat, lng} }
// Returns: { routes: [...], riskZones: [...] }
router.post('/suggest', requireAuth, async (req, res) => {
  const { start, destination } = req.body;

  if (
    !start?.lat || !start?.lng ||
    !destination?.lat || !destination?.lng
  ) {
    return res.status(400).json({
      message: 'start.lat, start.lng, destination.lat, destination.lng are all required',
    });
  }

  try {
    // OSRM public server — replace with self-hosted for production.
    // alternatives=true asks for up to 3 routes.
    const osrmUrl =
      `http://router.project-osrm.org/route/v1/driving/` +
      `${start.lng},${start.lat};${destination.lng},${destination.lat}` +
      `?alternatives=true&overview=full&geometries=polyline&steps=false`;

    const response = await axios.get(osrmUrl, { timeout: 10000 });

    if (response.data.code !== 'Ok' || !response.data.routes?.length) {
      return res.status(502).json({ message: 'OSRM returned no routes' });
    }

    const rawRoutes = response.data.routes.map((route, index) => ({
      id: `r${index + 1}`,
      duration: route.duration,   // seconds
      distance: route.distance,   // meters
      polyline: polyline.decode(route.geometry), // [[lat, lng], ...]
    }));

    const scoredRoutes = routeScoringService.scoreRoutes(rawRoutes);

    res.json({
      success: true,
      routes: scoredRoutes,
      riskZones: routeScoringService.getRiskZones(),
    });
  } catch (error) {
    console.error('[ROUTES] suggest error:', error.message);
    res.status(500).json({ message: 'Failed to generate routes' });
  }
});

module.exports = router;
