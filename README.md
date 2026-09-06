QueueLess | Multi-Tenant Healthcare SaaS

QueueLess is a full-stack healthcare appointment and real-time patient queue management platform built with the MERN stack and Socket.IO.

The project is designed around a realistic hospital workflow where patients can book appointments with specific doctors, doctors can manage consultations and live queues, and hospital administrators can manage departments, doctors, appointments, queues, and operational analytics from one system.

🚀 Project Overview

Traditional outpatient healthcare workflows can involve:

Long waiting times

Unclear queue positions

Manual appointment handling

Poor visibility for hospital staff

Difficulty managing doctor schedules

Limited operational analytics

QueueLess addresses these problems by connecting appointments, doctor availability, check-in, live queues, consultations, and hospital analytics into one platform.

Core workflow

Patient
   ↓
Hospital
   ↓
Department
   ↓
Doctor
   ↓
Appointment
   ↓
Check-In
   ↓
Live Queue
   ↓
Consultation
   ↓
Completion
   ↓
Analytics

🏥 Multi-Tenant Architecture

QueueLess is structured as a multi-tenant healthcare platform.

The primary relationship is:

Hospital
   │
   ├── Departments
   │      │
   │      └── Doctors
   │
   ├── Appointments
   │
   ├── Patient Queues
   │
   └── Analytics

Each hospital operates within its own administrative context.

Hospital administrators manage their connected hospital, while doctors operate within their assigned department and patients access their own appointments and queue information.

The backend enforces authorization and hospital ownership checks. The frontend reflects those permissions through role-based routing and navigation.

👥 User Roles

QueueLess provides different experiences for different users.

Role

Main capabilities

Patient

Book appointments, view appointments, check in, track queue

Doctor

Manage schedule, call patients, conduct consultations, update clinical information

Hospital Admin

Manage hospital, departments, doctors, appointments, queues and analytics

Staff

Legacy compatibility role

👤 Patient Experience

A patient can:

Create an account

Log in securely

Browse hospitals

Select a department

Select a doctor

View doctor availability

Choose an appointment date

Choose an available time slot

Add appointment notes

Book an appointment

View appointment history

Check in

Track live queue position

View estimated waiting time

Cancel eligible appointments

View profile information

Patient booking flow

Select Hospital
      ↓
Select Department
      ↓
Select Doctor
      ↓
Select Date
      ↓
View Available Slots
      ↓
Select Time
      ↓
Confirm Appointment
      ↓
Check In
      ↓
Join Queue
      ↓
Track Queue

👨‍⚕️ Doctor Experience

Doctors receive a dedicated clinical dashboard.

They can:

View today's consultations

See scheduled consultations

See checked-in patients

Monitor their active queue

Call the next patient

Start a consultation

Complete a consultation

Skip a patient

Mark a patient as no-show

Add consultation notes

Record diagnosis

Record prescription

Manage professional profile information

Doctor consultation workflow

Patient Waiting
      ↓
Call Next
      ↓
CALLED
      ↓
Start Consultation
      ↓
SERVING
      ↓
Add Clinical Information
      ↓
Complete Consultation
      ↓
COMPLETED

🏢 Hospital Administration

Hospital administrators have a hospital control center for managing operations.

Hospital Profile

Administrators can manage:

Hospital name

Description

Category

Address

Phone

Email

Opening hours

Hospital status

Departments

Administrators can:

Create departments

Edit departments

Activate/deactivate departments

Configure appointment duration

Configure consultation fees

Assign doctors

Doctors

Administrators can:

Create doctor accounts

Assign doctors to departments

Edit doctor profiles

Set designation

Set specialization

Set license number

Set experience

Set consultation fee

Change doctor status

Doctor statuses:

ACTIVE
ON_LEAVE
INACTIVE

Appointment Schedule

Hospital management can view hospital-wide appointments and filter them by operational status.

Queue Monitor

Administrators can monitor:

Active patients

Current queue

Queue status

Recent queue activity

Reports & Analytics

Hospital analytics include:

Completed consultations

Average waiting time

