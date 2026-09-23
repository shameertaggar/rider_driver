import { Router, Request, Response } from 'express';
import { UserService } from '../services/user_service.js';

const router = Router();
const userService = new UserService();

// POST /api/users — Register a new user
router.post('/', (req: Request, res: Response) => {
  try {
    const user = userService.registerUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/users — List all users
router.get('/', (_req: Request, res: Response) => {
  const users = userService.getAllUsers();
  res.json({ success: true, data: users });
});

// GET /api/users/:id — Get user by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const user = userService.getUser(req.params.id as string);
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// GET /api/users/:id/rides — Get user ride history
router.get('/:id/rides', (req: Request, res: Response) => {
  try {
    const history = userService.getUserRideHistory(req.params.id as string);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});

export default router;
