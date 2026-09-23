import { Router, Request, Response } from 'express';
import { CouponService } from '../services/coupon_service.js';

const router = Router();
const couponService = new CouponService();

// POST /api/coupons — Add a coupon
router.post('/', (req: Request, res: Response) => {
  try {
    const coupon = couponService.addCoupon(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/coupons — List all coupons
router.get('/', (_req: Request, res: Response) => {
  const coupons = couponService.getAllCoupons();
  res.json({ success: true, data: coupons });
});

// GET /api/coupons/:code — Get coupon by code
router.get('/:code', (req: Request, res: Response) => {
  const coupon = couponService.getCoupon(req.params.code as string);
  if (!coupon) {
    res.status(404).json({ success: false, error: `Coupon '${req.params.code}' not found` });
    return;
  }
  res.json({ success: true, data: coupon });
});

// GET /api/coupons/:code/validate — Validate a coupon
router.get('/:code/validate', (req: Request, res: Response) => {
  const result = couponService.validateCoupon(req.params.code as string);
  res.json({ success: true, data: result });
});

// DELETE /api/coupons/:code — Delete a coupon
router.delete('/:code', (req: Request, res: Response) => {
  const deleted = couponService.deleteCoupon(req.params.code as string);
  if (!deleted) {
    res.status(404).json({ success: false, error: `Coupon '${req.params.code}' not found` });
    return;
  }
  res.json({ success: true, message: 'Coupon deleted' });
});

export default router;
