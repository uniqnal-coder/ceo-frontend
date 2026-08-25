import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Staff from './pages/Staff';
import Roles from './pages/Roles';
import RoleCategories from './pages/RoleCategories';
import Archive from './pages/Archive';
import Tasks from './pages/Tasks';
import AutoTask from './pages/AutoTask';
import Salary from './pages/Salary';
import Table from './pages/Table';
import LinkPage from './pages/Link';
import PeriodReports from './pages/PeriodReports';
import ReportCenter from './pages/ReportCenter';
import TasksTracking from './pages/TasksTracking';
import Settings from './pages/Settings';
import UserAccounts from './pages/UserAccounts';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/teacher-subjects" element={<RoleCategories appRole="teacher" />} />
          <Route path="/staff-roles" element={<RoleCategories appRole="staff" />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/auto-task" element={<AutoTask />} />
          <Route path="/feedback" element={<Navigate to="/" replace />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/biometry" element={<Navigate to="/" replace />} />
          <Route path="/evaluations" element={<Navigate to="/reports" replace />} />
          <Route path="/today" element={<Navigate to="/" replace />} />
          <Route path="/attendance" element={<Navigate to="/" replace />} />
          <Route path="/announcements" element={<Navigate to="/" replace />} />
          <Route path="/table" element={<Table />} />
          <Route path="/link" element={<LinkPage />} />
          <Route path="/daily-reports" element={<Navigate to="/reports" replace />} />
          <Route path="/reports" element={<ReportCenter />} />
          <Route path="/reports/classic" element={<PeriodReports />} />
          <Route path="/reports/:period" element={<Navigate to="/reports" replace />} />
          <Route path="/tasks-tracking" element={<TasksTracking />} />
          <Route path="/users" element={<UserAccounts />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
