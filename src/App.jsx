import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Students from './pages/Students';
import Staff from './pages/Staff';
import Fees from './pages/Fees';
import Tasks from './pages/Tasks';
import Attendance from './pages/Attendance';
import Feedback from './pages/Feedback';
import Salary from './pages/Salary';
import Biometry from './pages/Biometry';
import Evaluations from './pages/Evaluations';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/students" element={<Students />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/biometry" element={<Biometry />} />
          <Route path="/evaluations" element={<Evaluations />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
