import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ConnectionManager from './pages/ConnectionManager';
import DataExplorer from './pages/DataExplorer';
import QueryTool from './pages/QueryTool';
import Importer from './pages/Importer';
import Sidebar from './components/Sidebar';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

const Layout = ({ children }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/connections" element={
          <ProtectedRoute>
            <Layout>
              <ConnectionManager />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/explorer/:connectionId?" element={
          <ProtectedRoute>
            <Layout>
              <DataExplorer />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/query" element={
          <ProtectedRoute>
            <Layout>
              <QueryTool />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/import" element={
          <ProtectedRoute>
            <Layout>
              <Importer />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
