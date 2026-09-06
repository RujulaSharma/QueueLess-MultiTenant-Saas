QueueLess Backend

Multi-Tenant Healthcare Appointment & Real-Time Queue Management API

The QueueLess backend is a Node.js and Express REST API that powers a multi-tenant healthcare appointment and real-time patient queue management platform.

It provides authentication, role-based authorization, hospital management, departments, doctors, appointments, queue management, analytics, wait-time prediction, and Socket.IO based real-time queue updates.

Backend Responsibilities

The backend is responsible for:

User authentication and JWT authorization

Role-based access control

Hospital/tenant ownership and data isolation

Hospital profile management

Department management

Doctor account and professional profile management

Patient appointment booking

Doctor availability

Appointment status management

Patient check-in

Real-time queue management

Queue position and wait-time calculation

Doctor consultation workflow

Consultation history

Hospital analytics and reporting

Historical wait-time prediction

Real-time Socket.IO events

Architecture

Client
  |
  | HTTP / REST API
  | WebSocket / Socket.IO
  v
Express Server
  |
  +----------------------+
  |                      |
  v                      v
Controllers           Socket.IO
  |
  v
Services
  |
  v
Mongoose
  |
  v
MongoDB

The backend follows a controller/service/model architecture:

Request
  ↓
Route
  ↓
Authentication Middleware
  ↓
Role Authorization
  ↓
Controller
  ↓
Service / Business Logic
  ↓
Mongoose Model
  ↓
MongoDB

Multi-Tenant Data Model

QueueLess uses a hospital-centered multi-tenant structure:

Hospital
   |
   +-- Department
          |
          +-- Doctor

Appointments and queue entries are associated with the appropriate hospital, department, doctor, patient, and service context.

Hospital ownership checks are used by administrative operations to prevent one hospital administrator from accessing another hospital's data.

User Roles

The backend supports role-based access for:

Role

Backend responsibilities

CUSTOMER

Patient booking, appointments and personal queue

DOCTOR

Own profile, appointments, queue and consultations

ADMIN

Hospital management, doctors, departments, appointments, queues and analytics

STAFF

Legacy compatibility role

Authorization is enforced on protected API routes using middleware.

Authentication

QueueLess uses JWT-based authentication.

Typical authentication flow:

Login
  ↓
Credentials validated
  ↓
JWT generated
  ↓
Client stores token
  ↓
Authorization header
  ↓
Authentication middleware
  ↓
req.user

The backend also provides a current-user endpoint so the frontend can refresh its authenticated user information from the database.

Authentication endpoints

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

Core Models

The backend uses MongoDB with Mongoose.

Main models include:

User
Business
Department
Doctor
Appointment
Queue
Service
ServiceHistory

Relationship overview

User
 |
 +-- Patient
 |
 +-- Doctor
 |     |
 |     +-- Business
 |     +-- Department
 |
 +-- Admin
       |
       +-- Business


Business
 |
 +-- Departments
 +-- Doctors
 +-- Appointments
 +-- Queues

Appointment System

The appointment workflow is:

Hospital
   ↓
Department
   ↓
Doctor
   ↓
Date
   ↓
Available Time
   ↓
Appointment
   ↓
Check-In
   ↓
Queue
   ↓
Consultation

Appointments can contain:

Patient

Hospital

Department

Doctor

Service

Appointment date

Scheduled time

Status

Queue entry

Consultation notes

Diagnosis

Prescription

Consultation timestamps

Completing doctor

Appointment states include:

SCHEDULED
CONFIRMED
CHECKED_IN
COMPLETED
CANCELLED
NO_SHOW

Doctor Management

Hospital administrators can manage doctor accounts and professional information.

Doctor records support:

Name

Email

Designation

Specialization

License number

Experience

Consultation fee

Department

Hospital

Status

Doctor statuses include:

ACTIVE
ON_LEAVE
INACTIVE

Doctors can also update their own professional profile through protected endpoints.

Department Management

Departments belong to a hospital.

A department can contain multiple doctors.

Example:

AIMA Multispeciality Hospital
 |
 +-- Dental
 |    +-- Doctor A
 |    +-- Doctor B
 |
 +-- Blood Test
 |    +-- Doctor C
 |
 +-- X-Ray
      +-- Doctor D