Average consultation time

No-show rate

Department demand

Daily visit volume

Appointment performance

Revenue information

⚡ Real-Time Queue Management

One of the main features of QueueLess is real-time queue tracking.

The queue lifecycle is:

WAITING
   ↓
CALLED
   ↓
SERVING
   ↓
COMPLETED

Alternative terminal states include:

SKIPPED
CANCELLED
NO_SHOW

Queue entries track information such as:

Token number

Position

Estimated wait time

Patient

Doctor

Department

Hospital

Queue status

Priority

Timestamps

🔄 Real-Time Architecture

QueueLess uses Socket.IO to push queue changes to connected clients.

Doctor Action
     ↓
Backend Queue Update
     ↓
Queue Recalculation
     ↓
Socket.IO Event
     ↓
Hospital Room
     ↓
Connected Patients / Doctors
     ↓
React UI Updates

This means patients do not have to repeatedly refresh the page to see queue changes.

Hospital-specific Socket.IO rooms are used so queue events can remain scoped to the appropriate hospital.

⏱️ Wait-Time Prediction

QueueLess also contains a wait-time prediction layer.

The prediction logic can consider:

Number of patients ahead

Active queue state

Historical consultation duration

Average service duration

Current queue activity

Time-based historical patterns

Buffer time

The frontend can use prediction information to present patients with an estimated waiting time rather than only showing a token number.

📊 Analytics

QueueLess provides hospital-level operational analytics.

Analytics can include:

Appointment status

Queue status

Completed consultations

Average waiting time

Average consultation duration

No-show rate

Department demand

Daily visit volume

Hourly demand

Revenue

Doctor workload

Department workload

Historical consultation data can be used to calculate operational metrics and improve waiting-time estimates.

🧠 Technical Architecture

                         QueueLess
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
       Frontend                            Backend
          │                                   │
     React + Vite                       Node.js + Express
          │                                   │
     React Router                         REST APIs
          │                                   │
        Axios                              Services
          │                                   │
   Socket.IO Client                     Mongoose
          │                                   │
          └───────────────┬───────────────────┘
                          │
                       MongoDB

🛠️ Technology Stack

Frontend

React

Vite

React Router

Axios

Socket.IO Client

Lucide React

CSS

Backend

Node.js

Express.js

MongoDB

Mongoose

JWT

bcrypt

Socket.IO

CORS

dotenv

📁 Repository Structure

QueueLess/
│
├── Client/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── middleware/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── styles.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── Server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
│
└── README.md

🔐 Authentication & Authorization

QueueLess uses JWT authentication.

The general authentication flow is:

Login
  ↓
Credentials Verified
  ↓
JWT Generated
  ↓
Token Sent to Client
  ↓
Protected API Requests
  ↓
Backend Authentication Middleware
  ↓
User + Role Identified

The frontend also refreshes the current authenticated user from the backend to avoid relying on stale client-side role or hospital information.

Protected routes are separated according to user permissions.

🧩 Frontend Architecture

The frontend follows a page, component, layout, and service separation.

React Page
    ↓
Reusable Components
    ↓
Service Layer
    ↓
Axios / Socket.IO
    ↓
Backend

The service layer contains API modules for areas such as:

Authentication
Admin APIs
Hospital APIs
Profile APIs
Queue APIs
Analytics APIs
Business APIs
Prediction APIs
Socket.IO

This keeps API communication separate from the visual components.

🔌 Backend Architecture

The backend follows a route, controller, service, and model structure.

HTTP Request
     ↓
Route
     ↓
Authentication
     ↓
Authorization
     ↓
Controller
     ↓
Service
     ↓
Mongoose Model
     ↓
MongoDB

The service layer handles reusable business logic such as:

Queue calculation

Wait-time prediction

Analytics

Historical service calculations

🗃️ Main Database Models

QueueLess uses MongoDB with Mongoose.

Core models include:

User
Business
Department
Doctor
Appointment
Queue
Service
ServiceHistory

Relationship

User
 ├── Patient
 ├── Doctor
 └── Admin

