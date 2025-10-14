// src/components/ChipMatrixBackground.js
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
  opacity: ${props => props.reducedMotion ? 0.3 : 0.6};
  
  @media (prefers-reduced-motion: reduce) {
    opacity: 0.15;
  }
`;

const StyledCanvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

// Configuration for chip/circuit matrix
const CONFIG = {
  // Circuit traces
  traceColor: 'rgba(0, 212, 170, 0.2)',
  traceWidth: 2,
  traceSpacingHorizontal: 150,
  traceSpacingVertical: 120,
  tracePulseSpeed: 0.005,
  
  // Data packets
  packetSize: 6,
  packetColor: 'rgba(0, 212, 170, 0.8)',
  packetSpeed: 1.0,
  packetCount: 10,
  packetTrailLength: 2,
  
  // Connection nodes
  nodeRadius: 5,
  nodeColor: 'rgba(0, 212, 170, 0.6)',
  nodeGlowRadius: 8,
  nodePulseSpeed: 0.01,
  
  // Binary streams
  binaryColumns: 8,
  binarySpeed: 0.3,
  binaryFontSize: 11,
  binaryOpacity: 0.2,
  binaryColor: 'rgba(0, 212, 170, 0.3)',
  
  // Chip outlines
  chipOutlineOpacity: 0.05,
  chipCount: 3,
  
  // Performance
  maxDataPackets: 20,
  reducedMotionOpacity: 0.15
};

class CircuitTrace {
  constructor(x1, y1, x2, y2, isHorizontal) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.isHorizontal = isHorizontal;
    this.opacity = Math.random() * 0.3 + 0.15;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.width = Math.random() > 0.7 ? 3 : 2;
  }
  
  update() {
    this.pulsePhase += CONFIG.tracePulseSpeed;
  }
  
  draw(ctx) {
    const pulseOpacity = this.opacity + Math.sin(this.pulsePhase) * 0.05;
    ctx.strokeStyle = `rgba(0, 212, 170, ${pulseOpacity})`;
    ctx.lineWidth = this.width;
    ctx.shadowColor = colors.bullGreen;
    ctx.shadowBlur = 4;
    
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

class DataPacket {
  constructor(path) {
    this.path = path;
    this.pathIndex = 0;
    this.x = path[0].x;
    this.y = path[0].y;
    this.speed = CONFIG.packetSpeed * (Math.random() * 0.5 + 0.75);
    this.size = CONFIG.packetSize;
    this.trail = [];
    this.opacity = Math.random() * 0.4 + 0.6;
  }
  
  update() {
    if (this.pathIndex < this.path.length - 1) {
      const target = this.path[this.pathIndex + 1];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.speed) {
        this.pathIndex++;
        if (this.pathIndex >= this.path.length - 1) {
          this.pathIndex = 0;
          this.x = this.path[0].x;
          this.y = this.path[0].y;
          this.trail = [];
        }
      } else {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
      
      this.trail.unshift({x: this.x, y: this.y});
      if (this.trail.length > CONFIG.packetTrailLength) {
        this.trail.pop();
      }
    }
  }
  
  draw(ctx) {
    // Draw trail
    this.trail.forEach((pos, i) => {
      const trailOpacity = this.opacity * (1 - i / this.trail.length) * 0.5;
      ctx.fillStyle = `rgba(0, 212, 170, ${trailOpacity})`;
      const trailSize = this.size * (1 - i / this.trail.length);
      ctx.fillRect(pos.x - trailSize/2, pos.y - trailSize/2, trailSize, trailSize);
    });
    
    // Draw packet
    ctx.fillStyle = `rgba(0, 212, 170, ${this.opacity})`;
    ctx.shadowColor = colors.bullGreen;
    ctx.shadowBlur = 8;
    ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    ctx.shadowBlur = 0;
  }
}

class ConnectionNode {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = CONFIG.nodeRadius;
    this.baseOpacity = Math.random() * 0.3 + 0.3;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.isActive = false;
    this.activationTimer = 0;
  }
  
  activate() {
    this.isActive = true;
    this.activationTimer = 30;
  }
  
  update() {
    this.pulsePhase += CONFIG.nodePulseSpeed;
    if (this.activationTimer > 0) {
      this.activationTimer--;
      if (this.activationTimer === 0) {
        this.isActive = false;
      }
    }
  }
  
  draw(ctx) {
    const pulseOpacity = this.baseOpacity + Math.sin(this.pulsePhase) * 0.15;
    const opacity = this.isActive ? pulseOpacity * 1.5 : pulseOpacity;
    const radius = this.isActive ? this.radius * 1.3 : this.radius;
    
    // Outer glow
    ctx.save();
    ctx.globalAlpha = opacity * 0.3;
    ctx.fillStyle = colors.bullGreen;
    ctx.shadowColor = colors.bullGreen;
    ctx.shadowBlur = CONFIG.nodeGlowRadius;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Inner circle
    ctx.fillStyle = `rgba(0, 212, 170, ${opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

class BinaryStream {
  constructor(x, canvasHeight) {
    this.x = x;
    this.characters = [];
    this.speed = CONFIG.binarySpeed * (Math.random() * 0.5 + 0.75);
    
    const charCount = Math.floor(canvasHeight / CONFIG.binaryFontSize) + 5;
    for (let i = 0; i < charCount; i++) {
      this.characters.push({
        value: Math.random() > 0.5 ? '1' : '0',
        y: -i * CONFIG.binaryFontSize,
        opacity: Math.random()
      });
    }
  }
  
  update(canvasHeight) {
    this.characters.forEach(char => {
      char.y += this.speed;
      
      if (char.y < 50) {
        char.opacity = char.y / 50;
      } else if (char.y > canvasHeight - 50) {
        char.opacity = (canvasHeight - char.y) / 50;
      } else {
        char.opacity = Math.min(1, char.opacity + 0.05);
      }
      
      if (char.y > canvasHeight + 50) {
        char.y = -CONFIG.binaryFontSize;
        char.value = Math.random() > 0.5 ? '1' : '0';
        char.opacity = 0;
      }
    });
  }
  
  draw(ctx) {
    ctx.font = `${CONFIG.binaryFontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    this.characters.forEach(char => {
      ctx.fillStyle = `rgba(0, 212, 170, ${char.opacity * CONFIG.binaryOpacity})`;
      ctx.fillText(char.value, this.x, char.y);
    });
  }
}

class ChipOutline {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.cornerRadius = 8;
  }
  
  draw(ctx) {
    ctx.strokeStyle = `rgba(0, 212, 170, ${CONFIG.chipOutlineOpacity})`;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(this.x + this.cornerRadius, this.y);
    ctx.lineTo(this.x + this.width - this.cornerRadius, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + this.cornerRadius);
    ctx.lineTo(this.x + this.width, this.y + this.height - this.cornerRadius);
    ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - this.cornerRadius, this.y + this.height);
    ctx.lineTo(this.x + this.cornerRadius, this.y + this.height);
    ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - this.cornerRadius);
    ctx.lineTo(this.x, this.y + this.cornerRadius);
    ctx.quadraticCurveTo(this.x, this.y, this.x + this.cornerRadius, this.y);
    ctx.closePath();
    ctx.stroke();
  }
}

const ChipMatrixBackground = () => {
  const canvasRef = useRef(null);
  const circuitTracesRef = useRef([]);
  const dataPacketsRef = useRef([]);
  const connectionNodesRef = useRef([]);
  const binaryStreamsRef = useRef([]);
  const chipOutlinesRef = useRef([]);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const [contentLoaded, setContentLoaded] = useState(false);

  useEffect(() => {
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
    // Lazy initialization - wait for content to load
    const timer = setTimeout(() => {
      setContentLoaded(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Handle tab visibility
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !contentLoaded) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let lastFrameTime = 0;
    let frameCount = 0;
    const TARGET_FPS = 30;
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const resizeCanvas = () => {
      // Use lower DPR on mobile for better performance
      const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      
      initializeElements(rect.width, rect.height);
    };

    const generateDataPaths = (canvasWidth, canvasHeight) => {
      const paths = [];
      const hSpacing = CONFIG.traceSpacingHorizontal;
      const vSpacing = CONFIG.traceSpacingVertical;
      const count = isMobile ? 8 : 12;
      
      for (let i = 0; i < count; i++) {
        const startX = Math.random() * (canvasWidth - hSpacing * 3);
        const startY = Math.random() * (canvasHeight - vSpacing * 2);
        
        const pathType = Math.floor(Math.random() * 3);
        let path;
        
        if (pathType === 0) {
          // L-shaped path
          path = [
            { x: startX, y: startY },
            { x: startX + hSpacing * 2, y: startY },
            { x: startX + hSpacing * 2, y: startY + vSpacing }
          ];
        } else if (pathType === 1) {
          // U-shaped path
          path = [
            { x: startX, y: startY },
            { x: startX, y: startY + vSpacing },
            { x: startX + hSpacing, y: startY + vSpacing },
            { x: startX + hSpacing, y: startY }
          ];
        } else {
          // Z-shaped path
          path = [
            { x: startX, y: startY },
            { x: startX + hSpacing, y: startY },
            { x: startX + hSpacing, y: startY + vSpacing },
            { x: startX + hSpacing * 2, y: startY + vSpacing }
          ];
        }
        
        paths.push(path);
      }
      
      return paths;
    };

    const initializeElements = (canvasWidth, canvasHeight) => {
      const hSpacing = CONFIG.traceSpacingHorizontal;
      const vSpacing = CONFIG.traceSpacingVertical;
      
      // Create circuit traces
      circuitTracesRef.current = [];
      const hLines = Math.floor(canvasHeight / vSpacing);
      const vLines = Math.floor(canvasWidth / hSpacing);
      
      // Horizontal traces
      for (let i = 0; i < hLines; i++) {
        const y = i * vSpacing;
        circuitTracesRef.current.push(new CircuitTrace(0, y, canvasWidth, y, true));
      }
      
      // Vertical traces
      for (let i = 0; i < vLines; i++) {
        const x = i * hSpacing;
        circuitTracesRef.current.push(new CircuitTrace(x, 0, x, canvasHeight, false));
      }
      
      // Create connection nodes at intersections
      connectionNodesRef.current = [];
      for (let i = 0; i < vLines; i++) {
        for (let j = 0; j < hLines; j++) {
          if (Math.random() > 0.7) {
            const x = i * hSpacing;
            const y = j * vSpacing;
            connectionNodesRef.current.push(new ConnectionNode(x, y));
          }
        }
      }
      
      // Create data packets
      const paths = generateDataPaths(canvasWidth, canvasHeight);
      dataPacketsRef.current = paths.map(path => new DataPacket(path));
      
      // Create binary streams
      binaryStreamsRef.current = [];
      const binaryCount = isMobile ? 6 : CONFIG.binaryColumns;
      for (let i = 0; i < binaryCount; i++) {
        const x = Math.random() * canvasWidth;
        binaryStreamsRef.current.push(new BinaryStream(x, canvasHeight));
      }
      
      // Create chip outlines
      chipOutlinesRef.current = [];
      for (let i = 0; i < CONFIG.chipCount; i++) {
        const width = 200 + Math.random() * 200;
        const height = 150 + Math.random() * 150;
        const x = Math.random() * (canvasWidth - width);
        const y = Math.random() * (canvasHeight - height);
        chipOutlinesRef.current.push(new ChipOutline(x, y, width, height));
      }
    };

    const checkNodeActivation = (packet, nodes) => {
      nodes.forEach(node => {
        const dx = packet.x - node.x;
        const dy = packet.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 15) {
          node.activate();
        }
      });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = (currentTime) => {
      animationId = requestAnimationFrame(animate);
      
      // Skip rendering when tab is not visible
      if (!isTabVisible) {
        return;
      }
      
      // Frame rate limiting
      if (currentTime - lastFrameTime < FRAME_INTERVAL) {
        return;
      }
      
      lastFrameTime = currentTime - (currentTime % FRAME_INTERVAL);
      frameCount++;
      
      const rect = canvas.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = rect.height;
      
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw chip outlines (bottom layer)
      chipOutlinesRef.current.forEach(outline => {
        outline.draw(ctx);
      });
      
      // Draw circuit traces
      circuitTracesRef.current.forEach(trace => {
        trace.update();
        trace.draw(ctx);
      });
      
      // Draw binary streams (every 3 frames for performance)
      if (frameCount % 3 === 0) {
        binaryStreamsRef.current.forEach(stream => {
          stream.update(canvasHeight);
        });
      }
      binaryStreamsRef.current.forEach(stream => {
        stream.draw(ctx);
      });
      
      // Update and draw connection nodes
      connectionNodesRef.current.forEach(node => {
        node.update();
        node.draw(ctx);
      });
      
      // Update and draw data packets
      dataPacketsRef.current.forEach(packet => {
        packet.update();
        // Check node activation every 5 frames for performance
        if (frameCount % 5 === 0) {
          checkNodeActivation(packet, connectionNodesRef.current);
        }
        packet.draw(ctx);
      });
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isMobile, prefersReducedMotion, isTabVisible, contentLoaded]);

  return (
    <CanvasWrapper reducedMotion={prefersReducedMotion}>
      <StyledCanvas ref={canvasRef} />
    </CanvasWrapper>
  );
};

export default ChipMatrixBackground;