Department information includes:

Name

Code

Description

Appointment duration

Consultation/service fee

Active status

Assigned doctors

Real-Time Queue Management

Queue management is one of the core backend features.

When a patient checks in:

Appointment
    ↓
Queue Entry
    ↓
Token Number
    ↓
WAITING

The queue lifecycle is:

WAITING
   ↓
CALLED
   ↓
SERVING
   ↓
COMPLETED

Alternative states:

SKIPPED
CANCELLED
NO_SHOW

Queue entries track information such as:

Token number

Position

Estimated waiting time

Priority

Patient

Doctor

Department

Service

Status

Join time

Called time

Service start time

Completion time

Queue Recalculation

The queue service recalculates active queue entries using hospital, service, doctor, and department scope.

Queue change
    ↓
Find active entries
    ↓
Sort by priority + join time
    ↓
Recalculate waiting positions
    ↓
Calculate estimated wait
    ↓
Persist updated queue
    ↓
Emit Socket.IO event

This keeps each doctor's patient queue independent.

Socket.IO

The backend uses Socket.IO for live queue updates.

Clients can join hospital-specific rooms:

business:{businessId}

When a queue changes:

Queue Action
     ↓
Queue Recalculation
     ↓
queue:updated
     ↓
Hospital Socket Room
     ↓
Connected Clients

The event includes contextual information such as:

businessId
serviceId
doctorId
departmentId
queue
updatedAt
action

This allows patients and doctors to see queue changes without manually refreshing the page.

Wait-Time Prediction

QueueLess includes a historical wait-time prediction service.

The prediction service considers:

Current active queue

Patients ahead

Serving patients

Called patients

Historical service duration

Service average duration

Buffer time

Day of week

Hour of day

The calculation produces information such as:

Estimated wait
Patients ahead
Serving count
Called count
Average service duration
Buffer time
Prediction confidence

Historical data can be used to improve estimates for different periods of the day.

Analytics

The backend provides hospital analytics based on queue and consultation history.

Analytics can include:

Appointment/queue status counts

Completed consultations

No-show rate

Cancellation rate

Average waiting time

Average consultation duration

Department demand

Daily volume

Hourly demand

Peak hours

Historical service performance

The analytics service uses MongoDB aggregation and historical ServiceHistory records.

Consultation Management

Doctors can manage the consultation lifecycle through the doctor dashboard APIs.

Typical workflow:

Patient in queue
      ↓
Call Next
      ↓
CALLED
      ↓
Start Consultation
      ↓
SERVING
      ↓
Record consultation
      ↓
Complete Consultation
      ↓
COMPLETED

Consultation information can include:

Consultation notes

Diagnosis

Prescription

Start timestamp

Completion timestamp

Completing doctor

Completed consultations can also contribute to historical service analytics.

API Routes

The server mounts the main API modules under /api.

Authentication

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

Hospital / Business

GET   /api/businesses/:id
GET   /api/admin/business
POST  /api/admin/business
PATCH /api/admin/business/:id
PATCH /api/admin/business/:id/toggle

Profile

GET   /api/profile/me
PATCH /api/profile/me

Appointments

POST  /api/appointments
GET   /api/appointments/my
GET   /api/appointments/business/:businessId
PATCH /api/appointments/:id/status
PATCH /api/appointments/:id/check-in
PATCH /api/appointments/:id/cancel

Queue

POST  /api/queue/join
GET   /api/queue/my
GET   /api/queue/business/:businessId
PATCH /api/queue/:id/cancel

Doctors

GET   /api/doctors/public
GET   /api/doctors/availability
GET   /api/doctors/me
PATCH /api/doctors/me/profile

Hospital administration also uses:

GET   /api/admin/doctors
POST  /api/admin/doctors
PATCH /api/admin/doctors/:id

Departments

GET   /api/admin/departments
POST  /api/admin/departments
PATCH /api/admin/departments/:id
PATCH /api/admin/departments/:id/toggle

Doctor Dashboard

GET   /api/doctor/dashboard
POST  /api/doctor/dashboard/queue/next
PATCH /api/doctor/dashboard/queue/:id/start
PATCH /api/doctor/dashboard/queue/:id/complete
PATCH /api/doctor/dashboard/queue/:id/skip
PATCH /api/doctor/dashboard/queue/:id/no-show

