// src/components/NavBar.js
import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { FaBars, FaChartLine, FaCode, FaTimes, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import colors from '../styles/colors';

const mobileBreakpoint = '900px';

const NavContainer = styled.nav`
  background: ${colors.gradientDark};
  border-bottom: 1px solid ${colors.border};
  padding: 0 2rem;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 8px ${colors.shadowLight};

  @media (max-width: ${mobileBreakpoint}) {
    padding: 0 1rem;
  }
`;

const NavContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
  gap: 1rem;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px 12px;
  border-radius: 6px;
  background: ${props => props.active ? colors.hover : 'transparent'};
  border: ${props => props.active ? `1px solid ${colors.bullGreen}` : '1px solid transparent'};
  
  &:hover {
    transform: translateY(-2px);
    background: ${colors.hover};
  }

  @media (max-width: ${mobileBreakpoint}) {
    padding: 8px 10px 8px 0;
  }
`;

const LogoIcon = styled.div`
  background: ${colors.cardBackground};
  color: ${props => props.active ? colors.bullGreen : colors.bullGreen};
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  margin-right: 12px;
  border: 1px solid ${props => props.active ? colors.bullGreen : colors.border};
  box-shadow: 0 2px 4px ${colors.shadowLight};
  transition: all 0.2s ease;
`;

const LogoText = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin: 0;
  letter-spacing: -0.5px;

  @media (max-width: 480px) {
    font-size: 20px;
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const NavLink = styled.button`
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

  &:focus-visible {
    outline: 2px solid ${colors.bullGreen};
    outline-offset: 2px;
  }

  @media (max-width: ${mobileBreakpoint}) {
    width: 100%;
    justify-content: flex-start;
    padding: 14px 16px;
  }
`;

const IconWrapper = styled.div`
  font-size: 16px;
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: ${mobileBreakpoint}) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid ${colors.border};
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${colors.textSecondary};
  font-size: 14px;

  @media (max-width: ${mobileBreakpoint}) {
    padding: 0 0.5rem;
  }
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

  &:focus-visible {
    outline: 2px solid ${colors.bullGreen};
    outline-offset: 2px;
  }

  @media (max-width: ${mobileBreakpoint}) {
    width: 100%;
    justify-content: flex-start;
    padding: 14px 16px;
    border: 1px solid ${colors.border};
    background: ${colors.cardBackground};
  }
`;

const LogoutButton = styled(AuthButton)`
  color: ${colors.bearRed};
  
  &:hover {
    color: ${colors.bearRed};
    background: rgba(255, 99, 99, 0.1);
  }
`;

const DesktopOnly = styled.div`
  display: flex;
  align-items: center;
  gap: inherit;

  @media (max-width: ${mobileBreakpoint}) {
    display: none;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 10px;
  border: 1px solid ${props => props.$isOpen ? colors.bullGreen : colors.border};
  color: ${props => props.$isOpen ? colors.bullGreen : colors.textPrimary};
  background: ${props => props.$isOpen ? colors.hover : colors.cardBackground};
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px ${colors.shadowLight};
  flex-shrink: 0;

  &:hover {
    color: ${colors.bullGreen};
    background: ${colors.hover};
  }

  &:focus-visible {
    outline: 2px solid ${colors.bullGreen};
    outline-offset: 2px;
  }

  @media (max-width: ${mobileBreakpoint}) {
    display: inline-flex;
  }
`;

const MobileMenuPanel = styled.div`
  display: none;

  @media (max-width: ${mobileBreakpoint}) {
    position: absolute;
    top: calc(100% + 0.75rem);
    left: 1rem;
    right: 1rem;
    display: ${props => props.$isOpen ? 'block' : 'none'};
  }
`;

const MobileNavLinks = styled(NavLinks)`
  @media (max-width: ${mobileBreakpoint}) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1rem;
    background: ${colors.gradientCard};
    border: 1px solid ${colors.borderLight};
    border-radius: 14px;
    box-shadow: ${colors.shadowCard};
    backdrop-filter: blur(14px);
  }
`;

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef(null);
  const mobileMenuId = useId();

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
  };

  const handleNavigate = (path) => {
    setIsMobileMenuOpen(false);
    navigate(path);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((current) => !current);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <NavContainer ref={navRef}>
      <NavContent>
        <Logo active={isActive('/')} onClick={() => handleNavigate('/')}>
          <LogoIcon active={isActive('/')}>SH</LogoIcon>
          <LogoText>StockHub</LogoText>
        </Logo>

        <DesktopOnly>
          <NavLinks>
            <NavLink
              type="button"
              active={isActive('/predict')}
              onClick={() => handleNavigate('/predict')}
            >
              <IconWrapper><FaChartLine /></IconWrapper>
              Predict
            </NavLink>
            <NavLink
              type="button"
              active={isActive('/dev')}
              onClick={() => handleNavigate('/dev')}
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
                <AuthButton onClick={() => handleNavigate('/login')}>
                  <IconWrapper><FaUser /></IconWrapper>
                  Login
                </AuthButton>
              )}
            </UserSection>
          </NavLinks>
        </DesktopOnly>

        <MobileMenuButton
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls={mobileMenuId}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          $isOpen={isMobileMenuOpen}
          onClick={toggleMobileMenu}
        >
          <IconWrapper>{isMobileMenuOpen ? <FaTimes /> : <FaBars />}</IconWrapper>
        </MobileMenuButton>

        <MobileMenuPanel id={mobileMenuId} $isOpen={isMobileMenuOpen}>
          <MobileNavLinks>
            <NavLink
              type="button"
              active={isActive('/predict')}
              onClick={() => handleNavigate('/predict')}
            >
              <IconWrapper><FaChartLine /></IconWrapper>
              Predict
            </NavLink>
            <NavLink
              type="button"
              active={isActive('/dev')}
              onClick={() => handleNavigate('/dev')}
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
                <AuthButton onClick={() => handleNavigate('/login')}>
                  <IconWrapper><FaUser /></IconWrapper>
                  Login
                </AuthButton>
              )}
            </UserSection>
          </MobileNavLinks>
        </MobileMenuPanel>
      </NavContent>
    </NavContainer>
  );
};

export default NavBar;
