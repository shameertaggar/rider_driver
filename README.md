# Ride Hailing Service Backend (Uber-like)

A production-grade, extensible backend for a ride-hailing platform built in TypeScript / Node.js. Features modular architecture, pluggable strategy patterns (Distance, Driver Matching, Pricing), concurrency-safe booking, coupons, and comprehensive edge-case handling verified with 94 automated tests.

---

## Quickstart

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
git clone https://github.com/shameertaggar/rider_driver.git
cd rider_driver
npm install
```

### Run Automated Tests (94 Tests Across 6 Suites)
```bash
npm test
```

### Run Live Interactive CLI Demo (All 8 Assignment Scenarios)
```bash
npm run demo
```

### Start REST API Server (Port 3000)
```bash
npm start
# or for live development with watch mode:
npm run dev
```

---

## Postman API Collection

To test all endpoints with Postman:
1. Open **Postman**.
2. Click **Import** (top left).
3. Select the file [`postman_collection.json`](./postman_collection.json) located in the root of this repository.
4. The collection is pre-configured with the collection variable `baseUrl = http://localhost:3000`.
5. Start the server with `npm start`, and execute any request from the 7 organized folders:
   - **0. System Health**: `GET /health`
   - **1. User Management**: Register User, Get User, Get All Users, User Ride History
   - **2. Driver & Cab Management**: Register Driver, Register Cab, Update Location, Update Status, Driver Ride History, Driver Cancel Active Ride
   - **3. Distance Strategy**: Get Distance Strategy, Set Strategy (`EUCLIDEAN` / `MANHATTAN`), Calculate Distance between any two points
   - **4. Matching Strategy**: Get Matching Strategy, Set Strategy (`NEAREST_DRIVER` / `HIGHEST_RATED_DRIVER`)
   - **5. Coupon Management**: Create Flat/Percentage Coupon, Get Coupon, List Coupons, Delete Coupon
   - **6. Ride Lifecycle**: Book Ride, Assign Driver to Ride, Start Ride, End Ride (with fare breakdown), Cancel Ride, Get Ride Details

---

## Application Features

### 1. User & Driver Management
- **Rider Registration**: Register users with unique IDs, names, emails, and phone numbers. Includes strict validation against empty/whitespace names.
- **Driver & Cab Onboarding**: Register drivers with initial ratings, link cabs with vehicle license plates, car types (`HATCHBACK`, `SEDAN`, `SUV`), and initial GPS coordinates.
- **Real-Time Location Tracking**: Continuously update cab coordinates on-demand, even while the driver is `ON_TRIP`.
- **Automatic Cab Relocation**: Upon ride completion, the driver’s cab location automatically relocates to the drop-off coordinates.

### 2. Strategy Patterns (Extensible & Runtime Switchable)
- **Pluggable Distance Calculation**:
  - `EuclideanDistanceStrategy`: Computes straight-line distance: $\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$.
  - `ManhattanDistanceStrategy`: Computes city-block distance: $|x_2-x_1| + |y_2-y_1|$.
  - Switchable at runtime via API (`PUT /api/rides/distance-strategy`) and dedicated calculation endpoint (`POST /api/rides/calculate-distance`).
- **Pluggable Driver Matching**:
  - `NearestDriverMatchingStrategy`: Dispatches the geographically closest available driver within the radius.
  - `HighestRatedDriverMatchingStrategy`: Dispatches the highest-rated driver within the radius (ties broken by distance).
  - Switchable dynamically via API (`PUT /api/rides/matching-strategy`).

### 3. Smart Vehicle Dispatch & Upgrades
- **Free Sedan Upgrade**: If a rider requests a `HATCHBACK` but none are available within the search radius, the system automatically upgrades the rider to a `SEDAN` while billing them at the lower `HATCHBACK` rate (`isUpgraded = true`).
- **Strict Downgrade Prevention**: If a rider requests a `SEDAN`, the system will **never** assign a `HATCHBACK`, returning an informative error if no Sedans are found.

