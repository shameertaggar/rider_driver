import { Router, Request, Response } from 'express';
import { RideService } from '../services/ride_service.js';
import {
  HighestRatedDriverMatchingStrategy,
  NearestDriverMatchingStrategy,
  EuclideanDistanceStrategy,
  ManhattanDistanceStrategy,
} from '../strategies/strategiesIndex.js';

const router = Router();
const rideService = new RideService();

// POST /api/rides/book — Book a ride
router.post('/book', (req: Request, res: Response) => {
  try {
    const ride = rideService.bookRide(req.body);
    res.status(201).json({ success: true, data: ride });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/rides/:id/start — Start a ride
router.put('/:id/start', (req: Request, res: Response) => {
  try {
    const ride = rideService.startRide(req.params.id as string);
    res.json({ success: true, data: ride });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/rides/:id/end — End a ride (optionally pass actualEndLocation)
router.put('/:id/end', (req: Request, res: Response) => {
  try {
    const ride = rideService.endRide(req.params.id as string, req.body.actualEndLocation);
    res.json({ success: true, data: ride });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/rides/:id/cancel — Cancel a ride
router.put('/:id/cancel', (req: Request, res: Response) => {
  try {
    const ride = rideService.cancelRide(req.params.id as string, req.body.reason);
    res.json({ success: true, data: ride });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/rides/distance-strategy — Get active distance strategy
router.get('/distance-strategy', (_req: Request, res: Response) => {
  const current = rideService.getDistanceStrategy();
  res.json({
    success: true,
    strategy: current.strategyName,
    availableStrategies: ['EUCLIDEAN', 'MANHATTAN'],
  });
});

// PUT /api/rides/distance-strategy — Switch distance calculation strategy
router.put('/distance-strategy', (req: Request, res: Response) => {
  const { strategy } = req.body;
  if (strategy === 'MANHATTAN') {
    rideService.setDistanceStrategy(new ManhattanDistanceStrategy());
  } else {
    rideService.setDistanceStrategy(new EuclideanDistanceStrategy());
  }
  const current = rideService.getDistanceStrategy();
  res.json({
    success: true,
    message: `Distance calculation strategy set to ${current.strategyName}`,
    strategy: current.strategyName,
  });
});

// POST /api/rides/calculate-distance — Calculate distance between coordinates
router.post('/calculate-distance', (req: Request, res: Response) => {
  try {
    const { from, to, strategy } = req.body;
    if (!from || !to || from.x === undefined || from.y === undefined || to.x === undefined || to.y === undefined) {
      res.status(400).json({ success: false, error: 'Both from {x, y} and to {x, y} coordinates are required' });
      return;
    }
    const result = rideService.calculateDistance(from, to, strategy);
    res.json({
      success: true,
      from,
      to,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/rides/:id — Get ride details
router.get('/:id', (req: Request, res: Response) => {
  try {
    const ride = rideService.getRide(req.params.id as string);
    res.json({ success: true, data: ride });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// PUT /api/rides/strategy — Switch matching strategy
router.put('/strategy', (req: Request, res: Response) => {
  const { strategy } = req.body;
  if (strategy === 'HIGHEST_RATED') {
    rideService.setMatchingStrategy(new HighestRatedDriverMatchingStrategy());
  } else {
    rideService.setMatchingStrategy(new NearestDriverMatchingStrategy());
  }
  res.json({ success: true, message: `Matching strategy set to ${rideService.getMatchingStrategy().strategyName}` });
});

// PUT /api/rides/:id/assign — Assign/accept driver for ride
router.put('/:id/assign', (req: Request, res: Response) => {
  try {
    const { driverId } = req.body;
    if (!driverId) {
      res.status(400).json({ success: false, error: 'driverId is required' });
      return;
    }
    const ride = rideService.assignDriverToRide(req.params.id as string, driverId);
    res.json({ success: true, message: `Driver ${driverId} successfully assigned to ride`, data: ride });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
