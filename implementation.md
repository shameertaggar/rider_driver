# Implementation Plan: Ride Hailing Service Backend

A modular, extensible ride-hailing backend system (like Uber) meeting all mandatory and bonus requirements. The design features a decoupled **In-Memory Database layer housed in a dedicated `db/` folder**, clean domain modeling, strategy patterns for pricing and driver matching, automated tests, and interactive demo scripts.

## Tech Stack
- **Runtime**: Node.js (v22)
- **Language**: TypeScript (using `tsx` for direct, high-performance execution without build overhead)
- **Testing Framework**: `vitest` (fast, native ESM and TypeScript testing)
- **Architecture**: Domain-Driven Layering (Models -> DB Repositories -> Strategies -> Services -> CLI/Demo)

---

## Architecture Overview

```
rider_driver/
├── src/
│   ├── db/                          # <--- Dedicated In-Memory DB Folder
│   │   ├── in_memory_store.ts       # Central in-memory storage (maps for users, drivers, cabs, rides, coupons)
│   │   ├── base_repository.ts       # Generic base repository interface & locking primitives
│   │   ├── user_repository.ts       # User persistence & query operations
│   │   ├── driver_repository.ts     # Driver & Cab location, status & search operations
│   │   ├── ride_repository.ts       # Ride state, history & atomic transaction updates
│   │   └── coupon_repository.ts     # Coupon storage, usage tracking & validation
│   ├── models/                      # Domain Entities & Types
│   │   ├── user.ts                  # User entity
│   │   ├── driver.ts                # Driver & Cab entities (location: {lat, lon} or {x, y})
│   │   ├── car_type.ts              # CarType enum (HATCHBACK, SEDAN, extensible to SUV)
│   │   ├── ride.ts                  # Ride status (REQUESTED, ONGOING, COMPLETED, CANCELLED)
│   │   ├── location.ts              # Coordinate modeling & Euclidean / Haversine distance calculator
│   │   └── coupon.ts                # Coupon entity (PERCENTAGE, FLAT, expiry, min fare)
│   ├── strategies/
│   │   ├── pricing/                 # Strategy Pattern for Pricing
│   │   │   ├── pricing_strategy.ts  # PricingStrategy interface
│   │   │   ├── tiered_pricing.ts    # Tiered pricing engine: Min ₹50, 0-2km ₹10/km, 3-5km ₹8/km, 6km+ ₹5/km
│   │   │   └── surge_pricing.ts     # Pluggable surge multiplier (Demand / Supply based)
│   │   └── matching/                # Strategy Pattern for Driver Matching
│   │       ├── matching_strategy.ts # DriverMatchingStrategy interface
│   │       ├── nearest_driver.ts    # Nearest available driver within radius
│   │       └── rating_driver.ts     # Highest-rated driver within radius (Bonus)
│   ├── services/                    # Application Business Logic
│   │   ├── user_service.ts          # User registration & history
│   │   ├── driver_service.ts        # Driver registration, cab registration & location updates
│   │   ├── ride_service.ts          # Booking, matching, free upgrade logic, ride start/end, cancellation
│   │   └── coupon_service.ts        # Coupon creation, deletion, validation
│   ├── cli/                         # Interactive CLI & Demo Runner
│   │   └── demo.ts                  # End-to-end interactive demo script covering all edge cases
│   └── index.ts                     # Main entrypoint
├── tests/
│   ├── pricing.test.ts              # Tiers, minimum fare, car rates, free upgrade, coupons
│   ├── matching.test.ts             # Radius filtering, nearest vs highest-rated, free upgrade fallback
│   ├── ride_lifecycle.test.ts       # Booking -> Ongoing -> Completed / Cancelled flows & histories
│   └── concurrency.test.ts          # Race condition tests (two riders booking same driver simultaneously)
├── package.json
├── tsconfig.json
├── implementation.md
└── README.md                        # Deliverable: assumptions, design decisions, trade-offs, AI note
```

---

## Phased Implementation Roadmap (90-Minute Target)

### Phase 1: Foundation & DB Folder Setup (~20 mins)
- Initialize Node.js project with TypeScript, `vitest`, `tsx`, and script configs.
- Setup `src/models/` for User, Driver, Cab, CarType, Location, Ride, and Coupon.
- Implement `src/db/`:
  - `in_memory_store.ts`: Storage tables with reset and indexing capability.
  - Repositories (`user_repository.ts`, `driver_repository.ts`, `ride_repository.ts`, `coupon_repository.ts`).
  - Concurrency locks (atomic acquire/release to prevent driver double-booking).
- **Git Commit**: `feat(core): setup domain models and in-memory repository layer`

