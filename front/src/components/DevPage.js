// src/components/DevPage.js
import React from 'react';
import styled from 'styled-components';
import { FaGithub, FaDatabase, FaServer, FaCloud, FaChartLine, FaCog, FaArrowRight } from 'react-icons/fa';
import ChipMatrixBackground from './ChipMatrixBackground';
import colors from '../styles/colors';

const PageContainer = styled.div`
  min-height: 100vh;
  background: ${colors.gradientDark};
  color: ${colors.textPrimary};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
`;

const MainContent = styled.div`
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
  position: relative;
  z-index: 1;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 800;
  margin: 0 0 1rem 0;
  color: ${colors.bullGreen};
  letter-spacing: -1px;
`;

const Subtitle = styled.p`
  font-size: clamp(16px, 2vw, 20px);
  color: ${colors.textSecondary};
  margin: 0 0 2rem 0;
  font-weight: 300;
  line-height: 1.5;
`;

const GitHubLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: ${colors.bullGreen};
  color: ${colors.darkBackground};
  padding: 16px 32px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 18px;
  transition: all 0.2s ease;
  margin-bottom: 3rem;
  border: 1px solid ${colors.bullGreen};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${colors.shadowMedium};
    background: ${colors.success};
  }
`;

const Section = styled.div`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 12px;
  
  &::after {
    content: '';
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, ${colors.bullGreen}, transparent);
    border-radius: 1px;
  }
`;

const IconWrapper = styled.div`
  color: ${colors.bullGreen};
  font-size: 24px;
`;

const ArchitectureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const ArchitectureCard = styled.div`
  background: ${colors.gradientCard};
  border: 1px solid ${colors.border};
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    border-color: ${colors.bullGreen};
    box-shadow: 0 4px 16px ${colors.shadowMedium};
  }
`;

const CardTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: ${colors.textPrimary};
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardDescription = styled.p`
  color: ${colors.textSecondary};
  line-height: 1.6;
  margin: 0 0 1rem 0;
`;

const TechStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 1rem;
`;

const TechTag = styled.span`
  background: ${colors.hover};
  color: ${colors.bullGreen};
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid ${colors.bullGreen};
`;


const ArchitectureFlow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
`;

const FlowStep = styled.div`
  background: ${colors.gradientCard};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  position: relative;
  
  &::after {
    content: '→';
    position: absolute;
    right: -20px;
    top: 50%;
    transform: translateY(-50%);
    color: ${colors.bullGreen};
    font-size: 20px;
    font-weight: bold;
  }
  
  &:last-child::after {
    display: none;
  }
`;

const FlowTitle = styled.h4`
  color: ${colors.bullGreen};
  margin: 0 0 0.5rem 0;
  font-size: 16px;
  font-weight: 600;
`;

const FlowDescription = styled.p`
  color: ${colors.textSecondary};
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
`;

const DataFlowList = styled.div`
  background: ${colors.gradientCard};
  border: 1px solid ${colors.border};
  border-radius: 8px;
  padding: 2rem;
  margin: 1rem 0;
`;

const FlowItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: ${colors.surfaceBackground};
  border-radius: 6px;
  border-left: 3px solid ${colors.bullGreen};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FlowNumber = styled.div`
  background: ${colors.bullGreen};
  color: ${colors.darkBackground};
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  margin-right: 1rem;
  flex-shrink: 0;
`;

const FlowText = styled.div`
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.4;
`;

const FeatureList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${colors.textSecondary};
  font-size: 14px;
`;

const FeatureIcon = styled.div`
  color: ${colors.bullGreen};
  font-size: 12px;
`;


