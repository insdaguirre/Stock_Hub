// src/components/FinanceBackground.js
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
  opacity: 0.4;
  
  @media (prefers-reduced-motion: reduce) {
    opacity: 0.15;
  }
`;

const StyledCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

// Configuration for interaction physics
const CONFIG = {
  mouseInfluenceRadius: 250,
  mouseAttractionStrength: 0.3,
  mouseRepulsionStrength: 0.5,
  scrollVelocityMultiplier: 0.02,
  dampingFactor: 0.98,
  maxVelocity: 2.0,
  returnToBaseSpeed: 0.05,
  interactionEnabled: true
};

// Stock tickers to use
const TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
  'AMD', 'INTC', 'SPY', 'QQQ', 'DIA', 'VOO', 'VTI', 'BTC',
  'ETH', 'COIN', 'SQ', 'PYPL', 'V', 'MA', 'JPM', 'BAC',
  'WFC', 'GS', 'MS', 'C', 'BRK', 'BABA'
];

const SYMBOLS = ['$', '↑', '↓', '△', '▽', '■', '●'];

class FloatingElement {
  constructor(canvasWidth, canvasHeight, isMobile = false) {
    this.isMobile = isMobile;
    this.reset(canvasWidth, canvasHeight, true);
  }

  reset(canvasWidth, canvasHeight, initial = false) {
    // Random type: ticker, price, percentage, symbol, or mini-chart
    const types = ['ticker', 'price', 'percentage', 'symbol'];
    if (!this.isMobile) types.push('chart');
    
    this.type = types[Math.floor(Math.random() * types.length)];
    
    // Set interaction behavior based on type
    if (this.type === 'ticker') {
      this.interactionType = 'attract'; // Tickers are attracted to mouse
    } else if (this.type === 'symbol') {
      this.interactionType = 'repel'; // Symbols are repelled
    } else if (this.type === 'chart') {
      this.interactionType = 'minimal'; // Charts have minimal interaction
    } else {
      this.interactionType = 'neutral'; // Prices and percentages are neutral
    }
    
    // Position
    if (initial) {
      this.x = Math.random() * canvasWidth;
      this.y = Math.random() * canvasHeight;
    } else {
      // Enter from edges when recycling
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { // top
        this.x = Math.random() * canvasWidth;
        this.y = -50;
      } else if (edge === 1) { // right
        this.x = canvasWidth + 50;
        this.y = Math.random() * canvasHeight;
      } else if (edge === 2) { // bottom
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + 50;
      } else { // left
        this.x = -50;
        this.y = Math.random() * canvasHeight;
      }
    }
    
    // Random speed multiplier for variety (0.3x to 2.5x normal speed)
    // This makes some elements move much faster/slower than others
    this.speedMultiplier = Math.random() * 2.2 + 0.3;
    
    // Base velocity (unchanging reference)
    this.baseVx = (Math.random() - 0.5) * 0.5 * this.speedMultiplier;
    this.baseVy = (Math.random() - 0.5) * 0.5 * this.speedMultiplier;
    
    // Ensure some minimum movement
    if (Math.abs(this.baseVx) < 0.1) this.baseVx = 0.1 * (Math.random() > 0.5 ? 1 : -1) * this.speedMultiplier;
    if (Math.abs(this.baseVy) < 0.1) this.baseVy = 0.1 * (Math.random() > 0.5 ? 1 : -1) * this.speedMultiplier;
    
    // Current velocity (modified by interactions)
    this.vx = this.baseVx;
    this.vy = this.baseVy;
    
    // Acceleration
    this.ax = 0;
    this.ay = 0;
    
    // Content based on type
    if (this.type === 'ticker') {
      this.text = TICKERS[Math.floor(Math.random() * TICKERS.length)];
      this.fontSize = this.isMobile ? 14 : 18;
    } else if (this.type === 'price') {
      const price = (Math.random() * 900 + 100).toFixed(2);
      this.isPositive = Math.random() > 0.5;
      this.text = `$${price}`;
      this.fontSize = this.isMobile ? 12 : 16;
    } else if (this.type === 'percentage') {
      const pct = (Math.random() * 10 - 5).toFixed(2);
      this.isPositive = parseFloat(pct) >= 0;
      this.text = `${this.isPositive ? '+' : ''}${pct}%`;
      this.fontSize = this.isMobile ? 12 : 16;
    } else if (this.type === 'symbol') {
      this.text = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      this.fontSize = this.isMobile ? 16 : 24;
      this.isPositive = this.text === '↑' || this.text === '△' ? true : 
                        this.text === '↓' || this.text === '▽' ? false : 
                        Math.random() > 0.5;
    } else if (this.type === 'chart') {
      this.chartData = this.generateMiniChart();
      this.isPositive = this.chartData[this.chartData.length - 1] > this.chartData[0];
    }
    
    // Opacity for fade effect
    this.opacity = initial ? Math.random() * 0.5 + 0.3 : 0;
    this.targetOpacity = Math.random() * 0.5 + 0.3;
    
    // Parallax factor (how much it responds to scroll) - also varies with speed
    this.parallaxFactor = (Math.random() * 0.3 + 0.1) * this.speedMultiplier * 0.5;
    
    // Rotation for variety - faster moving elements rotate more
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.01 * this.speedMultiplier;
  }
  
  generateMiniChart() {
    const points = [];
    const numPoints = 8;
    let value = Math.random() * 50 + 50;
    
    for (let i = 0; i < numPoints; i++) {
      value += (Math.random() - 0.5) * 20;
      value = Math.max(20, Math.min(100, value));
      points.push(value);
    }
    
    return points;
  }
  
  applyForce(fx, fy) {
    this.ax += fx;
    this.ay += fy;
  }
  
  update(canvasWidth, canvasHeight, scrollOffset, mousePos, scrollVelocity, interactionEnabled) {
    // Reset acceleration
    this.ax = 0;
    this.ay = 0;
    
    if (interactionEnabled) {
      // 1. Calculate mouse influence (if mouse is active and within radius)
      if (mousePos && mousePos.x !== null && mousePos.y !== null) {
        const dx = mousePos.x - this.x;
        const dy = mousePos.y - (this.y - scrollOffset * this.parallaxFactor);
        const distSq = dx * dx + dy * dy;
        const radius = CONFIG.mouseInfluenceRadius;
        const radiusSq = radius * radius;
        
        if (distSq < radiusSq && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const normalizedDist = dist / radius;
          
          // Calculate force strength based on interaction type
          // Faster elements are more responsive to interactions
          let strength = 0;
          const responsiveness = Math.min(1.5, this.speedMultiplier * 0.8);
          if (this.interactionType === 'attract') {
            strength = CONFIG.mouseAttractionStrength * (1 - normalizedDist) * responsiveness;
          } else if (this.interactionType === 'repel') {
            strength = -CONFIG.mouseRepulsionStrength * (1 - normalizedDist) * responsiveness;
          } else if (this.interactionType === 'neutral') {
            strength = CONFIG.mouseAttractionStrength * 0.3 * (1 - normalizedDist) * responsiveness;
          } else if (this.interactionType === 'minimal') {
            strength = CONFIG.mouseAttractionStrength * 0.1 * (1 - normalizedDist) * responsiveness;
          }
          
          // Apply force toward (or away from) mouse
          const fx = (dx / dist) * strength;
          const fy = (dy / dist) * strength;
          
          this.applyForce(fx, fy);
        }
      }
      
      // 2. Apply scroll velocity influence
      // Faster elements are more affected by scroll
      if (scrollVelocity && Math.abs(scrollVelocity) > 0.1) {
        const scrollResponsiveness = this.speedMultiplier * 0.7;
        // Horizontal drift based on scroll
        const scrollDrift = scrollVelocity * CONFIG.scrollVelocityMultiplier * scrollResponsiveness;
        this.applyForce(scrollDrift, 0);
        
        // Vertical push in scroll direction
        const scrollPush = scrollVelocity * CONFIG.scrollVelocityMultiplier * 0.5 * scrollResponsiveness;
        this.applyForce(0, scrollPush);
      }
    }
    
    // 3. Update velocity with acceleration
    this.vx += this.ax;
    this.vy += this.ay;
    
    // 4. Apply damping to prevent runaway speeds
    this.vx *= CONFIG.dampingFactor;
    this.vy *= CONFIG.dampingFactor;
    
    // 5. Gradually return to base velocity
    this.vx += (this.baseVx - this.vx) * CONFIG.returnToBaseSpeed;
    this.vy += (this.baseVy - this.vy) * CONFIG.returnToBaseSpeed;
    
    // 6. Clamp velocity to max
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > CONFIG.maxVelocity) {
      this.vx = (this.vx / speed) * CONFIG.maxVelocity;
      this.vy = (this.vy / speed) * CONFIG.maxVelocity;
    }
    
    // 7. Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Apply parallax based on scroll
    const parallaxY = scrollOffset * this.parallaxFactor;
    
    // Update rotation
    this.rotation += this.rotationSpeed;
    
    // 8. Fade in/out based on proximity to edges
    const margin = 100;
    const distToEdge = Math.min(
      this.x,
      canvasWidth - this.x,
      this.y - parallaxY,
      canvasHeight - (this.y - parallaxY)
    );
    
    if (distToEdge < margin) {
      this.targetOpacity = (distToEdge / margin) * 0.8;
    } else {
      this.targetOpacity = 0.8;
    }
    
    // Smooth opacity transition
    this.opacity += (this.targetOpacity - this.opacity) * 0.05;
    
    // 9. Check if out of bounds (with buffer for parallax)
    const buffer = 200;
    const effectiveY = this.y - parallaxY;
    
    if (this.x < -buffer || this.x > canvasWidth + buffer ||
        effectiveY < -buffer || effectiveY > canvasHeight + buffer) {
      this.reset(canvasWidth, canvasHeight, false);
    }
  }
  
  draw(ctx, scrollOffset) {
    const parallaxY = scrollOffset * this.parallaxFactor;
    const effectiveY = this.y - parallaxY;
    
    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    if (this.type === 'chart') {
      this.drawMiniChart(ctx, effectiveY);
    } else {
      ctx.translate(this.x, effectiveY);
      ctx.rotate(this.rotation * 0.1); // Subtle rotation
      
      // Set color based on type and positivity
      if (this.type === 'ticker') {
        ctx.fillStyle = colors.textSecondary || '#9A9AA0';
      } else if (this.type === 'symbol' && this.text === '$') {
        ctx.fillStyle = colors.bullGreen || '#00C853';
      } else {
        ctx.fillStyle = this.isPositive 
          ? (colors.bullGreen || '#00C853')
          : (colors.bearRed || '#FF3B30');
      }
      
      ctx.font = `${this.type === 'ticker' ? '600' : '500'} ${this.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add subtle glow for premium feel
      ctx.shadowColor = this.isPositive 
        ? (colors.bullGreen || '#00C853')
        : (colors.bearRed || '#FF3B30');
      ctx.shadowBlur = 8;
      
      ctx.fillText(this.text, 0, 0);
    }
    
    ctx.restore();
  }
  
  drawMiniChart(ctx, effectiveY) {
    const width = 60;
    const height = 30;
    const spacing = width / (this.chartData.length - 1);
    
    ctx.save();
    ctx.translate(this.x - width / 2, effectiveY - height / 2);
    
    // Draw candlesticks or line
    ctx.strokeStyle = this.isPositive 
      ? (colors.bullGreen || '#00C853')
      : (colors.bearRed || '#FF3B30');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    const min = Math.min(...this.chartData);
    const max = Math.max(...this.chartData);
    const range = max - min || 1;
    
    this.chartData.forEach((value, i) => {
      const x = i * spacing;
      const y = height - ((value - min) / range) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Add glow
    ctx.shadowColor = this.isPositive 
      ? (colors.bullGreen || '#00C853')
      : (colors.bearRed || '#FF3B30');
    ctx.shadowBlur = 6;
    ctx.stroke();
    
    ctx.restore();
  }
}

const FinanceBackground = () => {
  const canvasRef = useRef(null);
  const elementsRef = useRef([]);
  const scrollOffsetRef = useRef(0);
  const mouseRef = useRef({ x: null, y: null });
  const scrollVelocityRef = useRef(0);
  const lastScrollRef = useRef({ y: 0, time: Date.now() });
  const [isMobile, setIsMobile] = useState(false);
  const [hasFineMouse, setHasFineMouse] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for mobile and reduced motion preference
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check if device has fine pointer (mouse) vs coarse (touch)
    const finePointerQuery = window.matchMedia('(pointer: fine)');
    setHasFineMouse(finePointerQuery.matches);
    
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
      
      // Reinitialize elements on resize
      const numElements = isMobile ? 25 : 50;
      elementsRef.current = Array.from({ length: numElements }, () => 
        new FloatingElement(rect.width, rect.height, isMobile)
      );
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Throttled mouse handler (only on devices with fine pointer)
    let mouseTimeout;
    const handleMouseMove = (e) => {
      if (!hasFineMouse || prefersReducedMotion) return;
      if (mouseTimeout) return;
      
      mouseTimeout = setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        mouseTimeout = null;
      }, 16); // ~60fps
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };

    if (hasFineMouse && !prefersReducedMotion) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      canvas.addEventListener('mouseleave', handleMouseLeave);
    }

    // Throttled scroll handler with velocity calculation
    let scrollTimeout;
    const handleScroll = () => {
      if (scrollTimeout) return;
      
      scrollTimeout = setTimeout(() => {
        const currentTime = Date.now();
        const currentScroll = window.scrollY;
        const deltaTime = currentTime - lastScrollRef.current.time;
        const deltaScroll = currentScroll - lastScrollRef.current.y;
        
        // Calculate velocity (pixels per millisecond)
        if (deltaTime > 0) {
          const instantVelocity = deltaScroll / deltaTime;
          // Smooth velocity with exponential moving average
          scrollVelocityRef.current = scrollVelocityRef.current * 0.7 + instantVelocity * 0.3;
        }
        
        scrollOffsetRef.current = currentScroll;
        lastScrollRef.current = { y: currentScroll, time: currentTime };
        scrollTimeout = null;
      }, 16); // ~60fps
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Animation loop
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Determine if interactions are enabled
      const interactionEnabled = CONFIG.interactionEnabled && !prefersReducedMotion;
      
      // Apply slower animation if reduced motion is preferred
      const speedMultiplier = prefersReducedMotion ? 0.3 : 1;
      
      // Decay scroll velocity over time for smooth momentum
      scrollVelocityRef.current *= 0.95;
      
      // Update and draw all elements
      elementsRef.current.forEach(element => {
        element.update(
          canvasWidth, 
          canvasHeight, 
          scrollOffsetRef.current,
          mouseRef.current,
          scrollVelocityRef.current * speedMultiplier,
          interactionEnabled
        );
        element.draw(ctx, scrollOffsetRef.current);
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (mouseTimeout) {
        clearTimeout(mouseTimeout);
      }
    };
  }, [isMobile, hasFineMouse, prefersReducedMotion]);

  return (
    <CanvasWrapper>
      <StyledCanvas ref={canvasRef} />
    </CanvasWrapper>
  );
};

export default FinanceBackground;
