QueueLess Frontend

Multi-Tenant Healthcare Appointment & Real-Time Queue Management Platform

The QueueLess frontend is a React + Vite web application for patients, doctors, and hospital administrators.

It provides a role-based interface for booking appointments, tracking live queues, managing consultations, administering hospitals, and viewing operational analytics.

What the Frontend Does

QueueLess provides different experiences based on the authenticated user's role.

Patient

Patients can:

Browse the public QueueLess landing page

Register and log in

View their patient dashboard

Select a hospital

Select a department

Select a doctor

View available appointment slots

Book appointments

View appointment history

Check in for appointments

Track their queue position

See estimated waiting time

Cancel eligible appointments

View their profile

Manage application settings

Doctor

Doctors get a clinical workspace for:

Today's consultation schedule

Scheduled consultations

Patients awaiting consultation

Checked-in patients

Active patient queue

Calling the next patient

Starting consultations

Completing consultations

Skipping patients

Marking no-shows

Recording consultation notes

Recording diagnosis

Recording prescriptions

Managing professional profile information

Hospital Administrator

Hospital administrators can manage:

Hospital profile

Departments

Doctors

Doctor accounts

Appointment schedule

Live hospital queue

Hospital dashboard

Reports and analytics

Revenue and operational metrics

Frontend Architecture

                         QueueLess Frontend
                                |
                         React Application
                                |
             +------------------+------------------+
             |                  |                  |
             v                  v                  v
          Pages             Components         Layouts
             |                  |                  |
             +------------------+------------------+
                                |
                                v
                           Service Layer
                                |
                 +--------------+--------------+
                 |                             |
                 v                             v
             REST API                       Socket.IO
                 |                             |
                 +--------------+--------------+
                                |
                                v
                         QueueLess Backend

The frontend separates UI, application routing, authentication, API communication, and reusable interface components.

Technology Stack

Technology

Purpose

React

User interface

Vite

Frontend development/build tooling

React Router

Client-side routing

Axios

HTTP API communication

Socket.IO Client

Real-time queue updates

Lucide React

Interface icons

CSS

Application styling

Project Structure

Client/
│
├── public/
│
├── src/
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   └── ProtectedRoute.jsx
│   │
│   ├── layouts/
│   │   └── AppLayout.jsx
│   │
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── HospitalAdminDashboard.jsx
│   │   ├── DoctorDashboard.jsx
│   │   ├── Appointments.jsx
│   │   ├── BookAppointment.jsx
│   │   ├── Queue.jsx
│   │   ├── Analytics.jsx
│   │   ├── Departments.jsx
│   │   ├── Doctors.jsx
│   │   ├── BusinessManagement.jsx
│   │   ├── Profile.jsx
│   │   └── Settings.jsx
│   │
│   ├── services/
│   │   ├── api.js
│   │   ├── adminApi.js
│   │   ├── adminHospitalApi.js
│   │   ├── analyticsService.js
│   │   ├── businessAnalyticsService.js
│   │   ├── businessApi.js
│   │   ├── predictionService.js
│   │   ├── profileApi.js
│   │   ├── queueApi.js
│   │   ├── queueService.js
│   │   └── socket.js
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── index.html
├── package.json
├── vite.config.js
└── package-lock.json

Application Routing

The application uses React Router for client-side navigation.

Public routes include:

/
 /login
 /register

Authenticated routes include:

/dashboard
/queue
/appointments
/book
/analytics
/profile
/settings

Hospital administration routes include:

/admin
/admin/business
/admin/departments
/admin/doctors

The frontend also provides role-specific navigation and dashboards.

Role-Based UI

QueueLess does not show the same application interface to every user.

The authenticated role determines what the user can access.

                         User Login
                              |
                              v
                        Authentication
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
          PATIENT           DOCTOR           ADMIN
             |                |                |
             v                v                v
      Patient Dashboard  Doctor Dashboard  Hospital Dashboard

The protected route layer prevents unauthenticated users from accessing protected application screens.

