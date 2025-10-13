// src/components/NavBar.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { FaChartLine, FaCode, FaHome } from 'react-icons/fa';

const NavContainer = styled.nav`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-bottom: 2px solid #00d4aa;
  padding: 0 2rem;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 212, 170, 0.1);
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
  background: linear-gradient(135deg, #00d4aa, #00a8cc);
  color: #000;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  margin-right: 12px;
  box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
`;

const LogoText = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
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
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  font-size: 16px;
  color: ${props => props.active ? '#00d4aa' : '#b0b0b0'};
  background: ${props => props.active ? 'rgba(0, 212, 170, 0.1)' : 'transparent'};
  border: ${props => props.active ? '1px solid rgba(0, 212, 170, 0.3)' : '1px solid transparent'};
  
  &:hover {
    color: #00d4aa;
    background: rgba(0, 212, 170, 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 212, 170, 0.2);
  }
`;

const IconWrapper = styled.div`
  font-size: 16px;
`;

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
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
        </NavLinks>
      </NavContent>
    </NavContainer>
  );
};

export default NavBar;
