# Ride Hailing Service — API Testing Guide (`api.md`)

This guide provides complete documentation and copy-pasteable **cURL** and **Postman** requests for all endpoints in the Ride Hailing Service.

---

## 🚀 Server Setup & Base URL

- **Base URL**: `http://localhost:3000`
- **Headers**:
  ```http
  Content-Type: application/json
  ```
- **Start the server** (if not already running):
  ```bash
  cd /Users/shameerali/Desktop/assignment/rider_driver
  npm start
  ```
  *(or `npm run dev` for auto-reloading)*

---

## 📌 Recommended End-to-End Testing Flow

To test the complete lifecycle in Postman or cURL, run these in order:
1. **Health Check**: `GET /health`
2. **Register User**: `POST /api/users` (e.g. `u_alice`)
3. **Register Driver**: `POST /api/drivers` (e.g. `d_bob`)
4. **Register Cab for Driver**: `POST /api/drivers/cab` (e.g. `cab_1` at location `{x: 1, y: 1}`)
5. **Add Coupon**: `POST /api/coupons` (e.g. `SAVE20`)
6. **Book Ride**: `POST /api/rides/book` (User books ride within driver radius)
7. **Start Ride**: `PUT /api/rides/:id/start`
8. **End Ride**: `PUT /api/rides/:id/end` (Fare breakdown and discounts calculated!)
9. **View Ride Details**: `GET /api/rides/:id`
10. **View User Ride History**: `GET /api/users/:id/rides`
11. **View Driver Ride History**: `GET /api/drivers/:id/rides`

---

## 1. System Health

### 1.1 Health Check
- **Method**: `GET`
- **URL**: `http://localhost:3000/health`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/health
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "uptime": 12.34
  }
  ```

---

## 2. Users API (`/api/users`)

### 2.1 Register User
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/users`
- **Body (JSON)**:
  ```json
  {
    "id": "u_alice",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "phone": "+919876543210"
  }
  ```
- **cURL**:
  ```bash
  curl -X POST http://localhost:3000/api/users \
    -H "Content-Type: application/json" \
    -d '{
      "id": "u_alice",
      "name": "Alice Smith",
      "email": "alice@example.com",
      "phone": "+919876543210"
    }'
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "u_alice",
      "name": "Alice Smith",
      "email": "alice@example.com",
      "phone": "+919876543210",
      "createdAt": "2026-09-23T08:00:00.000Z"
    }
  }
  ```

### 2.2 List All Users
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/users`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/users
  ```

### 2.3 Get User by ID
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/users/u_alice`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/users/u_alice
  ```

### 2.4 Get User Ride History
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/users/u_alice/rides`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/users/u_alice/rides
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "ongoing": [],
      "completed": [],
      "all": []
    }
  }
  ```

---

## 3. Drivers & Cabs API (`/api/drivers`)

### 3.1 Register Driver
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/drivers`
- **Body (JSON)**:
  ```json
  {
    "id": "d_bob",
    "name": "Bob Driver",
    "rating": 4.9
  }
  ```
- **cURL**:
  ```bash
  curl -X POST http://localhost:3000/api/drivers \
    -H "Content-Type: application/json" \
    -d '{
      "id": "d_bob",
      "name": "Bob Driver",
      "rating": 4.9
    }'
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "d_bob",
      "name": "Bob Driver",
      "rating": 4.9,
      "status": "AVAILABLE",
      "createdAt": "2026-09-23T08:00:00.000Z"
    }
  }
  ```

### 3.2 Register Cab for Driver
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/drivers/cab`
- **Cab Types**: `"HATCHBACK"` | `"SEDAN"`
- **Body (JSON)**:
  ```json
  {
    "id": "cab_1",
    "driverId": "d_bob",
    "carType": "HATCHBACK",
    "licensePlate": "KA-01-AB-1234",
    "initialLocation": { "x": 1.0, "y": 1.0 }
  }
  ```
