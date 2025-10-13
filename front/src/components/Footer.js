// src/components/Footer.js
import React from 'react';
import styled from 'styled-components';
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import colors from '../styles/colors';

const FooterContainer = styled.footer`
  background: ${colors.gradientDark};
  border-top: 1px solid ${colors.border};
  padding: 2rem 0;
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
`;

const FooterBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BrandIcon = styled.div`
  background: ${colors.cardBackground};
  color: ${colors.bullGreen};
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  border: 1px solid ${colors.border};
  box-shadow: 0 1px 3px ${colors.shadowLight};
`;

const BrandText = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${colors.textPrimary};
  margin: 0;
  letter-spacing: -0.3px;
`;

const SocialLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 6px;
  text-decoration: none;
  color: ${colors.textSecondary};
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  
  &:hover {
    color: ${colors.bullGreen};
    background: ${colors.hover};
    border-color: ${colors.bullGreen};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${colors.shadowMedium};
  }
`;

const IconWrapper = styled.div`
  font-size: 16px;
`;

const Copyright = styled.p`
  color: ${colors.textTertiary};
  font-size: 12px;
  margin: 0;
  text-align: center;
`;

const Footer = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterBrand>
          <BrandIcon>SH</BrandIcon>
          <BrandText>StockHub</BrandText>
        </FooterBrand>
        
        <SocialLinks>
          <SocialLink 
            href="https://github.com/insdaguirre" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <IconWrapper><FaGithub /></IconWrapper>
            GitHub
          </SocialLink>
          <SocialLink 
            href="https://www.linkedin.com/in/diego-aguirre-110729219" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <IconWrapper><FaLinkedin /></IconWrapper>
            LinkedIn
          </SocialLink>
          <SocialLink 
            href="https://insdaguirre.github.io/" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <IconWrapper><FaEnvelope /></IconWrapper>
            Contact
          </SocialLink>
        </SocialLinks>
        
        <Copyright>
          © 2025 Diego Aguirre. Built with ❤️ and React.
        </Copyright>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
