import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Queue = lazy(() => import("./pages/Queue"));
const Appointments = lazy(() => import("./pages/Appointments"));
const AppointmentDetails = lazy(() => import("./pages/AppointmentDetails"));
const Analytics = lazy(() => import("./pages/Analytics"));
const BookAppointment = lazy(() => import("./pages/BookAppointment"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));

const HospitalAdminDashboard = lazy(() => import("./pages/HospitalAdminDashboard"));
const Departments = lazy(() => import("./pages/Departments"));
const Doctors = lazy(() => import("./pages/Doctors"));
const BusinessManagement = lazy(() => import("./pages/BusinessManagement"));
const Workspace = lazy(() => import("./pages/Workspace"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));

export default function App() {
  return (
    <Suspense fallback={<main className="main-content" role="status">Loading QueueLess…</main>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
              <Route path="/admin/business" element={<BusinessManagement />} />
              <Route path="/admin/departments" element={<Departments />} />
              <Route path="/admin/doctors" element={<Doctors />} />
              <Route path="/admin" element={<HospitalAdminDashboard />} />
            </Route>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/workspace/projects/:id" element={<ProjectDetails />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/appointments/:id" element={<AppointmentDetails />} />
            <Route element={<ProtectedRoute roles={["CUSTOMER"]} />}>
              <Route path="/book" element={<BookAppointment />} />
            </Route>
            <Route element={<ProtectedRoute roles={["ADMIN", "STAFF"]} />}>
              <Route path="/analytics" element={<Analytics />} />
            </Route>
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