- **cURL**:
  ```bash
  curl -X POST http://localhost:3000/api/drivers/cab \
    -H "Content-Type: application/json" \
    -d '{
      "id": "cab_1",
      "driverId": "d_bob",
      "carType": "HATCHBACK",
      "licensePlate": "KA-01-AB-1234",
      "initialLocation": { "x": 1.0, "y": 1.0 }
    }'
  ```

### 3.3 List All Drivers
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/drivers`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/drivers
  ```

### 3.4 Get Driver by ID
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/drivers/d_bob`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/drivers/d_bob
  ```

### 3.5 Update Driver Location
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/drivers/d_bob/location`
- **Body (JSON)**:
  ```json
  {
    "x": 2.5,
    "y": 3.0
  }
  ```
- **cURL**:
  ```bash
  curl -X PUT http://localhost:3000/api/drivers/d_bob/location \
    -H "Content-Type: application/json" \
    -d '{"x": 2.5, "y": 3.0}'
  ```

### 3.6 Update Driver Availability Status
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/drivers/d_bob/status`
- **Valid Status Values**: `"AVAILABLE"` | `"OFFLINE"`
- **Body (JSON)**:
  ```json
  {
    "status": "AVAILABLE"
  }
  ```
- **cURL**:
  ```bash
  curl -X PUT http://localhost:3000/api/drivers/d_bob/status \
    -H "Content-Type: application/json" \
    -d '{"status": "AVAILABLE"}'
  ```

### 3.7 Get Driver Ride History
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/drivers/d_bob/rides`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/drivers/d_bob/rides
  ```

### 3.8 Driver Cancel Active Ride (Free Up Driver)
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/drivers/{DRIVER_ID}/cancel-active-ride`
- **Description**: If a driver is currently assigned or on an active ride, they cannot accept another ride until they cancel or complete the current ride. This endpoint cancels the driver's active ride and marks them `AVAILABLE` again.
- **Body (JSON)**:
  ```json
  {
    "reason": "Driver vehicle issue / emergency"
  }
  ```
- **cURL**:
  ```bash
  curl -X PUT http://localhost:3000/api/drivers/d_bob/cancel-active-ride \
    -H "Content-Type: application/json" \
    -d '{"reason": "Driver vehicle issue"}'
  ```

---

## 4. Coupons API (`/api/coupons`)

### 4.1 Add a Coupon
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/coupons`
- **Discount Types**: `"PERCENTAGE"` | `"FLAT"`
- **Body (JSON) — Percentage Example**:
  ```json
  {
    "code": "SAVE20",
    "discountType": "PERCENTAGE",
    "discountValue": 20,
    "maxDiscount": 50,
    "minRideFare": 50,
    "usageLimit": 100,
    "expiryDate": "2027-12-31T23:59:59.000Z",
    "isActive": true
  }
  ```
- **Body (JSON) — Flat Example**:
  ```json
  {
    "code": "FLAT30",
    "discountType": "FLAT",
    "discountValue": 30,
    "minRideFare": 50,
    "isActive": true
  }
  ```
- **cURL**:
  ```bash
  curl -X POST http://localhost:3000/api/coupons \
    -H "Content-Type: application/json" \
    -d '{
      "code": "SAVE20",
      "discountType": "PERCENTAGE",
      "discountValue": 20,
      "maxDiscount": 50,
      "minRideFare": 50,
      "usageLimit": 100,
      "expiryDate": "2027-12-31T23:59:59.000Z",
      "isActive": true
    }'
  ```

### 4.2 List All Coupons
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/coupons`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/coupons
  ```

### 4.3 Get Coupon by Code
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/coupons/SAVE20`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/coupons/SAVE20
  ```

### 4.4 Validate Coupon
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/coupons/SAVE20/validate`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/coupons/SAVE20/validate
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "valid": true,
      "coupon": {
        "code": "SAVE20",
        "discountType": "PERCENTAGE",
        "discountValue": 20,
        "maxDiscount": 50,
        "minRideFare": 50,
        "usedCount": 0,
        "isActive": true
      }
    }
  }
  ```