Administrative routes additionally require the ADMIN role.

Main User Journeys

Patient Appointment Journey

Landing Page
     ↓
Login / Register
     ↓
Patient Dashboard
     ↓
Book Appointment
     ↓
Select Hospital
     ↓
Select Department
     ↓
Select Doctor
     ↓
Select Date
     ↓
Select Available Time
     ↓
Confirm Appointment
     ↓
Appointment Schedule
     ↓
Check In
     ↓
Patient Queue
     ↓
Live Queue Updates
     ↓
Consultation

Doctor Journey

Doctor Login
     ↓
Doctor Dashboard
     ↓
Today's Consultation Schedule
     ↓
Patient Queue
     ↓
Call Next Patient
     ↓
Start Consultation
     ↓
Add Clinical Information
     ↓
Complete Consultation
     ↓
Next Patient

The doctor interface is scoped to the authenticated doctor's hospital and department context.

Hospital Admin Journey

Admin Login
     ↓
Hospital Dashboard
     |
     +-- Hospital Profile
     |
     +-- Departments
     |
     +-- Doctors
     |
     +-- Appointment Schedule
     |
     +-- Queue Monitor
     |
     +-- Reports & Analytics

This gives hospital management a single operational view of the facility.

Real-Time Queue UI

QueueLess uses Socket.IO to update queue information without requiring a manual browser refresh.

Example:

Doctor calls patient
       ↓
Backend updates queue
       ↓
Socket.IO event emitted
       ↓
Connected frontend receives event
       ↓
Queue UI updates

The frontend service layer handles the Socket.IO connection and queue events.

This is used for live queue information such as:

Current token

Queue position

Patients waiting

Estimated waiting time

Called patient

Serving patient

Completed patients

API Service Layer

The frontend keeps API communication outside page components.

The service layer contains separate modules for areas such as:

Authentication / API client
       |
       +-- Admin APIs
       +-- Hospital APIs
       +-- Profile APIs
       +-- Queue APIs
       +-- Analytics APIs
       +-- Business APIs
       +-- Prediction APIs
       +-- Socket.IO

This keeps page components focused primarily on:

UI rendering

User interaction

Page state

Navigation

Calling the appropriate service

rather than scattering HTTP requests throughout the application.

Axios API Client

The main API client communicates with the Express backend.

The development backend normally runs at:

http://localhost:5000/api

The frontend can use an environment-specific API URL rather than hard-coding the production server.

Authentication Flow

The frontend authentication flow is:

Login Form
    ↓
POST /api/auth/login
    ↓
Backend returns JWT + user
    ↓
Token stored on client
    ↓
Authenticated API requests
    ↓
GET /api/auth/me
    ↓
Refresh current user from backend

The current-user request is useful for avoiding stale role or hospital information in local client state.

If an API request returns an authentication failure, the client can clear the local authentication state and return the user to the login flow.

Hospital Data Isolation

The UI is designed around the backend's multi-tenant healthcare structure:

Hospital
   |
   +-- Departments
          |
          +-- Doctors
                 |
                 +-- Appointments
                 |
                 +-- Queue

An administrator works with their connected hospital.

A doctor sees their own clinical context.

A patient sees their own appointments and queue information.

The frontend provides the interface for this separation, while the backend remains responsible for enforcing authorization and tenant isolation.

UI Design

QueueLess uses a clean healthcare-oriented visual system.

The interface focuses on:

White clinical surfaces

Light medical-green backgrounds

Green primary actions

Clear status indicators

Compact KPI cards

Simple navigation

Readable tables

Responsive layouts

Consistent forms

Role-specific dashboards

The design intentionally avoids an overly decorative dashboard style so that operational information remains easy to scan.

Main Screens

Public Landing Page

The landing page introduces:

QueueLess

Appointment booking

Live queue tracking

Hospital workflow

Healthcare departments

Patient, doctor, and hospital workflows

Product benefits

Login and registration actions

Patient Dashboard

