import { lazy, ReactNode, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

const Layout = lazy(() => import('./components/Layout').then((module) => ({ default: module.Layout })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then((module) => ({ default: module.Register })));
const PendingVerify = lazy(() => import('./pages/PendingVerify').then((module) => ({ default: module.PendingVerify })));
const ChatAssistant = lazy(() => import('./pages/ChatAssistant').then((module) => ({ default: module.ChatAssistant })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then((module) => ({ default: module.Dashboard })));
const Recipes = lazy(() => import('./pages/admin/Recipes').then((module) => ({ default: module.Recipes })));
const MenuPlanner = lazy(() => import('./pages/admin/MenuPlanner').then((module) => ({ default: module.MenuPlanner })));
const Users = lazy(() => import('./pages/admin/Users').then((module) => ({ default: module.Users })));
const Categories = lazy(() => import('./pages/admin/Categories').then((module) => ({ default: module.Categories })));
const Roles = lazy(() => import('./pages/admin/Roles').then((module) => ({ default: module.Roles })));
const OverviewReports = lazy(() => import('./pages/admin/Reports').then((module) => ({ default: module.Reports })));
const KpiReports = lazy(() => import('./pages/admin/KpiReports').then((module) => ({ default: module.KpiReports })));
const Notifications = lazy(() => import('./pages/admin/Notifications').then((module) => ({ default: module.Notifications })));
const SurveyManager = lazy(() => import('./pages/admin/SurveyManager').then((module) => ({ default: module.SurveyManager })));
const GlobalVariables = lazy(() => import('./pages/admin/GlobalVariables').then((module) => ({ default: module.GlobalVariables })));
const ReportHistory = lazy(() => import('./pages/admin/ReportHistory').then((module) => ({ default: module.ReportHistory })));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard').then((module) => ({ default: module.StudentDashboard })));
const OrderFlow = lazy(() => import('./pages/student/OrderFlow').then((module) => ({ default: module.OrderFlow })));
const SurveyForm = lazy(() => import('./pages/student/SurveyForm').then((module) => ({ default: module.SurveyForm })));

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
    Cargando...
  </div>
);

const PrivateRoute = ({ children, roles }: { children?: ReactNode, roles: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <RouteFallback />;
  
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
  const { user, isLoading } = useAuth();
  const ORDERING_ROLES = ['student', 'teacher', 'staff', 'visitor'];

  if (isLoading) return <RouteFallback />;

  const getHomeRedirect = () => {
    if (!user) return "/login";
    if (!user.emailVerified && user.role !== 'admin') return "/pending-verify";
    return user.role === 'admin' ? "/admin/dashboard" : "/student/dashboard";
  };

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to={getHomeRedirect()} />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to={getHomeRedirect()} />} />
        <Route path="/verify" element={<Navigate to="/login" replace />} />
        
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
          <Route path="assistant" element={<ChatAssistant />} />
        </Route>

        {/* Protected Student Routes (Now accessible by Teacher, Staff, Visitor) */}
        <Route path="/student" element={<PrivateRoute roles={ORDERING_ROLES}><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/student/dashboard" replace />} /> {/* Default sub-route */}
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="order/:date" element={<OrderFlow />} />
          <Route path="survey" element={<SurveyForm />} />
          <Route path="assistant" element={<ChatAssistant />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
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