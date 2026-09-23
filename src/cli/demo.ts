import { UserService } from '../services/user_service.js';
import { DriverService } from '../services/driver_service.js';
import { RideService } from '../services/ride_service.js';
import { CouponService } from '../services/coupon_service.js';
import { InMemoryStore } from '../db/in_memory_store.js';
import { CarType, DiscountType } from '../models/modelsIndex.js';
import { HighestRatedDriverMatchingStrategy } from '../strategies/matching/rating_driver.js';

// ── Helpers ──
const LINE = '═'.repeat(70);
const DASH = '─'.repeat(70);

function header(num: number, title: string) {
  console.log(`\n${LINE}`);
  console.log(`  🚀 SCENARIO ${num}: ${title}`);
  console.log(LINE);
}

function section(text: string) {
  console.log(`\n  ${DASH}`);
  console.log(`  ${text}`);
  console.log(`  ${DASH}`);
}

function ok(msg: string) { console.log(`  ✅ ${msg}`); }
function info(msg: string) { console.log(`     ${msg}`); }

// ── Main Demo ──
async function run() {
  console.log(`\n${'█'.repeat(70)}`);
  console.log(`${'█'.repeat(10)}   UBER-LIKE RIDE HAILING SERVICE — LIVE DEMO   ${'█'.repeat(11)}`);
  console.log(`${'█'.repeat(70)}\n`);

  // Fresh DB
  InMemoryStore.getInstance().clearAll();

  const userSvc = new UserService();
  const driverSvc = new DriverService();
  const couponSvc = new CouponService();
  const rideSvc = new RideService();

  // ──────────────────────────────────────────────────
  // SCENARIO 1 — Registration & Setup
  // ──────────────────────────────────────────────────
  header(1, 'User & Driver Registration + Cab Setup');

  const alice = userSvc.registerUser({ id: 'u1', name: 'Alice', phone: '+91-9876543210' });
  const bob = userSvc.registerUser({ id: 'u2', name: 'Bob', phone: '+91-9876543211' });
  ok(`Registered Users: ${alice.name}, ${bob.name}`);

  driverSvc.registerDriver({ id: 'd1', name: 'Dave', rating: 4.6 });
  driverSvc.registerCab({
    id: 'cab1', driverId: 'd1', carType: CarType.HATCHBACK,
    licensePlate: 'KA-01-HB-1001', initialLocation: { x: 1, y: 1 },
  });

  driverSvc.registerDriver({ id: 'd2', name: 'Dan', rating: 4.9 });
  driverSvc.registerCab({
    id: 'cab2', driverId: 'd2', carType: CarType.SEDAN,
    licensePlate: 'KA-01-SD-2002', initialLocation: { x: 2, y: 2 },
  });

  driverSvc.registerDriver({ id: 'd3', name: 'Farhan', rating: 5.0 });
  driverSvc.registerCab({
    id: 'cab3', driverId: 'd3', carType: CarType.HATCHBACK,
    licensePlate: 'KA-01-HB-3003', initialLocation: { x: 20, y: 20 },
  });

  ok('Registered 3 Drivers:');
  info('Dave   → Hatchback @ (1,1)  rating 4.6');
  info('Dan    → Sedan     @ (2,2)  rating 4.9');
  info('Farhan → Hatchback @ (20,20) rating 5.0');

  couponSvc.addCoupon({ code: 'WELCOME20', discountType: DiscountType.PERCENTAGE, discountValue: 20, maxDiscount: 50, isActive: true });
  couponSvc.addCoupon({ code: 'FLAT15', discountType: DiscountType.FLAT, discountValue: 15, isActive: true });
  couponSvc.addCoupon({ code: 'EXPIRED10', discountType: DiscountType.PERCENTAGE, discountValue: 10, expiryDate: new Date(Date.now() - 100000), isActive: true });
  ok('Coupons created: WELCOME20 (20% max ₹50), FLAT15 (₹15 flat), EXPIRED10 (expired)');

  // ──────────────────────────────────────────────────
  // SCENARIO 2 — Standard Ride with Tiered Pricing + Coupon
  // ──────────────────────────────────────────────────
  header(2, 'Standard 10 km Ride with Tiered Pricing + Coupon');

  info('Alice books Hatchback: pickup (0,0) → drop (6,8) = 10 km, coupon WELCOME20');
  const ride1 = rideSvc.bookRide({
    userId: 'u1', pickupLocation: { x: 0, y: 0 }, dropLocation: { x: 6, y: 8 },
    requestedCarType: CarType.HATCHBACK, couponCode: 'WELCOME20',
  });
  ok(`Ride booked! ID: ${ride1.id}`);
  info(`Matched driver: Dave (d1), Car: ${ride1.assignedCarType}`);

  rideSvc.startRide(ride1.id);
  ok('Ride started.');

  const done1 = rideSvc.endRide(ride1.id);
  ok('Ride completed. Fare breakdown:');
  const fb = done1.fareBreakdown!;
  for (const t of fb.tieredBreakdown) {
    info(`  ${t.tierName}: ${t.distanceKm} km × ₹${t.ratePerKm}/km = ₹${t.subtotal}`);
  }
  info(`  Raw tiered fare:     ₹${fb.rawTieredFare}`);
  info(`  Car multiplier (${done1.billedCarType}): ${fb.carTypeMultiplier}x → ₹${fb.fareAfterCarMultiplier}`);
  info(`  Coupon ${fb.couponCode}:     -₹${fb.discountAmount}`);
  info(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  info(`  💰 FINAL FARE:        ₹${fb.finalFare}`);

  // ──────────────────────────────────────────────────
  // SCENARIO 3 — Minimum Fare Enforcement
  // ──────────────────────────────────────────────────
  header(3, 'Minimum Fare Enforcement (short ride < 2 km)');

  info('Bob books a 0.8 km ride');
  const ride2 = rideSvc.bookRide({
    userId: 'u2', pickupLocation: { x: 6, y: 8 }, dropLocation: { x: 6.8, y: 8 },
    requestedCarType: CarType.HATCHBACK,
  });
  rideSvc.startRide(ride2.id);
  const done2 = rideSvc.endRide(ride2.id);
  ok('Ride completed.');
  info(`  Distance:      ${done2.distanceKm} km`);
  info(`  Raw fare:      ₹${done2.fareBreakdown?.rawTieredFare}`);
  info(`  Min fare:      ₹${done2.fareBreakdown?.minimumFare}`);
  info(`  💰 FINAL FARE: ₹${done2.fareBreakdown?.finalFare}  (minimum enforced)`);

  // ──────────────────────────────────────────────────
  // SCENARIO 4 — No Drivers Within Radius
  // ──────────────────────────────────────────────────
  header(4, 'No Drivers Within Radius');

  info('Bob books at (100,100) with 5 km radius → no drivers nearby');
  try {
    rideSvc.bookRide({
      userId: 'u2', pickupLocation: { x: 100, y: 100 }, dropLocation: { x: 105, y: 100 },
      requestedCarType: CarType.HATCHBACK, maxRadiusKm: 5,
    });
  } catch (err: any) {
    ok(`Handled gracefully: "${err.message}"`);
  }

  // ──────────────────────────────────────────────────
  // SCENARIO 5 — Free Upgrade: Hatchback → Sedan
  // ──────────────────────────────────────────────────
  header(5, 'Free Upgrade: Hatchback Unavailable → Sedan at Hatchback Rate');

  info('Alice requests HATCHBACK near (2,2) within 3 km radius');
  info('Dave (Hatchback) is at (6.8,8) → out of range. Only Dan (Sedan) at (2,2) is within radius');

  const ride3 = rideSvc.bookRide({
    userId: 'u1', pickupLocation: { x: 2, y: 2 }, dropLocation: { x: 8, y: 10 },
    requestedCarType: CarType.HATCHBACK, maxRadiusKm: 3,
  });
  ok('Ride booked with FREE UPGRADE!');
  info(`  Requested: ${ride3.requestedCarType}`);
  info(`  Assigned:  ${ride3.assignedCarType}  ← upgraded`);
  info(`  Billed as: ${ride3.billedCarType}  ← Hatchback rate preserved!`);
  info(`  Upgraded:  ${ride3.isUpgraded}`);

  rideSvc.startRide(ride3.id);
  const done3 = rideSvc.endRide(ride3.id);
  info(`  💰 FINAL FARE: ₹${done3.fareBreakdown?.finalFare} (at ${done3.billedCarType} 1.0x rate, NOT Sedan 1.2x)`);

  // ──────────────────────────────────────────────────
  // SCENARIO 6 — Invalid / Expired Coupon
  // ──────────────────────────────────────────────────
  header(6, 'Invalid / Expired Coupon');

  info('Bob tries booking with expired coupon EXPIRED10');
  try {
    rideSvc.bookRide({
      userId: 'u2', pickupLocation: { x: 8, y: 10 }, dropLocation: { x: 10, y: 10 },
      requestedCarType: CarType.SEDAN, couponCode: 'EXPIRED10',
    });
  } catch (err: any) {
    ok(`Handled gracefully: "${err.message}"`);
  }

  info('Bob tries booking with non-existent coupon FAKECODE');
  try {
    rideSvc.bookRide({
      userId: 'u2', pickupLocation: { x: 8, y: 10 }, dropLocation: { x: 10, y: 10 },
      requestedCarType: CarType.SEDAN, couponCode: 'FAKECODE',
    });
  } catch (err: any) {
    ok(`Handled gracefully: "${err.message}"`);
  }

  // ──────────────────────────────────────────────────
  // SCENARIO 7 — User & Driver Ride Histories
  // ──────────────────────────────────────────────────
  header(7, 'Ride Histories (User & Driver)');

  const aliceHistory = userSvc.getUserRideHistory('u1');
  ok(`Alice's rides: ${aliceHistory.completed.length} completed, ${aliceHistory.ongoing.length} ongoing`);
  for (const r of aliceHistory.all) {
    info(`  ${r.id} | ${r.status} | ${r.assignedCarType} | ₹${r.fareBreakdown?.finalFare ?? 'pending'}`);
  }

  section('Driver Dan ride history:');
  const danHistory = driverSvc.getDriverRideHistory('d2');
  ok(`Dan's rides: ${danHistory.completed.length} completed, ${danHistory.ongoing.length} ongoing`);
  for (const r of danHistory.all) {
    info(`  ${r.id} | ${r.status} | fare ₹${r.fareBreakdown?.finalFare ?? 'pending'}`);
  }

  // ──────────────────────────────────────────────────
  // SCENARIO 8 — Switchable Matching Strategy
  // ──────────────────────────────────────────────────
  header(8, 'Pluggable Matching Strategy (Nearest → Highest-Rated)');

  ok(`Current strategy: ${rideSvc.getMatchingStrategy().strategyName}`);
  rideSvc.setMatchingStrategy(new HighestRatedDriverMatchingStrategy());
  ok(`Switched to:      ${rideSvc.getMatchingStrategy().strategyName}`);
  info('No code changes needed — Strategy Pattern in action!');

  // ──────────────────────────────────────────────────
  // DONE
  // ──────────────────────────────────────────────────
  console.log(`\n${LINE}`);
  console.log(`         ✅  ALL 8 DEMO SCENARIOS COMPLETED SUCCESSFULLY`);
  console.log(`${LINE}\n`);
}

run().catch(console.error);
