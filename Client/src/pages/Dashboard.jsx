import { useAuth } from "../context/AuthContext";
import CustomerDashboard from "./CustomerDashboard";
import HospitalAdminDashboard from "./HospitalAdminDashboard";
import BusinessDashboard from "./BusinessDashboard";
import DoctorDashboard from "./DoctorDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === "ADMIN") return <HospitalAdminDashboard />;
  if (user?.role === "DOCTOR") return <DoctorDashboard />;
  // STAFF is retained only for backwards compatibility with older accounts.
  if (user?.role === "STAFF") return <BusinessDashboard />;
  return <CustomerDashboard />;
}