const DevPage = () => {
  return (
    <PageContainer>
      <ChipMatrixBackground />
      <MainContent>
        <Header>
          <Title>Dev</Title>
          <Subtitle>
            Technical architecture and development insights
          </Subtitle>
          
          <GitHubLink 
            href="https://github.com/insdaguirre/Stock_Hub" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <FaGithub />
            View on GitHub
          </GitHubLink>
        </Header>

        <Section>
          <SectionTitle>
            <IconWrapper><FaChartLine /></IconWrapper>
            Key Features
          </SectionTitle>
          
          <ArchitectureGrid>
            <ArchitectureCard>
              <CardTitle>Real-time Data</CardTitle>
              <FeatureList>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Live market data integration
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Intelligent caching system
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Fallback API strategies
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Market hours detection
                </FeatureItem>
              </FeatureList>
            </ArchitectureCard>
            
            <ArchitectureCard>
              <CardTitle>ML Predictions</CardTitle>
              <FeatureList>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Multiple model ensemble
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Multi-timeframe forecasts
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Model accuracy tracking
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Background retraining
                </FeatureItem>
              </FeatureList>
            </ArchitectureCard>
            
            <ArchitectureCard>
              <CardTitle>User Experience</CardTitle>
              <FeatureList>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Professional finance UI
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Interactive charts
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  Responsive design
                </FeatureItem>
                <FeatureItem>
                  <FeatureIcon><FaArrowRight /></FeatureIcon>
                  State persistence
                </FeatureItem>
              </FeatureList>
            </ArchitectureCard>
          </ArchitectureGrid>
        </Section>

        <Section>
          <SectionTitle>
            <IconWrapper><FaCog /></IconWrapper>
            System Architecture
          </SectionTitle>
          
          <ArchitectureFlow>
            <FlowStep>
              <FlowTitle>Data Sources</FlowTitle>
              <FlowDescription>
                Alpha Vantage, Finnhub, and Yahoo Finance APIs provide real-time market data
              </FlowDescription>
            </FlowStep>
            <FlowStep>
              <FlowTitle>API Gateway</FlowTitle>
              <FlowDescription>
                FastAPI backend with Redis caching and RQ workers for background processing
              </FlowDescription>
            </FlowStep>
            <FlowStep>
              <FlowTitle>ML Pipeline</FlowTitle>
              <FlowDescription>
                LSTM, Random Forest, Prophet, XGBoost, and ARIMA models for predictions
              </FlowDescription>
            </FlowStep>
            <FlowStep>
              <FlowTitle>Frontend</FlowTitle>
              <FlowDescription>
                React app with real-time charts and professional finance UI
              </FlowDescription>
            </FlowStep>
          </ArchitectureFlow>
        </Section>

        <Section>
          <SectionTitle>
            <IconWrapper><FaDatabase /></IconWrapper>
            Data Processing Flow
          </SectionTitle>
          
          <DataFlowList>
            <FlowItem>
              <FlowNumber>1</FlowNumber>
              <FlowText>User makes a request through the React frontend</FlowText>
            </FlowItem>
            <FlowItem>
              <FlowNumber>2</FlowNumber>
              <FlowText>System checks Redis cache for existing data</FlowText>
            </FlowItem>
            <FlowItem>
              <FlowNumber>3</FlowNumber>
              <FlowText>If cache miss, fetch from external APIs (Alpha Vantage, Finnhub, Yahoo Finance)</FlowText>
            </FlowItem>
            <FlowItem>
              <FlowNumber>4</FlowNumber>
              <FlowText>Process and validate data (normalize timestamps, filter market hours, calculate indicators)</FlowText>
            </FlowItem>
            <FlowItem>
              <FlowNumber>5</FlowNumber>
              <FlowText>Store processed data in Redis (server-side) and localStorage (client-side)</FlowText>
            </FlowItem>
            <FlowItem>
              <FlowNumber>6</FlowNumber>
              <FlowText>Return processed data to the frontend</FlowText>
            </FlowItem>
            <FlowItem>
              <FlowNumber>7</FlowNumber>
              <FlowText>Render interactive charts and predictions for the user</FlowText>
            </FlowItem>
          </DataFlowList>
        </Section>

        <Section>
          <SectionTitle>
            <IconWrapper><FaServer /></IconWrapper>
            Technology Stack
          </SectionTitle>
          
          <ArchitectureGrid>
            <ArchitectureCard>
              <CardTitle>
                <FaServer />
                Backend
              </CardTitle>
              <CardDescription>
                FastAPI-powered REST API with Redis caching, background job processing, and multiple data sources.
              </CardDescription>
              <TechStack>
                <TechTag>FastAPI</TechTag>
                <TechTag>Redis</TechTag>
                <TechTag>RQ Workers</TechTag>
                <TechTag>PostgreSQL</TechTag>
                <TechTag>Docker</TechTag>
              </TechStack>
            </ArchitectureCard>
            
            <ArchitectureCard>
              <CardTitle>
                <FaChartLine />
                Machine Learning
              </CardTitle>
              <CardDescription>
                Multiple ML models including LSTM, Random Forest, Prophet, XGBoost, and ARIMA for comprehensive predictions.
              </CardDescription>
              <TechStack>
                <TechTag>PyTorch</TechTag>
                <TechTag>Scikit-learn</TechTag>
                <TechTag>Prophet</TechTag>
                <TechTag>XGBoost</TechTag>
                <TechTag>ARIMA</TechTag>
              </TechStack>
            </ArchitectureCard>
            
            <ArchitectureCard>
              <CardTitle>
                <FaDatabase />
                Data Sources
              </CardTitle>
              <CardDescription>
                Real-time market data from Alpha Vantage and Finnhub APIs with intelligent caching and fallback strategies.
              </CardDescription>
              <TechStack>
                <TechTag>Alpha Vantage</TechTag>
                <TechTag>Finnhub</TechTag>
                <TechTag>Yahoo Finance</TechTag>
                <TechTag>Redis Cache</TechTag>
              </TechStack>
            </ArchitectureCard>
            
            <ArchitectureCard>
              <CardTitle>
                <FaCloud />
                Frontend
              </CardTitle>
              <CardDescription>
                Modern React application with professional finance UI, real-time charts, and responsive design.
              </CardDescription>
              <TechStack>
                <TechTag>React</TechTag>
                <TechTag>Styled Components</TechTag>
                <TechTag>Recharts</TechTag>
                <TechTag>React Router</TechTag>
                <TechTag>GitHub Pages</TechTag>
              </TechStack>
            </ArchitectureCard>
          </ArchitectureGrid>
        </Section>

      </MainContent>
    </PageContainer>
  );
};

export default DevPage;
