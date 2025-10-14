import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import FinanceBackground from './FinanceBackground';
import colors from '../styles/colors';

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.gradientDark};
  color: ${colors.textPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow-x: hidden;
`;

const LoginCard = styled.div`
  background: ${colors.gradientCard};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 3rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px ${colors.shadowMedium};
  position: relative;
  z-index: 1;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin: 0 0 0.5rem 0;
  text-align: center;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: ${colors.textSecondary};
  margin: 0 0 2rem 0;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${colors.textPrimary};
`;

const Input = styled.input`
  padding: 12px 16px;
  background: ${colors.darkBackground};
  border: 1px solid ${colors.border};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-size: 16px;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.bullGreen};
    box-shadow: 0 0 0 2px ${colors.focus};
  }
  
  &::placeholder {
    color: ${colors.textTertiary};
  }
`;

const Button = styled.button`
  background: ${colors.bullGreen};
  color: #000;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.3);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: linear-gradient(135deg, #2d1b1b 0%, #3d2a2a 100%);
  border: 1px solid ${colors.bearRed};
  border-radius: 6px;
  padding: 12px;
  color: ${colors.bearRed};
  font-size: 14px;
  text-align: center;
`;

const LinkText = styled.p`
  text-align: center;
  margin-top: 1.5rem;
  color: ${colors.textSecondary};
  font-size: 14px;
`;

const StyledLink = styled(Link)`
  color: ${colors.bullGreen};
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoginPage = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Lazy initialization - wait for content to load
  useEffect(() => {
    const timer = setTimeout(() => {
      setContentLoaded(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Get the intended destination from state, default to /predict
  const from = location.state?.from || '/predict';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(usernameOrEmail, password);
    
    if (result.success) {
      // Redirect to the intended destination or default to /predict
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <PageContainer>
      {contentLoaded && <FinanceBackground />}
      <LoginCard>
        <Title>Welcome Back</Title>
        <Subtitle>Sign in to access your account</Subtitle>
        
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="usernameOrEmail">Username or Email</Label>
            <Input
              id="usernameOrEmail"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="Enter your username or email"
              required
            />
          </InputGroup>
          
          <InputGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </InputGroup>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          
          <Button type="submit" disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Sign In'}
          </Button>
        </Form>
        
        <LinkText>
          Don't have an account? <StyledLink to="/register">Sign up</StyledLink>
        </LinkText>
      </LoginCard>
    </PageContainer>
  );
};

export default LoginPage;
