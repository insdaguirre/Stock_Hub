import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import colors from '../styles/colors';

const LoadingContainer = styled.div`
  min-height: 100vh;
  background: ${colors.gradientDark};
  color: ${colors.textPrimary};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${colors.border};
  border-top: 4px solid ${colors.bullGreen};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: ${colors.textSecondary};
  font-size: 16px;
  margin: 0;
`;

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - auth check:', { loading, isAuth: isAuthenticated() });

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <LoadingText>Loading...</LoadingText>
      </LoadingContainer>
    );
  }

  if (!isAuthenticated()) {
    console.log('ProtectedRoute - redirecting to login');
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('ProtectedRoute - allowing access');
  return children;
};

export default ProtectedRoute;
