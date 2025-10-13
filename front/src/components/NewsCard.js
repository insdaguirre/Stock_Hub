// src/components/NewsCard.js
import React from 'react';
import styled from 'styled-components';
import { FaExternalLinkAlt, FaClock, FaNewspaper } from 'react-icons/fa';

const CardContainer = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.15);
    border-color: #00d4aa;
  }
`;

const NewsImage = styled.div`
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
  border-radius: 8px;
  margin-bottom: 1rem;
  position: relative;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 2rem;
  }
`;

const NewsContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const NewsTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NewsSummary = styled.p`
  font-size: 0.9rem;
  color: #b0b0b0;
  line-height: 1.5;
  margin: 0 0 1rem 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NewsMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #333;
`;

const SourceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #888;
  font-size: 0.85rem;
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #888;
  font-size: 0.85rem;
`;

const ReadMoreLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #00d4aa;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.3s ease;
  
  &:hover {
    color: #00a8cc;
  }
`;

const formatTimeAgo = (publishedAt) => {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffInHours = Math.floor((now - published) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }
};

const NewsCard = ({ article }) => {
  if (!article) return null;

  return (
    <CardContainer>
      <NewsImage>
        {article.imageUrl ? (
          <img src={article.imageUrl} alt={article.title} />
        ) : (
          <div className="placeholder">
            <FaNewspaper />
          </div>
        )}
      </NewsImage>
      
      <NewsContent>
        <NewsTitle>{article.title}</NewsTitle>
        <NewsSummary>{article.summary}</NewsSummary>
        
        <NewsMeta>
          <SourceInfo>
            <FaNewspaper />
            {article.source}
          </SourceInfo>
          
          <TimeInfo>
            <FaClock />
            {formatTimeAgo(article.publishedAt)}
          </TimeInfo>
        </NewsMeta>
        
        <ReadMoreLink 
          href={article.url} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Read More
          <FaExternalLinkAlt />
        </ReadMoreLink>
      </NewsContent>
    </CardContainer>
  );
};

export default NewsCard;
