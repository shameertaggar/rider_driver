import { Router, Request, Response } from 'express';
import { DriverService } from '../services/driver_service.js';
import { RideService } from '../services/ride_service.js';

const router = Router();
const driverService = new DriverService();
const rideService = new RideService();

// POST /api/drivers — Register a new driver
router.post('/', (req: Request, res: Response) => {
  try {
    const driver = driverService.registerDriver(req.body);
    res.status(201).json({ success: true, data: driver });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/drivers — List all drivers
router.get('/', (_req: Request, res: Response) => {
  const drivers = driverService.getAllDrivers();
  res.json({ success: true, data: drivers });
});

// GET /api/drivers/:id — Get driver by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const driver = driverService.getDriver(req.params.id as string);
    res.json({ success: true, data: driver });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// POST /api/drivers/cab — Register a cab for a driver
router.post('/cab', (req: Request, res: Response) => {
  try {
    const cab = driverService.registerCab(req.body);
    res.status(201).json({ success: true, data: cab });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/drivers/:id/location — Update driver's cab location
router.put('/:id/location', (req: Request, res: Response) => {
  try {
    const { x, y } = req.body;
    driverService.updateDriverLocationByDriverId(req.params.id as string, { x, y });
    res.json({ success: true, message: 'Location updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/drivers/:id/status — Toggle driver availability (AVAILABLE / OFFLINE)
router.put('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    driverService.updateDriverStatus(req.params.id as string, status);
    res.json({ success: true, message: `Driver status updated to ${status}` });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/drivers/:id/rides — Get driver ride history
router.get('/:id/rides', (req: Request, res: Response) => {
  try {
    const history = driverService.getDriverRideHistory(req.params.id as string);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// PUT /api/drivers/:id/cancel-active-ride — Driver cancels current active ride to become available for other rides
router.put('/:id/cancel-active-ride', (req: Request, res: Response) => {
  try {
    const ride = rideService.cancelDriverActiveRide(req.params.id as string, req.body?.reason);
    res.json({ success: true, message: 'Current ride cancelled by driver', data: ride });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
