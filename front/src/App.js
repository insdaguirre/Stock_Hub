// src/App.js
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import PredictPage from './components/PredictPage';
import DevPage from './components/DevPage';
import StockPage from './components/StockPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

const PageLayout = ({ children }) => (
  <>
    <NavBar />
    {children}
    <Footer />
  </>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={
            <PageLayout>
              <LandingPage />
            </PageLayout>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/predict" element={
            <ProtectedRoute>
              <PageLayout>
                <PredictPage />
              </PageLayout>
            </ProtectedRoute>
          } />
          <Route path="/dev" element={
            <PageLayout>
              <DevPage />
            </PageLayout>
          } />
          <Route path="/stock/:symbol" element={<StockPage />} />
        </Routes>
        <ToastContainer />
      </Router>
    </AuthProvider>
  );
}

export default App;
