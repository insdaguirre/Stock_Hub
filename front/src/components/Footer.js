// src/components/Footer.js
import React from 'react';
import styled from 'styled-components';
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';

const FooterContainer = styled.footer`
  background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
  border-top: 2px solid #00d4aa;
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
  background: linear-gradient(135deg, #00d4aa, #00a8cc);
  color: #000;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 212, 170, 0.3);
`;

const BrandText = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
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
  border-radius: 8px;
  text-decoration: none;
  color: #b0b0b0;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  
  &:hover {
    color: #00d4aa;
    background: rgba(0, 212, 170, 0.1);
    border-color: rgba(0, 212, 170, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 212, 170, 0.2);
  }
`;

const IconWrapper = styled.div`
  font-size: 16px;
`;

const Copyright = styled.p`
  color: #666;
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
