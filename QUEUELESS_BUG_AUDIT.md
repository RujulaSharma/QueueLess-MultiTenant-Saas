# QueueLess SaaS — Phase 1 Engineering Bug Audit & Stabilization Plan

## Overview
This document contains the complete engineering bug audit of the QueueLess Multi-Tenant SaaS platform. Every identified defect has been categorized by severity, analyzed for root causes, and mapped to targeted fixes.

---

## 1. Critical Severity Bugs

| ID | File / Component | Problem | Root Cause | Proposed Fix | Status |
|---|---|---|---|---|---|
| **CRIT-01** | `Server/src/routes/staffQueueRoutes.js` | Missing RBAC authorization on staff queue mutation routes (`/next`, `/:id/start`, `/:id/complete`, `/:id/skip`, `/:id/no-show`). | Route definitions used only `authMiddleware` without `requireRole("ADMIN", "STAFF")`. | Add `requireRole("ADMIN", "STAFF")` middleware to all mutation routes in `staffQueueRoutes.js`. | Identified |
| **CRIT-02** | `Server/src/controllers/staffQueueController.js` | Cross-tenant data tampering vulnerability in staff queue actions. | Controller methods (`startServing`, `completeService`, `skipQueue`, `markNoShow`) queried by `_id` without validating hospital/business ownership (`business: req.user.businessId`). `callNext` accepted unverified `businessId` from `req.body`. | Enforce hospital scoping by querying `{ _id: id, business: req.user.businessId }` and requiring valid `req.user.businessId`. | Identified |
| **CRIT-03** | `Server/src/controllers/appointmentController.js` | Cross-tenant appointment status manipulation & unconstrained duplicate appointment lookup. | `updateAppointmentStatus` updated appointments by ID without checking `appointment.business == req.user.businessId`. Duplicate check for appointments without doctors did not scope by `business`. | Add strict tenant validation to `updateAppointmentStatus` and include `business` filter in appointment uniqueness query. | Identified |
| **CRIT-04** | `Client/src/services/` (Multiple files) | Server models & CommonJS modules mistakenly placed in Vite frontend client directory (`analyticsService.js`, `businessAnalyticsService.js`, `predictionService.js`, `queueService.js`). | Backend service files with `require("mongoose")` were erroneously duplicated into `Client/src/services/`. | Remove stray server files from `Client/src/services/` and clean up client imports. | Identified |

---

## 2. High Severity Bugs

| ID | File / Component | Problem | Root Cause | Proposed Fix | Status |
|---|---|---|---|---|---|
| **HIGH-01** | `Client/src/App.jsx` & `Server/src/routes/appointmentRoutes.js` | Broken Appointment Details page: route not registered in React Router, and backend lacks `GET /api/appointments/:id` endpoint. | Route `<Route path="/appointments/:id" element={<AppointmentDetails />} />` missing in client; `getAppointmentById` missing in backend controller/routes. | Implement `getAppointmentById` with tenant/user authorization in backend and add route in `App.jsx`. | Identified |
| **HIGH-02** | `Server/src/server.js` | Socket.IO room leak and lack of room departure handling. | Backend handled `joinBusinessRoom` but not `leaveBusinessRoom`, causing lingering socket memberships across tenant room changes. | Add `socket.on("leaveBusinessRoom", ...)` handler with room isolation verification. | Identified |
| **HIGH-03** | `Client/src/hooks/useBusinessRealtime.js` | Socket reconnection storm & listener proliferation on every component re-render. | `useEffect` depended directly on unstable `onUpdate` function references and spawned new socket client instances instead of utilizing shared singleton. | Refactor `useBusinessRealtime` using `useRef` for callback stability and reuse `getSocket()`. | Identified |
| **HIGH-04** | `Server/src/controllers/queueController.js` & `staffQueueController.js` | Inconsistent Socket.IO event payloads and missing scope in queue position recalculations. | `queueController.js` emitted `{ type: "JOINED", queue }` without `businessId`. `staffQueueController.js` called `emitQueueUpdate` without passing `{ doctorId, departmentId }` scope. | Standardize Socket.IO payload format with `businessId` and pass proper doctor/department scope to all `emitQueueUpdate` calls. | Identified |
| **HIGH-05** | `Server/src/controllers/appointmentController.js` | Multi-tenant leak in `getBusinessAppointments`. | `getBusinessAppointments` allowed `req.query.businessId` fallback without verifying if the user belongs to that business. | Restrict `businessId` to `req.user.businessId` for non-superadmins. | Identified |

---

## 3. Medium Severity Bugs

| ID | File / Component | Problem | Root Cause | Proposed Fix | Status |
|---|---|---|---|---|---|
| **MED-01** | `Client/src/pages/Queue.jsx` | Vite dynamic import warnings and performance penalty. | Inlined `const { default: api } = await import("../services/api");` inside functions instead of top-level import. | Replace dynamic imports with top-level `import api from "../services/api"`. | Identified |
| **MED-02** | `Server/src/controllers/doctorDashboardController.js` | Doctor unable to mark appointments as `COMPLETED` directly from appointment schedule view. | Allowed status array in `updateAppointmentStatus` was restricted to `["CONFIRMED", "NO_SHOW", "CANCELLED"]`. | Add `"COMPLETED"` to allowed statuses with timestamp setting. | Identified |
| **MED-03** | `Server/src/controllers/predictionController.js` | Missing tenant relationship check between service and hospital. | `predictionController` did not verify that `serviceId` belongs to `businessId`. | Validate `Service.findOne({ _id: resolvedServiceId, business: businessId })`. | Identified |
| **MED-04** | `Client/src/pages/BookAppointment.jsx` | Race condition in slot loading when switching doctors quickly. | State wasn't reset immediately before fetching availability. | Reset `bookedTimes` and `time` synchronously upon doctor selection change. | Identified |
| **MED-05** | `Server/.env` & `Client/.env` | Malformed lines and external hardcoded URLs in environment files. | Server `.env` contained loose plaintext credentials; Client `.env` contained hardcoded production URLs and IP addresses. | Clean up `.env` files and add clean `.env.example` templates. | Identified |
| **MED-06** | `Client/src/pages/Appointments.jsx` | Missing link / navigation to Appointment Details. | Clicking appointment cards did not provide a way to open full appointment details. | Add "View details" action linking to `/appointments/:id`. | Identified |

---

## 4. Low Severity Bugs

| ID | File / Component | Problem | Root Cause | Proposed Fix | Status |
|---|---|---|---|---|---|
| **LOW-01** | `Client/src/styles.css` | Potential table overflow on small mobile screens (<400px). | Certain table cells lacked minimum width constraints and scroll wrapping on compact viewports. | Ensure responsive table wrappers and card fallbacks for mobile viewports. | Identified |
| **LOW-02** | `Client/src/layouts/AppLayout.jsx` | Inconsistent role badge styling in user sidebar card. | Role strings lacked uniform capitalization formatting. | Ensure consistent formatting and styling across roles. | Identified |
| **LOW-03** | `Client/src/pages/Settings.jsx` | Missing feedback confirmation when changing settings. | Toggle switches persisted to localStorage without toast or notification feedback. | Add subtle confirmation when preferences change. | Identified |
| **LOW-04** | `Client/src/pages/Doctors.jsx` | Form validation and error clearing inconsistencies on modal reopen. | `editForm` did not reset all state fields when switching between doctors. | Properly reset editing state and errors upon opening and closing dialogs. | Identified |
