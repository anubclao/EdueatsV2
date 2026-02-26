import { ReactNode } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { PendingVerify } from './pages/PendingVerify';
import { Dashboard } from './pages/admin/Dashboard';
import { Recipes } from './pages/admin/Recipes';
import { MenuPlanner } from './pages/admin/MenuPlanner';
import { Users } from './pages/admin/Users';
import { Categories } from './pages/admin/Categories';
import { Roles } from './pages/admin/Roles';
import { Reports as OverviewReports } from './pages/admin/Reports'; // Renamed for clarity
import { KpiReports } from './pages/admin/KpiReports';
import { Notifications } from './pages/admin/Notifications';
import { SurveyManager } from './pages/admin/SurveyManager'; // Import Admin Survey Manager
import { GlobalVariables } from './pages/admin/GlobalVariables'; // Import Global Variables Manager
import { ReportHistory } from './pages/admin/ReportHistory'; // Import Report History
import { StudentDashboard } from './pages/student/StudentDashboard';
import { OrderFlow } from './pages/student/OrderFlow';
import { SurveyForm } from './pages/student/SurveyForm'; // Import Student Survey Form

const PrivateRoute = ({ children, roles }: { children?: ReactNode, roles: string[] }) => {
  const { user } = useAuth();
  
  // 1. Check Authentication
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Middleware: Check Email Verification
  // We allow Admins to bypass because they are demo accounts or manually set
  if (!user.emailVerified && user.role !== 'admin') {
    return <Navigate to="/pending-verify" replace />;
  }

  // 3. Check Role Permission
  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? "/admin/dashboard" : "/student/dashboard"} replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const ORDERING_ROLES = ['student', 'teacher', 'staff', 'visitor'];

  const getHomeRedirect = () => {
    if (!user) return "/login";
    if (!user.emailVerified && user.role !== 'admin') return "/pending-verify";
    return user.role === 'admin' ? "/admin/dashboard" : "/student/dashboard";
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to={getHomeRedirect()} />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={getHomeRedirect()} />} />
      <Route path="/verify" element={<VerifyEmail />} />
      
      {/* Semi-Protected (Authenticated but Unverified) */}
      <Route path="/pending-verify" element={
        user && !user.emailVerified ? <PendingVerify /> : <Navigate to={getHomeRedirect()} />
      } />
      
      {/* Protected Admin Routes */}
      <Route path="/admin" element={<PrivateRoute roles={['admin']}><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} /> {/* Default sub-route */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="reports" element={<Outlet />}>
          <Route index element={<Navigate to="/admin/reports/overview" replace />} />
          <Route path="overview" element={<OverviewReports />} />
          <Route path="kpi" element={<KpiReports />} />
          <Route path="history" element={<ReportHistory />} />
        </Route>
        <Route path="recipes" element={<Recipes />} />
        <Route path="categories" element={<Categories />} />
        <Route path="menu" element={<MenuPlanner />} />
        <Route path="users" element={<Users />} />
        <Route path="roles" element={<Roles />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="surveys" element={<SurveyManager />} />
        <Route path="global-variables" element={<GlobalVariables />} />
      </Route>

      {/* Protected Student Routes (Now accessible by Teacher, Staff, Visitor) */}
      <Route path="/student" element={<PrivateRoute roles={ORDERING_ROLES}><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/student/dashboard" replace />} /> {/* Default sub-route */}
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="order/:date" element={<OrderFlow />} />
        <Route path="survey" element={<SurveyForm />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}