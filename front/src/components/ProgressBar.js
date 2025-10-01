import React from 'react';
import styled from 'styled-components';

const ProgressBarContainer = styled.div`
  width: 100%;
  background-color: #2C2C2E;
  border-radius: 6px;
  height: 8px;
  overflow: hidden;
  margin: 5px 0;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: #0A84FF;
  width: ${props => props.progress}%;
  transition: width 0.3s ease-in-out;
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #8E8E93;
  margin-bottom: 4px;
`;

const ProgressBar = ({ progress, label, timeRemaining }) => {
  const pctDisplay = Number.isFinite(progress)
    ? (Math.round(progress * 100) / 100).toFixed(2)
    : '0.00';
  return (
    <div>
      <ProgressLabel>
        <span>{label}</span>
        <span>{timeRemaining ? `${timeRemaining}s remaining` : `${pctDisplay}% complete`}</span>
      </ProgressLabel>
      <ProgressBarContainer>
        <ProgressFill progress={progress} />
      </ProgressBarContainer>
    </div>
  );
};

export default ProgressBar; 