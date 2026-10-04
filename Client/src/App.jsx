import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Queue from "./pages/Queue";
import Appointments from "./pages/Appointments";
import AppointmentDetails from "./pages/AppointmentDetails";
import Analytics from "./pages/Analytics";
import BookAppointment from "./pages/BookAppointment";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";

import HospitalAdminDashboard from "./pages/HospitalAdminDashboard";
import Departments from "./pages/Departments";
import Doctors from "./pages/Doctors";
import DoctorDashboard from "./pages/DoctorDashboard";
import BusinessManagement from "./pages/BusinessManagement";
import Workspace from "./pages/Workspace";
import ProjectDetails from "./pages/ProjectDetails";

export default function App() {
  return (
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
          <Route path="/book" element={<BookAppointment />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