### 4. Tiered & Surge Pricing Engine
- **Continuous Distance Tiers**:
  - 0–2 km @ ₹10/km
  - 2–5 km @ ₹8/km
  - 5+ km @ ₹5/km
- **Minimum Fare Floor**: Guarantees a minimum fare of **₹50** (`Math.max(minFare, calculatedFare)`).
- **Car-Type Multipliers**: `HATCHBACK` (1.0x), `SEDAN` (1.2x/1.5x), `SUV` (2.0x).
- **Demand/Supply Surge Pricing**: Area-based surge calculator applying up to 2.0x multiplier based on active rider demand vs. available drivers.

### 5. Coupon & Promotions Engine
- **Dual Discount Modes**: Supports `FLAT` currency deductions (e.g. ₹20 off) and `PERCENTAGE` discounts (e.g. 20% off) with optional `maxDiscount` caps.
- **Threshold & Expiry Validation**: Enforces optional `minRideFare` eligibility, expiration dates, and maximum `usageLimit` tracking.
- **Integrity Validation**: Rejects duplicate codes, negative discounts, percentages $>100\%$, and deleted/inactive coupons.

### 6. Ride Lifecycle & Integrity Constraints
- **Single Active Ride per Rider**: Riders cannot book a second ride while an existing ride is `REQUESTED` or `ONGOING`.
- **Single Active Ride per Driver**: Drivers cannot be double-booked or assigned to multiple trips simultaneously.
- **Driver Availability Guard**: A driver cannot set their status to `AVAILABLE` without completing or cancelling their active ride (`PUT /api/drivers/:id/cancel-active-ride`).
- **Cancellation Policy**: ₹0 fee if cancelled while `REQUESTED`; ₹30 fee if cancelled after starting (`ONGOING`).

### 7. Concurrency Safety (Bonus)
- **Atomic Driver Locks**: Single-process atomic mutex locks (`acquireDriverLock` / `releaseDriverLock`) prevent race conditions when two users attempt to book the exact same driver simultaneously.

### 8. Ride History & Audit Trail
- Separate ride history queries for Riders (`GET /api/users/:id/rides`) and Drivers (`GET /api/drivers/:id/rides`), segmented into `ongoing`, `completed`, and `all` rides.

### 9. Dual User Interfaces
- **Interactive CLI Demo**: Run `npm run demo` to watch an automated 8-scenario live walkthrough in the terminal.
- **RESTful API**: 18+ endpoints serving JSON responses with full error handling.

---

## 1. Assumptions

### 1.1 Spatial Coordinates & Distance Calculation
* **Cartesian 2D vs. Geographic Coordinates**: Supported a 2D Cartesian grid $(x, y)$ in kilometers for deterministic CLI/demo testing, while also supporting geographic coordinates (`latitude`, `longitude`) with boundary validation ($[-90, 90]$ and $[-180, 180]$).
* **Pluggable Distance Metrics**: Distance is not hardcoded to Euclidean straight-line distance; the **Strategy Pattern** provides both `EuclideanDistanceStrategy` (straight-line) and `ManhattanDistanceStrategy` (grid/city block routing), switchable at runtime.
* **Radius Inclusivity**: A driver whose distance is exactly on the radius boundary (`distance == maxRadiusKm`) is assumed to be **included** within the search radius (`dist <= maxRadiusKm`).
* **Default Search Radius**: Assumed to be **5.0 km** if not specified by the rider in the booking request.

### 1.2 User & Driver Lifecycle & Constraints
* **Single Active Ride per Rider**: A rider is **not allowed to book a new ride** if they already have an active ride (`REQUESTED` or `ONGOING`). They must complete or cancel their current ride first.
* **Single Active Ride per Driver**: A driver can only be assigned to **one active ride at a time**.
* **Driver Availability Guard**: A driver currently on a trip cannot manually set their status back to `AVAILABLE` without completing or cancelling their active ride.
* **Driver Location Updates on Trip**: GPS location updates continue in real-time even when a driver is `ON_TRIP`.
* **Automatic Drop-off Relocation**: When a ride completes, the driver’s cab location automatically updates to the ride's destination drop-off coordinates.
* **1:1 Driver-Cab Association**: Each driver is assumed to operate exactly one cab at any given time.

