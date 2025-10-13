// src/App.js
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import PredictPage from './components/PredictPage';
import DevPage from './components/DevPage';
import StockPage from './components/StockPage';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
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
    <Router>
      <Routes>
        <Route path="/" element={
          <PageLayout>
            <LandingPage />
          </PageLayout>
        } />
        <Route path="/predict" element={
          <PageLayout>
            <PredictPage />
          </PageLayout>
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
  );
}

export default App;
