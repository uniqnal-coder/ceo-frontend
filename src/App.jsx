import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Staff from './pages/Staff';
import Tasks from './pages/Tasks';
import AutoTask from './pages/AutoTask';
import Feedback from './pages/Feedback';
import Salary from './pages/Salary';
import Biometry from './pages/Biometry';
import Evaluations from './pages/Evaluations';
import Announcements from './pages/Announcements';
import TodayBoard from './pages/TodayBoard';
import DailyReportsFeed from './pages/DailyReportsFeed';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/auto-task" element={<AutoTask />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/biometry" element={<Biometry />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/today" element={<TodayBoard />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/daily-reports" element={<DailyReportsFeed />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