### 1.3 Pricing & Fare Calculation
* **Minimum Fare is a Floor, Not an Additive Fee**:
  * The prompt specifies: *"Minimum ride price — ₹50, First 2 km at ₹10/km, 3-5 km at ₹8/km..."*
  * Minimum fare operates as a **floor** (`Math.max(minFare, calculatedFare)`). If the distance calculation yields less than ₹50 (e.g. ₹15 for 1.5 km), the rider is billed ₹50.
* **Tier Continuity**: Assumed continuous distance intervals:
  * 0–2 km (Tier 1)
  * 2–5 km (Tier 2)
  * 5+ km (Tier 3)
* **Car-Type Multipliers**:
  * Hatchback multiplier is **1.0x** (base rate).
  * Sedan multiplier is **1.2x** (or 1.5x configurable).
  * Extensible to SUV (**2.0x**).
* **Free Upgrade Billing Rule**:
  * When a Hatchback is requested and unavailable, the rider gets a Sedan, but `billedCarType` remains **`HATCHBACK`**. The rider is strictly billed at the 1.0x Hatchback rate.
* **Strict Downgrade Prevention**: If a rider requests a Sedan and no Sedan is available, the system will **never** downgrade them to a Hatchback (it returns no driver available).
* **Order of Pricing Operations**:
  $$\text{Final Fare} = \max\Big(0, \; \max\big(\text{MinFare}, \; (\text{TieredFare} \times \text{CarMultiplier} \times \text{Surge})\big) - \text{Discount}\Big)$$

### 1.4 Coupon Rules & Lifecycle
* **Discount Types**: Supported both `FLAT` (fixed ₹ deduction) and `PERCENTAGE` (% deduction with optional `maxDiscount` cap).
* **Minimum Ride Fare for Coupon**: Coupons can optionally specify `minRideFare` (e.g., must be $\ge$ ₹100 before discount applies).
* **Usage Limits & Expiration**: Coupons track `usedCount` against an optional `usageLimit` and check `expiryDate`.
* **Discount Range Constraints**: Percentage discounts cannot exceed 100% and discounts cannot be negative.
* **Coupon Uniqueness**: Coupon codes are case-insensitive, trimmed, and must be unique.

