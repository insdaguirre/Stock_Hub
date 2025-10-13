import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const RegisterCard = styled.div`
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

// const SuccessMessage = styled.div`
//   background: linear-gradient(135deg, #1b2d1b 0%, #2a3d2a 100%);
//   border: 1px solid ${colors.bullGreen};
//   border-radius: 6px;
//   padding: 12px;
//   color: ${colors.bullGreen};
//   font-size: 14px;
//   text-align: center;
// `;

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

const PasswordStrength = styled.div`
  font-size: 12px;
  color: ${colors.textTertiary};
  margin-top: 0.25rem;
`;

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const getPasswordStrength = (password) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'Weak - at least 6 characters';
    if (password.length < 8) return 'Fair - consider 8+ characters';
    if (password.length >= 8) return 'Strong password';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    setLoading(true);

    const result = await register(username, email, password);
    
    if (result.success) {
      navigate('/predict');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <PageContainer>
      <FinanceBackground />
      <RegisterCard>
        <Title>Create Account</Title>
        <Subtitle>Join StockHub to access predictions</Subtitle>
        
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              minLength={3}
            />
          </InputGroup>
          
          <InputGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
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
              placeholder="Create a password"
              required
              minLength={6}
            />
            <PasswordStrength>
              {getPasswordStrength(password)}
            </PasswordStrength>
          </InputGroup>
          
          <InputGroup>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </InputGroup>
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          
          <Button type="submit" disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Create Account'}
          </Button>
        </Form>
        
        <LinkText>
          Already have an account? <StyledLink to="/login">Sign in</StyledLink>
        </LinkText>
      </RegisterCard>
    </PageContainer>
  );
};

export default RegisterPage;
