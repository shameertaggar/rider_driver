import { Router, Request, Response } from 'express';
import { RideService } from '../services/ride_service.js';
import { HighestRatedDriverMatchingStrategy, NearestDriverMatchingStrategy } from '../strategies/index.js';

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

export default router;