Business
 ├── Department
 ├── Doctor
 ├── Appointment
 └── Queue

Department
 └── Doctor

Appointment
 └── Queue

Appointment
 └── ServiceHistory

📅 Appointment Status

Appointments can move through states such as:

SCHEDULED
CONFIRMED
CHECKED_IN
COMPLETED
CANCELLED
NO_SHOW

The backend controls status transitions and synchronizes related queue state where necessary.

📋 Queue Status

Queue entries support:

WAITING
CALLED
SERVING
COMPLETED
SKIPPED
CANCELLED
NO_SHOW

The queue service recalculates positions after relevant queue changes.

🌐 Important API Areas

The backend exposes APIs for:

/api/auth
/api/businesses
/api/profile
/api/appointments
/api/queue
/api/doctors
/api/admin/business
/api/admin/departments
/api/admin/doctors
/api/doctor/dashboard
/api/business/dashboard
/api/analytics
/api/predictions

Health check:

GET /api/health

💻 Running the Project Locally

Prerequisites

Install:

Node.js

npm

MongoDB

1. Clone the repository

git clone <your-repository-url>
cd QueueLess

2. Install backend dependencies

cd Server
npm install

Create:

Server/.env

Example:

PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/queueless
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secure_jwt_secret

Start the backend:

npm run dev

The API normally runs at:

http://localhost:5000

3. Install frontend dependencies

Open another terminal:

cd Client
npm install

If API configuration is environment-based, configure:

VITE_API_URL=http://localhost:5000/api

Start the frontend:

npm run dev

The Vite application normally runs at:

http://localhost:5173

🩺 Health Check

Once the backend is running:

GET http://localhost:5000/api/health

This can be used to verify that the API is available.

🎯 Example Hospital Structure

QueueLess can represent a hospital like:

AIMA Multispeciality Hospital
│
├── Dental
│   ├── Dr. Ananya Sharma
│   └── Additional Doctors
│
├── Blood Test
│   └── Dr. Rohan Verma
│
├── BP Check
│   └── Dr. Arjun Singh
│
└── X-Ray
    └── Dr. Neha Gupta

The important architectural point is that multiple doctors can belong to the same department.

📱 Application Screens

Public

Landing page

Login

Registration

Patient

Patient Dashboard

Book Appointment

Appointments

My Queue

Profile

Settings

Doctor

Doctor Dashboard

Patient Queue

Consultation workflow

Profile

Hospital Admin

Hospital Dashboard

Hospital Profile

Departments

Doctors

Appointment Schedule

Queue Monitor

Reports & Analytics

Profile

🧪 Development & Engineering Concepts Demonstrated

This project demonstrates practical full-stack engineering concepts including:

REST API design

React component architecture

Client-side routing

JWT authentication

Role-based authorization

Multi-tenant architecture

MongoDB schema design

Mongoose relationships

Service-layer architecture

Queue algorithms

Real-time WebSocket communication

Socket.IO rooms

Appointment state machines

Doctor workflows

Consultation management

Analytics aggregation

Historical data processing

Wait-time prediction

Error handling

Hospital-level access control

Responsive UI design

🚧 Future Improvements

Potential production-level extensions include:

SaaS subscription and billing

Hospital self-service onboarding

Platform-level super-admin

Email/SMS/WhatsApp notifications

Redis-backed distributed queues

Background job processing

Audit logs

Advanced API validation

Rate limiting

Refresh-token rotation

Automated unit/integration tests

End-to-end testing

CI/CD

Cloud deployment

Advanced monitoring and observability

Prescription/document generation

Patient notification preferences

📌 Project Status

Active Development

QueueLess is being developed as a portfolio-grade, multi-tenant healthcare platform focused on solving a real operational problem: coordinating appointments and patient queues while giving hospitals, doctors, and patients a shared real-time view of the process.

👨‍💻 Author

Mohit Sharma

Full-Stack Developer

QueueLess
React + Node.js + Express + MongoDB + Socket.IO

📄 License

This project is intended for portfolio and educational purposes.