### 4.5 Delete Coupon
- **Method**: `DELETE`
- **URL**: `http://localhost:3000/api/coupons/SAVE20`
- **cURL**:
  ```bash
  curl -X DELETE http://localhost:3000/api/coupons/SAVE20
  ```

---

## 5. Rides API (`/api/rides`)

### 5.1 Book a Ride
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/rides/book`
- **Body (JSON)**:
  ```json
  {
    "userId": "u_alice",
    "pickupLocation": { "x": 0.0, "y": 0.0 },
    "dropLocation": { "x": 6.0, "y": 8.0 },
    "requestedCarType": "HATCHBACK",
    "maxRadiusKm": 5.0,
    "couponCode": "SAVE20",
    "distanceStrategy": "EUCLIDEAN"
  }
  ```
  *(Note: `distanceStrategy` is optional: `"EUCLIDEAN"` or `"MANHATTAN"`. Defaults to active service strategy)*
- **cURL**:
  ```bash
  curl -X POST http://localhost:3000/api/rides/book \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "u_alice",
      "pickupLocation": { "x": 0.0, "y": 0.0 },
      "dropLocation": { "x": 6.0, "y": 8.0 },
      "requestedCarType": "HATCHBACK",
      "maxRadiusKm": 5.0,
      "couponCode": "SAVE20",
      "distanceStrategy": "EUCLIDEAN"
    }'
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "ride_1727078400000_123",
      "userId": "u_alice",
      "driverId": "d_bob",
      "cabId": "cab_1",
      "requestedCarType": "HATCHBACK",
      "billedCarType": "HATCHBACK",
      "assignedCarType": "HATCHBACK",
      "isUpgraded": false,
      "pickupLocation": { "x": 0, "y": 0 },
      "dropLocation": { "x": 6, "y": 8 },
      "status": "REQUESTED",
      "couponCode": "SAVE20",
      "bookedAt": "2026-09-23T08:05:00.000Z"
    }
  }
  ```
  *(💡 Save the returned `data.id` for start/end/cancel calls)*
- **Constraint / Business Rule**:
  - A rider cannot book a new ride if they already have an active ride (`REQUESTED` or `ONGOING`).
  - Attempting to book returns HTTP `400`:
    ```json
    {
      "success": false,
      "error": "Rider u_alice already has an active ride (ride_...) with status 'REQUESTED'. Complete or cancel it before booking a new ride."
    }
    ```

---

### 5.2 Start a Ride
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/rides/{RIDE_ID}/start`
  *(Replace `{RIDE_ID}` with the actual ride ID from step 5.1)*
- **Body**: None
- **cURL**:
  ```bash
  curl -X PUT http://localhost:3000/api/rides/YOUR_RIDE_ID/start
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "YOUR_RIDE_ID",
      "status": "ONGOING",
      "startedAt": "2026-09-23T08:06:00.000Z"
    }
  }
  ```

---

