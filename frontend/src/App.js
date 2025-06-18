import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import NewSubscriptions from './pages/NewSubscriptions';
import EvacuationRequests from './pages/EvacuationRequests';
import NewConnections from './pages/NewConnectionApplications';
import NewConnectionApplications from './pages/NewConnectionApplications';
import Layout from './components/Layout';
import { ThemeProvider, createTheme } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />
          <Route path="/dashboard/new-subscriptions" element={
            <Layout>
              <NewSubscriptions />
            </Layout>
          } />
          <Route path="/dashboard/evacuation-requests" element={
            <Layout>
              <EvacuationRequests />
            </Layout>
          } />
          <Route path="/dashboard/new-connections" element={
            <Layout>
              <NewConnections />
            </Layout>
          } />
          <Route path="/dashboard/new-connection-applications" element={
            <Layout>
              <NewConnectionApplications />
            </Layout>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
