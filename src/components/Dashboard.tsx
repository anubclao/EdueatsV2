import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home } from '../pages/Home'; // Assuming a Home page
import { AdminDashboard } from '../pages/admin/AdminDashboard'; // Assuming an Admin Dashboard
import { GlobalVariables } from '../pages/admin/GlobalVariables'; // Assuming a Global Variables Page
import { StudentDashboard } from '../pages/student/StudentDashboard'; // Assuming a Student Dashboard
import { OrderPage } from '../pages/student/OrderPage'; // Assuming an Order Page

interface DashboardProps {
  session: Session;
}

export default function Dashboard({ session: _session }: DashboardProps) {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center">
          <Link to="/" className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">EduEats</Link>
          <nav className="flex flex-wrap justify-center gap-2 sm:space-x-4">
            <Link to="/admin" className="text-gray-600 hover:text-gray-900">Admin</Link>
            <Link to="/admin/global-variables" className="text-gray-600 hover:text-gray-900">Global Variables</Link>
            <Link to="/student" className="text-gray-600 hover:text-gray-900">Student</Link>
            <button
              className="px-3 py-1 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              onClick={handleLogout}
            >
              Logout
            </button>
          </nav>
        </header>
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/global-variables" element={<GlobalVariables />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/order/:date" element={<OrderPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
