// src/components/DevPage.js
import React from 'react';
import styled from 'styled-components';
import { FaGithub, FaCode, FaDatabase, FaServer, FaCloud, FaChartLine, FaCog, FaArrowRight } from 'react-icons/fa';

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.div`
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 800;
  margin: 0 0 1rem 0;
  background: linear-gradient(135deg, #00d4aa, #00a8cc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
`;

const Subtitle = styled.p`
  font-size: clamp(16px, 2vw, 20px);
  color: #b0b0b0;
  margin: 0 0 2rem 0;
  font-weight: 300;
  line-height: 1.5;
`;

const GitHubLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #00d4aa, #00a8cc);
  color: #000;
  padding: 16px 32px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 18px;
  transition: all 0.3s ease;
  margin-bottom: 3rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.3);
  }
`;

const Section = styled.div`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 12px;
  
  &::after {
    content: '';
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, #00d4aa, transparent);
    border-radius: 1px;
  }
`;

const IconWrapper = styled.div`
  color: #00d4aa;
  font-size: 24px;
`;

const ArchitectureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const ArchitectureCard = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    border-color: #00d4aa;
    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.2);
  }
`;

const CardTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CardDescription = styled.p`
  color: #b0b0b0;
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
  background: rgba(0, 212, 170, 0.1);
  color: #00d4aa;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(0, 212, 170, 0.3);
`;

const DiagramContainer = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 2rem;
  margin: 2rem 0;
  overflow-x: auto;
`;

const DiagramTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1rem 0;
  text-align: center;
`;

const MermaidDiagram = styled.div`
  text-align: center;
  color: #b0b0b0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-line;
  background: #0a0a0a;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #333;
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
  color: #b0b0b0;
  font-size: 14px;
`;

const FeatureIcon = styled.div`
  color: #00d4aa;
  font-size: 12px;
`;

const CodeBlock = styled.div`
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
`;

const CodeLine = styled.div`
  color: #b0b0b0;
  margin: 4px 0;
`;

const Keyword = styled.span`
  color: #00d4aa;
  font-weight: 600;
`;

const String = styled.span`
  color: #ffd700;
`;

const Comment = styled.span`
  color: #666;
  font-style: italic;
`;

const DevPage = () => {
  return (
    <PageContainer>
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
            <IconWrapper><FaCode /></IconWrapper>
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

        <Section>
          <SectionTitle>
            <IconWrapper><FaCog /></IconWrapper>
            System Architecture
          </SectionTitle>
          
          <DiagramContainer>
            <DiagramTitle>Data Pipeline Architecture</DiagramTitle>
            <MermaidDiagram>
{`┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │    │   API Gateway   │    │   ML Pipeline   │
│                 │    │                 │    │                 │
│ • Alpha Vantage │───▶│   FastAPI       │───▶│ • LSTM          │
│ • Finnhub       │    │   + Redis       │    │ • Random Forest │
│ • Yahoo Finance │    │   + RQ Workers  │    │ • Prophet       │
└─────────────────┘    └─────────────────┘    │ • XGBoost       │
                                              │ • ARIMA         │
┌─────────────────┐    ┌─────────────────┐    └─────────────────┘
│   Frontend      │    │   Caching       │              │
│                 │    │                 │              ▼
│ • React App     │◀───│ • Redis Cache   │    ┌─────────────────┐
│ • Real-time UI  │    │ • LocalStorage  │    │   Predictions   │
│ • Charts        │    │ • TTL Management│    │                 │
└─────────────────┘    └─────────────────┘    │ • Multi-timeframe│
                                              │ • Model Accuracy │
                                              │ • Historical Data│
                                              └─────────────────┘`}
            </MermaidDiagram>
          </DiagramContainer>
        </Section>

        <Section>
          <SectionTitle>
            <IconWrapper><FaDatabase /></IconWrapper>
            Data Flow Diagram
          </SectionTitle>
          
          <DiagramContainer>
            <DiagramTitle>Real-time Data Processing Flow</DiagramTitle>
            <MermaidDiagram>
{`1. User Request
   │
   ▼
2. Check Cache (Redis)
   │
   ▼ (Cache Miss)
3. Fetch from APIs
   │
   ├─ Alpha Vantage (Primary)
   ├─ Finnhub (Secondary)
   └─ Yahoo Finance (Fallback)
   │
   ▼
4. Process & Validate Data
   │
   ├─ Normalize timestamps
   ├─ Filter market hours
   └─ Calculate indicators
   │
   ▼
5. Store in Cache
   │
   ├─ Redis (Server-side)
   └─ localStorage (Client-side)
   │
   ▼
6. Return to Frontend
   │
   ▼
7. Render Charts & Predictions`}
            </MermaidDiagram>
          </DiagramContainer>
        </Section>

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
            <IconWrapper><FaCode /></IconWrapper>
            Code Example
          </SectionTitle>
          
          <CodeBlock>
            <CodeLine><Comment># FastAPI endpoint for predictions</Comment></CodeLine>
            <CodeLine><Keyword>@app.post</Keyword>(<String>"/predictions/{'{symbol}'}"</String>)</CodeLine>
            <CodeLine><Keyword>async def</Keyword> get_predictions(symbol: <Keyword>str</Keyword>):</CodeLine>
            <CodeLine>    <Comment># Check cache first</Comment></CodeLine>
            <CodeLine>    cached = <Keyword>await</Keyword> redis.get(<String>f"pred:{'{symbol}'}"</String>)</CodeLine>
            <CodeLine>    <Keyword>if</Keyword> cached:</CodeLine>
            <CodeLine>        <Keyword>return</Keyword> json.loads(cached)</CodeLine>
            <CodeLine>    </CodeLine>
            <CodeLine>    <Comment># Generate predictions</Comment></CodeLine>
            <CodeLine>    predictions = <Keyword>await</Keyword> generate_predictions(symbol)</CodeLine>
            <CodeLine>    </CodeLine>
            <CodeLine>    <Comment># Cache results</Comment></CodeLine>
            <CodeLine>    <Keyword>await</Keyword> redis.setex(</CodeLine>
            <CodeLine>        <String>f"pred:{'{symbol}'}"</String>,</CodeLine>
            <CodeLine>        <Keyword>3600</Keyword>,  <Comment># 1 hour TTL</Comment></CodeLine>
            <CodeLine>        json.dumps(predictions)</CodeLine>
            <CodeLine>    )</CodeLine>
            <CodeLine>    </CodeLine>
            <CodeLine>    <Keyword>return</Keyword> predictions</CodeLine>
          </CodeBlock>
        </Section>
      </MainContent>
    </PageContainer>
  );
};

export default DevPage;
