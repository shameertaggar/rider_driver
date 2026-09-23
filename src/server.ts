import express from 'express';
import { userRoutes, driverRoutes, rideRoutes, couponRoutes } from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ── API Routes ──
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/coupons', couponRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Ride Hailing API Server running at http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST   /api/users              — Register user`);
  console.log(`  GET    /api/users               — List users`);
  console.log(`  GET    /api/users/:id           — Get user`);
  console.log(`  GET    /api/users/:id/rides     — User ride history`);
  console.log(`  POST   /api/drivers             — Register driver`);
  console.log(`  POST   /api/drivers/cab         — Register cab`);
  console.log(`  PUT    /api/drivers/:id/location — Update location`);
  console.log(`  PUT    /api/drivers/:id/status   — Toggle availability`);
  console.log(`  GET    /api/drivers/:id/rides    — Driver ride history`);
  console.log(`  POST   /api/rides/book           — Book ride`);
  console.log(`  PUT    /api/rides/:id/start      — Start ride`);
  console.log(`  PUT    /api/rides/:id/end        — End ride`);
  console.log(`  PUT    /api/rides/:id/cancel     — Cancel ride`);
  console.log(`  PUT    /api/rides/strategy       — Switch matching strategy`);
  console.log(`  GET    /api/rides/distance-strategy — Get distance strategy`);
  console.log(`  PUT    /api/rides/distance-strategy — Switch distance strategy`);
  console.log(`  POST   /api/rides/calculate-distance — Calculate distance`);
  console.log(`  POST   /api/coupons              — Add coupon`);
  console.log(`  GET    /api/coupons              — List coupons`);
  console.log(`  GET    /api/coupons/:code/validate — Validate coupon`);
  console.log(`  DELETE /api/coupons/:code         — Delete coupon`);
  console.log(`  GET    /health                    — Health check\n`);
});

export default app;