### Phase 2: Pricing Engine & Matching Strategies (~25 mins)
- Implement `src/strategies/pricing/`:
  - Tiered rate calculator:
    - Base minimum ₹50
    - Tier 1: 0 - 2 km @ ₹10/km
    - Tier 2: 2 - 5 km @ ₹8/km
    - Tier 3: 5+ km @ ₹5/km
  - Car type multipliers (e.g., Hatchback 1.0x, Sedan 1.5x) or car-specific rate tables.
  - Coupon application (percentage discount / flat discount, respecting minimum fare).
  - Surge pricing multiplier plugin.
- Implement `src/strategies/matching/`:
  - Radius-filtered matching.
  - Nearest Driver strategy.
  - Highest-rated Driver strategy (pluggable without touching booking logic).
- Implement Hatchback-to-Sedan free upgrade logic:
  - If requested car type is Hatchback and no Hatchback is available within radius, find available Sedan within radius.
  - Rate is frozen at the Hatchback rate (`billedCarType = HATCHBACK`, `assignedCarType = SEDAN`).
- **Automated Tests**: Write `pricing.test.ts` and `matching.test.ts`.
- **Git Commit**: `feat(pricing-matching): implement tiered pricing, car upgrades, and pluggable matching strategies`

### Phase 3: Services & Ride Lifecycle Workflows (~20 mins)
- Implement `UserService`: registration, profile retrieval, user ride history (ongoing & completed).
- Implement `DriverService`: registration, cab linking, location updates, availability toggle, driver ride history (ongoing & completed).
- Implement `RideService`:
  - `bookRide(userId, pickupLocation, dropLocation, carType, couponCode?)`: matching + lock acquisition + upgrade fallback.
  - `startRide(rideId)`: marks ongoing.
  - `endRide(rideId, endLocation?)`: computes total distance, calculates tiered fare with discounts, updates driver location & frees driver, saves ride history.
  - `cancelRide(rideId, reason)`: checks cancellation fee policy (bonus), frees driver.
- Implement `CouponService`: add coupon, delete coupon, validate coupon.
- **Automated Tests**: Write `ride_lifecycle.test.ts` and `concurrency.test.ts`.
- **Git Commit**: `feat(services): implement ride lifecycle, cancellation, and concurrency safe booking`

### Phase 4: Interactive Demo & CLI (~15 mins)
- Build `src/cli/demo.ts` with rich console outputs (clean tables, colorized status):
  - Scenario 1: User & Driver registration + Cab location updates.
  - Scenario 2: Standard ride with tiered pricing (> 6 km) and minimum fare ride (< 2 km).
  - Scenario 3: Coupon code applied (valid vs invalid/expired).
  - Scenario 4: No driver within radius error handling.
  - Scenario 5: **Hatchback unavailable -> Free upgrade to Sedan at Hatchback rates**.
  - Scenario 6: **Concurrency race condition** (2 users attempt to book the single available driver at the same time).
  - Scenario 7: Driver & User ride history display (ongoing & completed).
  - Scenario 8: Pluggable matching strategy switch (Nearest vs Highest-Rated).
- **Git Commit**: `feat(cli): add comprehensive interactive demo runner for live evaluation`

### Phase 5: Verification, Documentation & Demo Prep (~10 mins)
- Run full test suite with 100% pass rate.
- Write non-negotiable `README.md` covering:
  - Assumptions (coordinate system, tier math, coupon rules).
  - Key design decisions & architectural patterns (Repository, Strategy, Service-DAO separation).
  - What would be done differently with more time (persistent DB, geospatial indexes like H3/R-Tree, WebSockets for live driver location).
  - Note on AI usage (prompting approach, review, modifications).
  - **Live Extension Prep**: Step-by-step notes on how to add an SUV car type or a flat-discount coupon in < 2 minutes during the interview demo.
- Final git commit and review.

---

## Verification Plan

### Automated Tests
- `npm test` runs `vitest`:
  1. `pricing.test.ts`:
     - Minimum fare check (short distance under ₹50).
     - Tiered calculation (e.g. 1 km = ₹50, 4 km = ₹36 -> ₹50 min, 10 km = 20 + 24 + 25 = ₹69).
     - Car type rates (Hatchback vs Sedan).
     - Free upgrade: Sedan assigned, billed at Hatchback rate.
     - Coupon discounts: Percentage with cap, Flat discount, Invalid coupon rejection.
  2. `matching.test.ts`:
     - Available drivers outside radius are excluded.
     - Nearest driver selected when multiple in radius.
     - Strategy switch to Highest-Rated driver.
  3. `ride_lifecycle.test.ts`:
     - Full lifecycle: Book -> Start -> End -> Cost verified.
     - Ride history segregated into ongoing and completed.
     - Cancellation fee policy.
  4. `concurrency.test.ts`:
     - Simultaneous booking calls for 1 driver: 1 succeeds, 1 receives no driver available.

### Manual Verification
- Execute `npm run demo` to visually verify the 8 demo scenarios in the terminal.
