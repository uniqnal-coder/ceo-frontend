import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Staff from './pages/Staff';
import Roles from './pages/Roles';
import Archive from './pages/Archive';
import Tasks from './pages/Tasks';
import AutoTask from './pages/AutoTask';
import Feedback from './pages/Feedback';
import Salary from './pages/Salary';
import Biometry from './pages/Biometry';
import Announcements from './pages/Announcements';
import Attendance from './pages/Attendance';
import PeriodReports from './pages/PeriodReports';
import TasksTracking from './pages/TasksTracking';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/auto-task" element={<AutoTask />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/biometry" element={<Biometry />} />
          <Route path="/evaluations" element={<Navigate to="/reports" replace />} />
          <Route path="/today" element={<Navigate to="/attendance" replace />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/daily-reports" element={<Navigate to="/reports" replace />} />
          <Route path="/reports" element={<PeriodReports />} />
          <Route path="/reports/:period" element={<Navigate to="/reports" replace />} />
          <Route path="/tasks-tracking" element={<TasksTracking />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
