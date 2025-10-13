// src/components/MatrixBackground.js
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import colors from '../styles/colors';

const CanvasWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  opacity: ${props => props.reducedMotion ? 0.3 : 0.5};
  
  @media (prefers-reduced-motion: reduce) {
    opacity: 0.08;
  }
`;

const StyledCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

// Configuration for matrix grid
const CONFIG = {
  lineColor: 'rgba(0, 212, 170, 0.15)', // colors.bullGreen with opacity
  lineWidth: 1,
  verticalLineSpacing: 80, // pixels between vertical lines
  horizontalLineSpacing: 60, // pixels between horizontal lines
  verticalLineSpeed: 0.3, // pixels per frame
  pulseSpeed: 0.02, // for horizontal line pulse
  intersectionGlowRadius: 3,
  intersectionGlowOpacity: 0.4,
  reducedMotionOpacity: 0.08, // lower opacity for reduced motion
  maxVerticalLines: 20,
  maxHorizontalLines: 15
};

class VerticalLine {
  constructor(x, canvasHeight) {
    this.x = x;
    this.y = Math.random() * canvasHeight;
    this.speed = CONFIG.verticalLineSpeed;
    this.opacity = Math.random() * 0.5 + 0.3;
    this.length = Math.random() * 200 + 100; // Variable line length
  }
  
  update(canvasHeight) {
    this.y += this.speed;
    if (this.y > canvasHeight + this.length) {
      this.y = -this.length;
      this.opacity = Math.random() * 0.5 + 0.3; // Randomize opacity on reset
    }
  }
  
  draw(ctx, canvasHeight) {
    const startY = Math.max(0, this.y);
    const endY = Math.min(canvasHeight, this.y + this.length);
    
    ctx.strokeStyle = `rgba(0, 212, 170, ${this.opacity * 0.15})`;
    ctx.lineWidth = CONFIG.lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.x, startY);
    ctx.lineTo(this.x, endY);
    ctx.stroke();
  }
}

class HorizontalLine {
  constructor(y, canvasWidth) {
    this.y = y;
    this.baseOpacity = Math.random() * 0.3 + 0.2;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.length = Math.random() * 100 + 50; // Variable line length
    this.startX = Math.random() * canvasWidth * 0.2; // Start at random position
  }
  
  update() {
    this.pulsePhase += CONFIG.pulseSpeed;
  }
  
  draw(ctx, canvasWidth) {
    const opacity = this.baseOpacity + Math.sin(this.pulsePhase) * 0.1;
    const endX = Math.min(canvasWidth, this.startX + this.length);
    
    ctx.strokeStyle = `rgba(0, 212, 170, ${opacity * 0.15})`;
    ctx.lineWidth = CONFIG.lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.y);
    ctx.lineTo(endX, this.y);
    ctx.stroke();
  }
}

class IntersectionGlow {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = CONFIG.intersectionGlowRadius;
    this.opacity = Math.random() * 0.3 + 0.1;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }
  
  update() {
    this.pulsePhase += CONFIG.pulseSpeed * 2;
  }
  
  draw(ctx) {
    const currentOpacity = this.opacity + Math.sin(this.pulsePhase) * 0.1;
    
    ctx.save();
    ctx.globalAlpha = currentOpacity;
    ctx.fillStyle = colors.bullGreen;
    ctx.shadowColor = colors.bullGreen;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const MatrixBackground = () => {
  const canvasRef = useRef(null);
  const verticalLinesRef = useRef([]);
  const horizontalLinesRef = useRef([]);
  const intersectionsRef = useRef([]);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for mobile and reduced motion preference
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      
      // Initialize lines
      initializeLines(rect.width, rect.height);
    };

    const initializeLines = (canvasWidth, canvasHeight) => {
      // Create vertical lines
      const verticalCount = Math.min(
        CONFIG.maxVerticalLines,
        Math.floor(canvasWidth / CONFIG.verticalLineSpacing)
      );
      verticalLinesRef.current = [];
      for (let i = 0; i < verticalCount; i++) {
        const x = (i + 1) * CONFIG.verticalLineSpacing;
        verticalLinesRef.current.push(new VerticalLine(x, canvasHeight));
      }

      // Create horizontal lines
      const horizontalCount = Math.min(
        CONFIG.maxHorizontalLines,
        Math.floor(canvasHeight / CONFIG.horizontalLineSpacing)
      );
      horizontalLinesRef.current = [];
      for (let i = 0; i < horizontalCount; i++) {
        const y = (i + 1) * CONFIG.horizontalLineSpacing;
        horizontalLinesRef.current.push(new HorizontalLine(y, canvasWidth));
      }

      // Create intersection glows
      intersectionsRef.current = [];
      for (let i = 0; i < verticalCount; i++) {
        for (let j = 0; j < horizontalCount; j++) {
          const x = (i + 1) * CONFIG.verticalLineSpacing;
          const y = (j + 1) * CONFIG.horizontalLineSpacing;
          if (Math.random() > 0.7) { // Only 30% of intersections have glows
            intersectionsRef.current.push(new IntersectionGlow(x, y));
          }
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Apply reduced motion if preferred
      // const speedMultiplier = prefersReducedMotion ? 0.3 : 1;
      
      // Update and draw vertical lines
      verticalLinesRef.current.forEach(line => {
        line.update(canvasHeight);
        line.draw(ctx, canvasHeight);
      });

      // Update and draw horizontal lines
      horizontalLinesRef.current.forEach(line => {
        line.update();
        line.draw(ctx, canvasWidth);
      });

      // Update and draw intersection glows
      intersectionsRef.current.forEach(glow => {
        glow.update();
        glow.draw(ctx);
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isMobile, prefersReducedMotion]);

  return (
    <CanvasWrapper reducedMotion={prefersReducedMotion}>
      <StyledCanvas ref={canvasRef} />
    </CanvasWrapper>
  );
};

export default MatrixBackground;