### 5.3 End a Ride (Completes Ride & Calculates Fare)
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/rides/{RIDE_ID}/end`
- **Body (JSON)**: *(Optional actualEndLocation, defaults to original dropLocation)*
  ```json
  {
    "actualEndLocation": { "x": 6.0, "y": 8.0 }
  }
  ```
- **cURL**:
  ```bash
  curl -X PUT http://localhost:3000/api/rides/YOUR_RIDE_ID/end \
    -H "Content-Type: application/json" \
    -d '{"actualEndLocation": { "x": 6.0, "y": 8.0 }}'
  ```
- **Response `200 OK` (with complete Fare Breakdown)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "YOUR_RIDE_ID",
      "status": "COMPLETED",
      "distanceKm": 10,
      "fareBreakdown": {
        "distanceKm": 10,
        "tieredBreakdown": [
          { "tierName": "0-3 km", "distanceKm": 3, "ratePerKm": 10, "subtotal": 30 },
          { "tierName": "3-7 km", "distanceKm": 4, "ratePerKm": 12, "subtotal": 48 },
          { "tierName": ">7 km", "distanceKm": 3, "ratePerKm": 15, "subtotal": 45 }
        ],
        "rawTieredFare": 123,
        "carTypeMultiplier": 1,
        "fareAfterCarMultiplier": 123,
        "surgeMultiplier": 1,
        "fareAfterSurge": 123,
        "minimumFare": 50,
        "fareBeforeDiscount": 123,
        "discountAmount": 24.6,
        "finalFare": 98.4,
        "couponCode": "SAVE20",
        "isUpgraded": false,
        "requestedCarType": "HATCHBACK",
        "billedCarType": "HATCHBACK",
        "assignedCarType": "HATCHBACK"
      },
      "completedAt": "2026-09-23T08:25:00.000Z"
    }
  }
  ```

---

### 5.4 Cancel a Ride
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/rides/{RIDE_ID}/cancel`
- **Rules**:
  - Cancelled while `REQUESTED`: ₹0 fee
  - Cancelled while `ONGOING`: ₹30 fee
- **Body (JSON)**:
  ```json
  {
    "reason": "Driver arrived late"
  }
  ```
- **cURL**:
  ```bash
  curl -X PUT http://localhost:3000/api/rides/YOUR_RIDE_ID/cancel \
    -H "Content-Type: application/json" \
    -d '{"reason": "Driver arrived late"}'
  ```

---

### 5.5 Get Ride Details
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/rides/{RIDE_ID}`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/rides/YOUR_RIDE_ID
  ```

---

### 5.6 Switch Driver Matching Strategy (Strategy Pattern)
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/rides/strategy`
- **Options**: `"NEAREST"` | `"HIGHEST_RATED"`
- **Body (JSON)**:
  ```json
  {
    "strategy": "HIGHEST_RATED"
  }
  ```
- **cURL**:
  ```bash
  curl -X PUT http://localhost:3000/api/rides/strategy \
    -H "Content-Type: application/json" \
    -d '{"strategy": "HIGHEST_RATED"}'
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Matching strategy set to Highest-Rated Driver Matching Strategy"
  }
  ```

---

### 5.7 Get Active Distance Strategy (Strategy Pattern)
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/rides/distance-strategy`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/api/rides/distance-strategy
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "strategy": "EUCLIDEAN",
    "availableStrategies": [
      "EUCLIDEAN",
      "MANHATTAN"
    ]
  }
  ```

---

### 5.8 Switch Distance Strategy (Strategy Pattern)
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/rides/distance-strategy`
- **Options**: `"EUCLIDEAN"` | `"MANHATTAN"`
- **Body (JSON)**:
  ```json
  {
    "strategy": "MANHATTAN"
  }
  ```
- **cURL**:
  ```bash
  curl -X PUT http://localhost:3000/api/rides/distance-strategy \
    -H "Content-Type: application/json" \
    -d '{"strategy": "MANHATTAN"}'
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Distance calculation strategy set to MANHATTAN",
    "strategy": "MANHATTAN"
  }
  ```

---

### 5.9 Direct Distance Calculation (Euclidean vs Manhattan)
Calculate distance between any two 2D coordinates on-the-fly using Euclidean or Manhattan strategy:
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/rides/calculate-distance`
- **Formulae**:
  - **Euclidean**: $\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$ (Straight-line distance)
  - **Manhattan**: $|x_2 - x_1| + |y_2 - y_1|$ (Taxicab / Grid distance)
- **Body (JSON) — Euclidean Example**:
  ```json
  {
    "from": { "x": 0.0, "y": 0.0 },
    "to": { "x": 6.0, "y": 8.0 },
    "strategy": "EUCLIDEAN"
  }
  ```
