// src/components/NavBar.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { FaChartLine, FaCode, FaHome, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import colors from '../styles/colors';

const NavContainer = styled.nav`
  background: ${colors.gradientDark};
  border-bottom: 1px solid ${colors.border};
  padding: 0 2rem;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 8px ${colors.shadowLight};
`;

const NavContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const LogoIcon = styled.div`
  background: ${colors.cardBackground};
  color: ${colors.bullGreen};
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  margin-right: 12px;
  border: 1px solid ${colors.border};
  box-shadow: 0 2px 4px ${colors.shadowLight};
`;

const LogoText = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin: 0;
  letter-spacing: -0.5px;
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const NavLink = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 16px;
  color: ${props => props.active ? colors.bullGreen : colors.textSecondary};
  background: ${props => props.active ? colors.hover : 'transparent'};
  border: ${props => props.active ? `1px solid ${colors.bullGreen}` : '1px solid transparent'};
  
  &:hover {
    color: ${colors.bullGreen};
    background: ${colors.hover};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${colors.shadowMedium};
  }
`;

const IconWrapper = styled.div`
  font-size: 16px;
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${colors.textSecondary};
  font-size: 14px;
`;

const AuthButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 14px;
  border: 1px solid transparent;
  background: transparent;
  color: ${colors.textSecondary};
  
  &:hover {
    color: ${colors.bullGreen};
    background: ${colors.hover};
    transform: translateY(-1px);
  }
`;

const LogoutButton = styled(AuthButton)`
  color: ${colors.bearRed};
  
  &:hover {
    color: ${colors.bearRed};
    background: rgba(255, 99, 99, 0.1);
  }
`;

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <NavContainer>
      <NavContent>
        <Logo onClick={() => navigate('/')}>
          <LogoIcon>SH</LogoIcon>
          <LogoText>StockHub</LogoText>
        </Logo>
        
        <NavLinks>
          <NavLink 
            active={isActive('/')} 
            onClick={() => navigate('/')}
          >
            <IconWrapper><FaHome /></IconWrapper>
            Hub
          </NavLink>
          <NavLink 
            active={isActive('/predict')} 
            onClick={() => navigate('/predict')}
          >
            <IconWrapper><FaChartLine /></IconWrapper>
            Predict
          </NavLink>
          <NavLink 
            active={isActive('/dev')} 
            onClick={() => navigate('/dev')}
          >
            <IconWrapper><FaCode /></IconWrapper>
            Dev
          </NavLink>
          
          <UserSection>
            {isAuthenticated() ? (
              <>
                <UserInfo>
                  <IconWrapper><FaUser /></IconWrapper>
                  {user?.username}
                </UserInfo>
                <LogoutButton onClick={handleLogout}>
                  <IconWrapper><FaSignOutAlt /></IconWrapper>
                  Logout
                </LogoutButton>
              </>
            ) : (
              <AuthButton onClick={() => navigate('/login')}>
                <IconWrapper><FaUser /></IconWrapper>
                Login
              </AuthButton>
            )}
          </UserSection>
        </NavLinks>
      </NavContent>
    </NavContainer>
  );
};

export default NavBar;