### 1.5 Bonus Requirements
* **Cancellation Fee Policy**:
  * **₹0 fee** if cancelled while still in `REQUESTED` status (driver hasn't started trip).
  * **₹30 fee** if cancelled after the ride has been marked `ONGOING`.
  * In both cases, the driver’s status is immediately freed back to `AVAILABLE`.
* **Surge Pricing Formula**:
  * Pluggable calculator based on area demand/supply ratio:
    * $\text{ratio} < 1.0 \implies 1.0\times$ (normal)
    * $1.0 \le \text{ratio} < 1.5 \implies 1.2\times$
    * $1.5 \le \text{ratio} < 2.0 \implies 1.5\times$
    * $\text{ratio} \ge 2.0 \implies 2.0\times$
* **Concurrency Locking**:
  * Implemented atomic in-memory mutex locks (`acquireDriverLock` / `releaseDriverLock`) on driver IDs to guarantee that if two riders click "Book" for the exact same driver at the same millisecond, exactly one ride succeeds and the other receives a graceful retry error.

---

## 2. Key Design Decisions & Trade-offs

### Key Design Decisions
1. **Driver Matching Strategy (Strategy Pattern)**:
   * Pluggable matching algorithms (`NearestDriverMatchingStrategy`, `HighestRatedDriverMatchingStrategy`).
   * Switchable dynamically at runtime without modifying booking logic.
2. **Distance Calculation Strategy (Strategy Pattern)**:
   * Supports `EuclideanDistanceStrategy` and `ManhattanDistanceStrategy`.
   * Switchable via REST API (`PUT /api/rides/distance-strategy`) and CLI.
3. **Tiered Pricing Strategy (Strategy Pattern)**:
   * Decoupled pricing rules, surge multiplier, minimum fare floor, car multipliers, and coupon deductions into a dedicated pricing engine with configurable runtime tiers.
4. **Clean Layered Architecture**:
   * **Models** (`src/models/`): Individual single-responsibility model files (`userModel`, `driverModel`, `cabModel`, `rideModel`, `couponModel`, `locationModel`, `carModel`).
   * **Repositories** (`src/db/`): Data access abstraction over in-memory store.
   * **Services** (`src/services/`): Pure business logic and workflow orchestration.
   * **Routes / Controllers** (`src/routes/`): Express REST API handlers.
   * **Strategies** (`src/strategies/`): Encapsulated algorithmic behaviors.

### Trade-offs & Rationale

| # | Design Decision | Benefits | Trade-off / Downside | Production Alternative |
|---|-----------------|----------|----------------------|------------------------|
| **1** | **In-Memory Singleton Store** vs. Persistent Database | Zero infrastructure overhead; 94 tests run in <1s; clean test isolation with `clearAll()`. | Data is volatile (lost on restart); cannot scale horizontally across multiple instances. | PostgreSQL / MySQL with Prisma ORM, Redis for caching. |
| **2** | **In-Memory Mutex Lock** vs. Distributed Locking | Leverages Node.js single-threaded event loop for zero-latency atomic locks; satisfies concurrency bonus without external daemons. | Only locks within a single Node.js process; does not protect across multi-replica clusters. | Redis Redlock or SQL row-level locks (`SELECT ... FOR UPDATE`). |
| **3** | **Strategy Pattern** vs. Hardcoded If-Else | High extensibility; adheres to Open/Closed Principle; dynamic runtime switching; isolated unit testability. | Additional interfaces and classes compared to inline procedural code. | Maintain Strategy Pattern; wire via Dependency Injection container (e.g. InversifyJS). |
| **4** | **Linear Scan ($O(N)$)** vs. Geospatial Indexing | Zero native C-bindings; trivial maintenance; sub-millisecond execution for thousands of drivers. | High CPU overhead when scanning millions of drivers globally. | Uber H3 Hexagonal Hierarchical Spatial Index or PostGIS R-Tree. |
| **5** | **Deterministic Algorithmic Distance** vs. Road Network Routing | Zero external API latency, zero rate-limiting, deterministic unit tests, offline CLI demo reliability. | Does not account for one-way roads, traffic congestion, or turn restrictions. | Google Maps Distance Matrix API or OSRM / Valhalla. |
| **6** | **Coupon Validation at Booking** vs. Final Fare Deduction at Completion | Validates code upfront before driver is dispatched; allows dynamic percentage/distance calculation upon drop-off. | If a coupon expires mid-ride, it is honored because it was validated at booking time. | Configurable grace periods or re-validation at ride completion. |
| **7** | **Synchronous REST API** vs. Event-Driven Asynchronous Dispatch | Simple mental model; easy to test with Postman/cURL; straightforward request/response cycles. | Real-world dispatching needs bi-directional streaming and asynchronous driver acceptance timeouts. | WebSockets for GPS streaming; Apache Kafka / RabbitMQ for dispatch queues. |

---

## 3. What I Would Do Differently With More Time

1. **Microservices Decomposition**:
   * Split the monolithic service into specialized microservices:
     * *Rider Service* (User profile & ride history)
     * *Driver & Fleet Service* (Driver status, cab tracking)
     * *Matching & Dispatch Service* (Spatial queries, strategy execution)
     * *Pricing & Billing Service* (Fare calculation, surge, invoices)
     * *Promotion Service* (Coupons, campaigns, discounts)
2. **Polyglot Persistence (SQL + NoSQL)**:
   * PostgreSQL for relational ACID data (users, drivers, rides, billing transactions).
   * MongoDB / Cassandra for immutable ride logs, audit trails, and ride status history.
3. **Redis Caching & Spatial Indexing**:
   * Redis `GEOADD` and `GEORADIUS` for lightning-fast spatial queries.
   * Redis for active driver lock management and session caching.
4. **Payment Gateway Integration**:
   * Integrate Stripe / Razorpay for automated wallet deductions, card payments, and refunds.
5. **API Rate Limiting & Throttling**:
   * Implement token bucket rate limiters (e.g. `express-rate-limit` with Redis store) to mitigate DDoS and booking spam.
6. **Authentication & Authorization**:
   * JWT-based authentication with Role-Based Access Control (`RIDER`, `DRIVER`, `ADMIN`).
7. **Thread-Safe Distributed Concurrency**:
   * Implement distributed Redlock across Redis clusters to guarantee zero double-booking in a multi-pod Kubernetes deployment.
8. **Event-Driven Architecture (EDA)**:
   * Use Apache Kafka or RabbitMQ for asynchronous event publishing:
     * `RideRequestedEvent` $\rightarrow$ broadcasted to nearby drivers via WebSockets.
     * `RideAcceptedEvent` $\rightarrow$ triggers lock and rider notification.
     * `RideCompletedEvent` $\rightarrow$ triggers invoice generation and email receipt.

---

## 4. How I Used AI

### Phased Workflow & Direction
1. **Planning & Architecture Design**:
   * Prompted the AI to analyze the assignment requirements, outline the domain models, and propose an extensible layered architecture adhering to SOLID principles.
2. **Modular Layering**:
   * Directed the AI to divide the system into distinct phases (Database Repositories $\rightarrow$ Domain Models $\rightarrow$ Strategy Implementations $\rightarrow$ Services $\rightarrow$ HTTP Controllers $\rightarrow$ CLI Demo).
3. **Iterative Execution & Prompting**:
   * Prompted specifically for concrete requirements: Strategy pattern for matching, distance calculation strategies (Euclidean vs Manhattan), single-active-ride constraints, atomic driver locks, and tiered pricing.
4. **Rigorous Testing & Edge Case Identification**:
   * Ran automated vitest test suites to identify unhandled corner cases.
   * Constructed an exhaustive 65-point edge-cases checklist covering user validation, driver boundary limits, coupon constraints, pricing boundaries (0 km, 2 km, 5 km), and concurrent bookings.
5. **Code Structuring & Refactoring**:
   * Directed the AI to separate monolith model files into dedicated single-responsibility files (`userModel`, `driverModel`, `cabModel`, `rideModel`, `couponModel`, `locationModel`, `carModel`).
   * Enforced explicit folder-based index naming conventions (`modelsIndex.ts`, `routesIndex.ts`, `servicesIndex.ts`, `dbIndex.ts`, `strategiesIndex.ts`).

### What I Rejected, Rewrote, and Why
* **Rejected Hardcoded Euclidean Calculations**: Initially, distance calculations were directly inlined inside services. I rejected this and instructed the AI to extract a `DistanceStrategy` interface so Manhattan and Euclidean distances can be selected dynamically at runtime.
* **Rejected Generic `index.ts` Files**: I rejected standard `index.ts` naming across multiple folders to avoid editor tab confusion and improve codebase navigation, enforcing explicit names (`modelsIndex.ts`, `servicesIndex.ts`, etc.).
* **Rejected Monolithic Models**: Prompted the AI to split a single `models/index.ts` into individual model files for better modularity and testability.
* **Rewrote Pricing Assumptions**: Ensured minimum fare was enforced strictly as a **floor** (`Math.max(50, tieredFare)`) rather than an additive base fee, matching the assignment prompt.
* **Enforced Strict Downgrade Guard**: Rewrote driver matching so Hatchback requests upgrade to Sedan at no extra cost, but Sedan requests never downgrade to Hatchback.
* **Hardened Input Validation**: Added strict validation rejecting negative coupon discounts, discounts $> 100\%$, duplicate coupon codes, and invalid coordinates outside $[-90, 90]$ and $[-180, 180]$.