Analytics

GET /api/analytics/dashboard
GET /api/analytics/business

Hospital Dashboard

GET /api/business/dashboard

Services

Legacy service management remains available for compatibility:

GET   /api/admin/services
POST  /api/admin/services
PATCH /api/admin/services/:id
PATCH /api/admin/services/:id/toggle

Health Check

GET /api/health

Project Structure

Server/
│
├── src/
│   ├── config/
│   │   └── database.js
│   │
│   ├── controllers/
│   │   ├── analyticsController.js
│   │   ├── appointmentController.js
│   │   ├── authController.js
│   │   ├── businessController.js
│   │   ├── businessDashboardController.js
│   │   ├── departmentController.js
│   │   ├── doctorController.js
│   │   ├── doctorDashboardController.js
│   │   ├── profileController.js
│   │   ├── queueController.js
│   │   └── ...
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Business.js
│   │   ├── Department.js
│   │   ├── Doctor.js
│   │   ├── Appointment.js
│   │   ├── Queue.js
│   │   ├── Service.js
│   │   └── ServiceHistory.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── queueRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── departmentRoutes.js
│   │   ├── doctorDashboardRoutes.js
│   │   ├── businessDashboardRoutes.js
│   │   └── ...
│   │
│   ├── services/
│   │   ├── analyticsService.js
│   │   ├── businessAnalyticsService.js
│   │   ├── predictionService.js
│   │   └── queueService.js
│   │
│   └── server.js
│
└── package.json

Security & Authorization

The backend uses several layers of protection.

JWT Authentication

Protected routes require a valid authenticated user.

Role-Based Authorization

Routes can require specific roles:

ADMIN
DOCTOR
CUSTOMER
STAFF

Hospital Ownership

Administrative resources are checked against the authenticated administrator's hospital.

Doctor Scope

Doctor dashboard operations are limited to the authenticated doctor's own clinical context.

Status Validation

Appointment and queue state changes are handled through backend workflows rather than trusting frontend state.

Environment Variables

Create a .env file in the backend project:

PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/queueless
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secure_jwt_secret

Do not commit .env to GitHub.

Installation

1. Install dependencies

cd Server
npm install

2. Configure environment variables

Create .env using the variables above.

3. Start MongoDB

Make sure your MongoDB server is running.

4. Start the backend

Development:

npm run dev

Production-style start:

npm start

The API will normally run on:

http://localhost:5000

Health Check

After starting the backend:

GET http://localhost:5000/api/health

Example response:

{
  "success": true,
  "message": "QueueLess API is running",
  "database": "connected"
}

Error Handling

The Express application includes centralized error handling.

Unhandled errors return a consistent response structure:

{
  "success": false,
  "message": "Error message"
}

Unknown routes return:

{
  "success": false,
  "message": "Route not found"
}

Graceful Shutdown

The backend includes graceful shutdown handling so the server can close resources cleanly when it receives termination signals.

Technology Stack

Node.js
Express.js
MongoDB
Mongoose
JWT
bcrypt
Socket.IO
CORS
dotenv

Backend Development Goals

QueueLess backend development focuses on real-world backend engineering concepts:

REST API architecture

Authentication

Authorization

Multi-tenancy

MongoDB data modeling

Mongoose relationships

Service-layer business logic

Queue state management

Real-time communication

Aggregation pipelines

Historical analytics

Hospital-level data isolation

Error handling

Graceful server lifecycle

Future Backend Improvements

Possible production extensions include:

SaaS subscription and billing APIs

Platform-level super-admin

Hospital self-service onboarding

Redis for distributed queue state

Background job processing

Email/SMS/WhatsApp notification services

Audit logging

Rate limiting

API request validation

Refresh-token rotation

Advanced caching

Cloud deployment

Automated testing

CI/CD pipeline

Project Status

Active Development

QueueLess is being developed as a portfolio-grade multi-tenant healthcare SaaS backend focused on appointment scheduling, doctor workflows, real-time patient queues, and hospital operational analytics.

Author

Mohit Sharma

Full-Stack Developer

QueueLess Backend
Node.js + Express + MongoDB + Socket.IO

License

This project is intended for portfolio and educational purposes.