- **Body (JSON) — Manhattan Example**:
  ```json
  {
    "from": { "x": 0.0, "y": 0.0 },
    "to": { "x": 6.0, "y": 8.0 },
    "strategy": "MANHATTAN"
  }
  ```
- **cURL (Euclidean)**:
  ```bash
  curl -X POST http://localhost:3000/api/rides/calculate-distance \
    -H "Content-Type: application/json" \
    -d '{"from": {"x": 0, "y": 0}, "to": {"x": 6, "y": 8}, "strategy": "EUCLIDEAN"}'
  ```
- **Response `200 OK` (Euclidean)**:
  ```json
  {
    "success": true,
    "from": { "x": 0, "y": 0 },
    "to": { "x": 6, "y": 8 },
    "distanceKm": 10,
    "strategy": "EUCLIDEAN",
    "strategyName": "Euclidean Distance Strategy"
  }
  ```
- **cURL (Manhattan)**:
  ```bash
  curl -X POST http://localhost:3000/api/rides/calculate-distance \
    -H "Content-Type: application/json" \
    -d '{"from": {"x": 0, "y": 0}, "to": {"x": 6, "y": 8}, "strategy": "MANHATTAN"}'
  ```
- **Response `200 OK` (Manhattan)**:
  ```json
  {
    "success": true,
    "from": { "x": 0, "y": 0 },
    "to": { "x": 6, "y": 8 },
    "distanceKm": 14,
    "strategy": "MANHATTAN",
    "strategyName": "Manhattan Distance Strategy"
  }
  ```

---

### 5.10 Assign Driver to Ride (with Double-Booking Protection)
- **Method**: `PUT`
- **URL**: `http://localhost:3000/api/rides/{RIDE_ID}/assign`
- **Rule**: If the driver is already assigned/booked to any active ride (`REQUESTED` or `ONGOING`), this request is blocked. The driver must cancel or complete their current ride before accepting another ride.
- **Body (JSON)**:
  ```json
  {
    "driverId": "d_bob"
  }
  ```
- **cURL**:
  ```bash
  curl -X PUT http://localhost:3000/api/rides/YOUR_RIDE_ID/assign \
    -H "Content-Type: application/json" \
    -d '{"driverId": "d_bob"}'
  ```

---

## ⚡ Quick Test Script (Terminal copy-paste)

Want to test the full flow in 1 second? Run this bash one-liner in your terminal:

```bash
# 1. Register User & Driver
curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"id":"test_u1","name":"Test User"}' | jq
curl -s -X POST http://localhost:3000/api/drivers -H "Content-Type: application/json" -d '{"id":"test_d1","name":"Test Driver","rating":4.9}' | jq
curl -s -X POST http://localhost:3000/api/drivers/cab -H "Content-Type: application/json" -d '{"id":"test_cab1","driverId":"test_d1","carType":"HATCHBACK","licensePlate":"KA-01-9999","initialLocation":{"x":0,"y":0}}' | jq

# 2. Add Coupon
curl -s -X POST http://localhost:3000/api/coupons -H "Content-Type: application/json" -d '{"code":"PROMO10","discountType":"PERCENTAGE","discountValue":10,"minRideFare":50}' | jq

# 3. Book Ride
RIDE_RES=$(curl -s -X POST http://localhost:3000/api/rides/book -H "Content-Type: application/json" -d '{"userId":"test_u1","pickupLocation":{"x":0,"y":0},"dropLocation":{"x":3,"y":4},"requestedCarType":"HATCHBACK","couponCode":"PROMO10"}')
echo "$RIDE_RES" | jq
RIDE_ID=$(echo "$RIDE_RES" | jq -r '.data.id')

# 4. Start & End Ride
curl -s -X PUT "http://localhost:3000/api/rides/$RIDE_ID/start" | jq
curl -s -X PUT "http://localhost:3000/api/rides/$RIDE_ID/end" | jq
```
