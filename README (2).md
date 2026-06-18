# SafePulse

**AI-powered real-time travel safety companion** — live journey monitoring, crash detection, safe route recommendations, and instant emergency response for students, commuters, and families.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [What SafePulse Does](#what-safepulse-does)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Key API Reference](#key-api-reference)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Platform Support](#platform-support)
- [Future Scope](#future-scope)
- [Production Readiness](#production-readiness)

---

## Problem Statement

> **Impact:** Road traffic crashes kill approximately **1.19 million people every year** and injure a further 20–50 million — making them the leading cause of death for children and young adults aged 5–29 (WHO Global Status Report on Road Safety, 2023). In India alone, more than 153,000 people died in road accidents in 2022 (MoRTH Annual Report 2022–23), equivalent to one fatality every 3.4 minutes. The majority of these deaths occur in the first hour after impact — the "golden hour" — when timely emergency dispatch and automated detection are most life-saving. SafePulse targets this gap directly: autonomous crash detection, hands-free SOS, and safety-scored routing integrated into a single mobile platform.

Road accidents are among the leading causes of preventable death globally, yet widely used navigation tools like Google Maps are designed purely for route efficiency. Once a journey begins, these applications have no awareness of the traveller's safety. This creates five critical unaddressed gaps:

| Gap | Impact |
|---|---|
| No over-speed monitoring | No app alerts a user or guardian when safe speed thresholds are exceeded |
| No real-time crash detection | Smartphone sensors capable of detecting sudden impacts are unused |
| No hands-free emergency alerting | Injured or unconscious users cannot manually trigger an SOS |
| No safety-scored route recommendations | Route engines optimise only for time or distance, not safety |
| No trusted-contact Safety Circle | Guardians have no passive visibility into an active journey |

### Feature Implementation Map

| Problem Gap | Feature | Status | Key Files |
|---|---|---|---|
| No over-speed monitoring | Speed threshold alerts + hands-free TTS warnings | Implemented | `sensor_service.dart`, `alert_service.dart` |
| No real-time crash detection | 250-sample TFLite sliding window + server AI fallback | Implemented | `ai_service.dart`, `crash_analyzer.py` |
| No hands-free emergency alerting | Autonomous SOS — SMS + call + server event, queued offline | Implemented | `sos_service.dart`, `local_queue_service.dart` |
| No safety-scored routes | Risk-scored OSRM routes with weather multiplier | Implemented | `route_scoring.js`, `traffic_weather_service.js` |
| No Safety Circle visibility | Live WebSocket + Firestore real-time location sync | Implemented | `realtime_tracking_service.dart`, `circle_map_page.dart` |

SafePulse directly addresses all five gaps in a single integrated platform.

---

## What SafePulse Does

- Authenticates users with OTP and JWT through a secure Node.js API gateway.
- Maintains a **Safety Circle** of trusted contacts who receive real-time alerts and live location during emergencies.
- Continuously monitors journey speed, phone-use risk, and stationary anomalies.
- Scores route options using a **Safety Engine** backed by MongoDB incident data and OpenStreetMap geometry, recommending the safest path.
- Streams live tracking updates and SOS alerts to Safety Circle members through **WebSockets**.
- Detects crashes using a 250-sample accelerometer/gyroscope sliding window — processed by an on-device **TFLite model** and validated by a server-side **Python AI service**.
- Triggers **autonomous SOS** (SMS + direct call + server alert) without user interaction when a crash is confirmed.
- Falls back to offline SMS via a local patched Telephony plugin when the network is unavailable.
- Persists emergency events in a **Spring Boot microservice** with JPA, priority scoring, and dispatch readiness flags.

---

## System Architecture

SafePulse follows a **microservices architecture** with four independent services communicating over REST APIs and WebSockets.

```
┌─────────────────────────────────────────────────────────────┐
│                  Flutter Mobile App (Android)               │
│  Provider / Repository / Service pattern                    │
│  Background isolate: SensorService → AIService → SosService │
└───────────────────┬─────────────────────────────────────────┘
                    │ REST + WebSocket
┌───────────────────▼─────────────────────────────────────────┐
│              Node.js API Gateway  (backend/)                │
│  Helmet · Rate limiting · JWT auth · Morgan logging         │
│  X-Request-ID correlation · WebSocket hub · PM2 cluster     │
├──────────────┬──────────────────────┬───────────────────────┤
│  REST proxy  │   REST proxy         │  WebSocket hub        │
▼              ▼                      ▼                       │
Spring Boot    Python FastAPI         Safety Circle members   │
Emergency Svc  AI Accident Service    (tracking:update /      │
(JPA / H2)    (TFLite + heuristic)   sos:started events)     │
└─────────────────────────────────────────────────────────────┘
                    │
              MongoDB Atlas
       (users · circles · SOS records
        risk incidents · journey data)
```

### Service Responsibilities

| Service | Technology | Responsibility |
|---|---|---|
| **Flutter App** | Dart · Flutter | UI, sensor reading at 50 Hz, on-device TFLite inference, background SOS execution |
| **Node.js Gateway** | Node.js · Express | Auth, route scoring, realtime WebSocket hub, AI proxy, risk zone management |
| **Spring Boot Service** | Java · Spring Boot 3 | Emergency event persistence, priority scoring, lifecycle management (ACTIVE → RESOLVED) |
| **Python AI Service** | Python · FastAPI | TFLite crash analysis, heuristic fallback, phone-drop filtering, inference stats |
| **Database** | MongoDB | All services use MongoDB. Node.js uses Mongoose; Spring Boot uses Spring Data MongoDB. |
| **Firebase / Firestore** | Firebase Auth, FCM, cloud_firestore | Auth and push notifications are active. Firestore role is live-location mirroring (supplementary to REST + WebSocket primary sync). |

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Mobile Frontend | Flutter, Dart, Provider, TFLite Flutter, sensors\_plus, flutter\_map |
| API Gateway | Node.js, Express, Mongoose, Helmet, Morgan, JWT, WebSocket (ws) |
| Emergency Microservice | Java 17, Spring Boot 3, Spring Data MongoDB, Lombok |
| AI Analysis Service | Python 3.11, FastAPI, TensorFlow Lite / tflite\_runtime, NumPy |
| Database | MongoDB (geospatial 2dsphere indexes) |
| Notifications | Firebase Cloud Messaging (FCM), Twilio SMS, Nodemailer |
| Maps & Routing | OpenStreetMap, OSRM routing engine, flutter\_map, latlong2 |
| DevOps | GitHub Actions CI, PM2 cluster mode |
| Offline SOS | Local patched Telephony plugin (`packages/telephony_fix`) |

---

## Project Structure

```
SafePulse/
├── frontend/                        # Flutter mobile app (Android)
│   ├── lib/
│   │   ├── core/
│   │   │   ├── models/              # User, Circle, SosEvent, RouteModels
│   │   │   ├── providers/           # AuthProvider, CircleProvider, SosProvider
│   │   │   ├── repositories/        # SosRepository, CircleRepository, UserRepository
│   │   │   └── services/            # LocationService, RealtimeTrackingService, ApiService
│   │   └── features/
│   │       ├── auth/                # OTP login, splash, email login screens
│   │       ├── circles/             # Safety Circle map, member management
│   │       ├── home/                # Route suggestion, driving mode, monitoring
│   │       ├── safepulse/           # Engine, AIService, SensorService, SosService
│   │       └── sos/                 # SOS hub, nearby services, active SOS screen
│   ├── packages/
│   │   └── telephony_fix/           # Local patched Telephony plugin for offline SMS
│   └── assets/
│       └── crash_model.tflite       # On-device crash detection model
│
├── backend/                         # Node.js API gateway
│   ├── middleware/                  # auth.js, requestId.js
│   ├── models/                      # User, Circle, SOS, RiskIncident schemas
│   ├── routes/                      # auth, sos, routes, circle, ai, risk-zones, ...
│   ├── services/                    # safety_engine, route_scoring, realtime_hub, ...
│   ├── tests/                       # 14 Jest test suites
│   ├── ecosystem.config.js          # PM2 cluster configuration
│   └── index.js                     # App entry point
│
├── backend-springboot/              # Spring Boot emergency microservice
│   └── src/
│       ├── main/java/com/safepulse/backend/
│       │   ├── controller/          # SosController
│       │   ├── service/             # EmergencyResponseService, EmergencyDispatchService
│       │   ├── model/               # EmergencyEvent (JPA entity)
│       │   └── repository/          # EmergencyEventRepository
│       └── test/                    # JUnit, MockMvc, JPA tests
│
├── ai-service/                      # Python FastAPI AI analysis service
│   ├── app/
│   │   ├── main.py                  # FastAPI app, /health, /v1/accident/analyze, /ai/stats
│   │   ├── schemas.py               # AccidentAnalysisRequest/Response
│   │   └── services/
│   │       └── crash_analyzer.py    # TFLite + calibrated heuristic fallback
│   └── tests/                       # unittest crash analyzer + model load tests
│
└── .github/
    └── workflows/
        └── ci.yml                   # GitHub Actions: Node.js, Spring Boot, Python, Flutter
```

---

## Key API Reference

### Node.js API Gateway — `http://localhost:5000`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/send-otp` | — | Send OTP to phone number |
| `POST` | `/api/auth/verify-otp` | — | Verify OTP and return JWT |
| `POST` | `/api/routes/suggest` | JWT | Score and rank safe routes between two points |
| `GET` | `/api/risk-zones` | JWT | List active risk incident zones |
| `POST` | `/api/risk-zones` | JWT | Create a new risk incident |
| `POST` | `/api/sos/start` | JWT | Trigger SOS — notifies circle and nearby users |
| `POST` | `/api/ai/accident/analyze` | JWT | Proxy sensor window to Python AI service |
| `GET` | `/api/ai/model` | JWT | Fetch AI model metadata |
| `WS` | `/ws/tracking` | JWT (query param) | Realtime tracking and safety evaluation |
| `GET` | `/health` | — | Service health and DB status |

### Spring Boot Emergency Service — `http://localhost:8080`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sos` | Create emergency event with priority scoring |
| `GET` | `/api/sos/{eventId}` | Fetch a specific emergency event |
| `GET` | `/api/sos/active` | List all active emergency events |
| `PATCH` | `/api/sos/{eventId}/resolve` | Resolve an emergency event |

### Python AI Service — `http://localhost:7000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Model load status (ok / degraded) |
| `GET` | `/v1/model/metadata` | Model path, runtime, window size, features |
| `POST` | `/v1/accident/analyze` | Analyze sensor window — returns crash probability and severity |
| `GET` | `/ai/stats` | Total inferences, crash detections, avg inference time |

---

## Local Development

### Prerequisites

- Node.js >= 16, npm
- Java 17, Maven
- Python 3.11, pip
- Flutter SDK >= 3.0, Android Studio
- MongoDB (local or Atlas)

---

### Node.js API Gateway

```bash
cd backend
cp .env.example .env        # fill in secrets
npm install
npm start                   # production
npm run dev                 # nodemon watch mode
```

---

### Spring Boot Emergency Service

```bash
cd backend-springboot

# macOS / Linux
./mvnw spring-boot:run

# Windows
.\mvnw.cmd spring-boot:run
```

The service starts on port `8080` using MongoDB (`safepulse_dev` database by default in dev profile).

---

### Python AI Service

```bash
cd ai-service
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 7000
```

---

### Flutter Frontend

```bash
cd frontend
flutter pub get
flutter test
flutter run --dart-define=BASE_URL=http://<backend-host>:5000
```

> **Note:** `frontend/packages/telephony_fix` is a local patched Telephony plugin. It is a Flutter plugin dependency — not a separate application — that provides offline emergency SMS fallback when network-based SOS is unavailable.

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

| Variable | Description |
|---|---|
| `PORT` | Node.js server port (default: `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing (required in production) |
| `AI_SERVICE_URL` | Python AI service URL (default: `http://localhost:7000`) |
| `SPRING_EMERGENCY_SERVICE_URL` | Spring Boot service URL (default: `http://localhost:8080`) |
| `USE_HTTPS` | Set `true` to enable Node.js direct TLS |
| `TLS_KEY_PATH` | Path to TLS private key |
| `TLS_CERT_PATH` | Path to TLS certificate |
| `TWILIO_ACCOUNT_SID` | Twilio SID for SMS notifications |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase service account JSON |
| `EMAIL_USER` | SMTP email address |
| `EMAIL_PASS` | SMTP email password |

---

## Testing

### Node.js — Jest (14 test suites)

```bash
cd backend
npm test                    # run all tests
npm run test:coverage       # with coverage report
```

Covers: auth, SOS, circles, routes, route scoring, risk zones, AI proxy, alerts, WebSocket hub, journey, places, overpass, services, auth middleware.

### Spring Boot — JUnit / MockMvc / JPA

```bash
cd backend-springboot

# macOS / Linux
./mvnw test

# Windows
.\mvnw.cmd test
```

Covers: `SosController`, `EmergencyResponseService`, `EmergencyDispatchService`, `SosRequest` DTO validation, application context.

### Python AI Service — unittest

```bash
cd ai-service
PYTHONPATH=. python -m unittest discover -s tests
```

Covers: `CrashAnalyzer` heuristic logic, TFLite model load guard, phone-drop filtering, low-g no-crash assertion, empty-window guard, false-positive logging.

### Flutter — flutter\_test

```bash
cd frontend
flutter test
```

Covers: `SosService` contact loading, empty-contact early exit, pipe-format parsing from `SharedPreferences`.

### CI — GitHub Actions

All four test suites run automatically on every push and pull request via `.github/workflows/ci.yml`.

---

## Platform Support

SafePulse officially targets **Android only**. The `windows/` Flutter scaffold directory is excluded from version control via `frontend/.gitignore` and is unsupported in CI. To regenerate it locally:

```bash
cd frontend
flutter create --platforms windows .
```

---

## Future Scope

All future scope items below have code scaffolding already in place — each links to the existing stub or hook in the codebase.

### Phase 1 — Near-term

| Feature | Description | Existing Scaffolding |
|---|---|---|
| Full offline SOS queueing | Persistent local queue with retry sync when connectivity is restored | `LocalQueueServiceStub` in `local_queue_service.dart`; `triggerOfflineSOS()` in `sos_service.dart` |
| Community hazard reporting | Users submit crowd-sourced hazard reports visible on the route map | `CommunityReportServiceStub` in `community_report_service.dart`; `createRiskIncident()` in `risk_incident_repository.js` |

### Phase 2 — Mid-term

| Feature | Description | Existing Scaffolding |
|---|---|---|
| Advanced AI crash models | Retrain with larger real-world accident datasets for higher precision | Pluggable TFLite interpreter slot in `crash_analyzer.py`; 250-sample window pipeline ready in `ai_service.dart` |
| Live traffic and weather risk | Incorporate real-time traffic congestion and weather severity into route scoring | `TrafficWeatherService` stub in `traffic_weather_service.js`; hook comment in `route_scoring.js` |
| OBD-II vehicle speed integration | Replace GPS-estimated speed with direct vehicle CAN bus data | `OBDServiceStub` in `obd_service.dart`; injection comment in `safepulse_engine.dart` |

### Phase 3 — Long-term

| Feature | Description | Existing Scaffolding |
|---|---|---|
| Government emergency dispatch | Auto-notify police or ambulance for CRITICAL-severity SOS events | `EmergencyDispatchService.java` stub; `dispatchRecommended` flag already set by `EmergencyResponseService` |
| Voice assistant interaction | Hands-free SOS trigger and status updates via voice commands | Architecture hook via `flutter_tts` already in `pubspec.yaml` |
| Multi-region data residency | Route user data to region-specific MongoDB clusters for compliance | MongoDB URI is fully environment-variable driven; no code changes required |

---

## Production Readiness

- Store all secrets in environment variables — never in source code.
- `JWT_SECRET` is mandatory outside test runs; tests use an isolated secret.
- Node.js uses **Helmet** (security headers) and **express-rate-limit** (global + stricter auth limits).
- Use **PM2 cluster mode** (`ecosystem.config.js`) for zero-downtime multi-core deployment.
- Use a managed **MongoDB Atlas** deployment with geospatial indexes enabled.
- Run the Spring Boot service with `MONGO_URI` set and `--spring.profiles.active=prod` in production.
- Host the Python AI service separately and configure `AI_SERVICE_URL` in the Node backend.
- Configure `SPRING_EMERGENCY_SERVICE_URL` to point to the deployed Spring Boot instance.
- Replace public OSRM API calls with a **self-hosted or paid routing provider** before production traffic.
- TLS termination is supported either directly via Node.js (`USE_HTTPS=true`) or via an nginx reverse proxy — see `backend/TLS_SETUP.md`.
- Use Firebase and Twilio **production credentials** only through secure environment configuration.