The patient dashboard provides a quick overview of:

Upcoming appointments

Appointment status

Queue information

Waiting information

Patient actions

Book Appointment

The booking flow guides the patient through:

Hospital
  ↓
Department
  ↓
Doctor
  ↓
Date
  ↓
Available Slot
  ↓
Appointment Notes
  ↓
Confirmation

This prevents the booking interface from becoming one giant form.

Doctor Dashboard

The doctor dashboard is designed as a clinical workspace rather than a generic analytics page.

It provides:

Consultation KPIs

Today's schedule

Patient queue

Queue controls

Consultation actions

Professional information

Hospital Dashboard

The hospital dashboard provides operational KPIs such as:

Patients scheduled today

Appointments scheduled today

Active queue

Collected revenue today

Active doctors

Department workload

Doctor workload

Upcoming appointments

Appointment volume

Queue activity

Reports & Analytics

The analytics screen presents hospital-level operational information including:

Completed consultations

Average waiting time

Average consultation time

No-show rate

Patient demand by department

Daily visit volume

Operational summaries

Responsive Design

The frontend is designed to work across common desktop and mobile viewport sizes.

Responsive behavior is applied to:

Sidebar/navigation

Dashboard cards

Tables

Forms

Appointment layouts

Queue screens

Analytics sections

Installation

1. Clone the project

git clone <your-repository-url>
cd QueueLess

2. Install frontend dependencies

cd Client
npm install

3. Configure the backend

Make sure the QueueLess backend is running and the frontend API configuration points to it.

Typical development backend:

http://localhost:5000

4. Start the frontend

npm run dev

Vite will provide a local development URL, normally:

http://localhost:5173

Available Scripts

Typical Vite scripts:

npm run dev
npm run build
npm run preview

Development

npm run dev

Starts the Vite development server.

Production Build

npm run build

Creates an optimized production build.

Preview

npm run preview

Serves the production build locally for testing.

Environment Configuration

If the project uses an environment variable for the API URL, create:

Client/.env

Example:

VITE_API_URL=http://localhost:5000/api

Do not commit private credentials or environment secrets to GitHub.

Frontend State & Data Flow

A typical patient queue interaction looks like:

User Action
    ↓
React Page
    ↓
Service Function
    ↓
Axios Request
    ↓
Express API
    ↓
MongoDB
    ↓
API Response
    ↓
React State Update
    ↓
UI Re-render

For live queue updates:

Backend Queue Change
        ↓
Socket.IO Event
        ↓
Frontend Socket Listener
        ↓
React State Update
        ↓
Queue UI Refresh

Error & Loading States

The frontend handles common application states such as:

Loading
Empty
Success
Error
Unauthorized
Unavailable

This is especially important for:

Appointment loading

Doctor availability

Queue status

Dashboard metrics

Analytics

Hospital data

API failures

Why This Frontend Architecture?

The project intentionally separates:

UI
↓
Pages
↓
Reusable Components
↓
Service Layer
↓
Backend API

This makes the application easier to:

Maintain

Debug

Extend

Test

Reuse API logic

Replace backend endpoints

Add new user roles

It also demonstrates a more realistic frontend architecture than putting every API call directly inside large page components.

Production Improvements

Possible future improvements include:

Global state management with Redux Toolkit or Zustand

React Query/TanStack Query for server-state management

Form validation with React Hook Form + Zod

Component testing

End-to-end testing with Playwright

Accessibility improvements

Lazy-loaded routes

Error boundaries

Performance monitoring

Progressive Web App support

Push notifications

Internationalization

Production design system/component library

Project Status

Active Development

QueueLess is a portfolio-grade multi-tenant healthcare platform demonstrating real-world frontend concepts including role-based interfaces, appointment workflows, live queue management, clinical workflows, analytics dashboards, and REST/WebSocket integration.

Author

Mohit Sharma

Full-Stack Developer

QueueLess Frontend
React + Vite + Axios + Socket.IO

License

This project is intended for portfolio and educational purposes.