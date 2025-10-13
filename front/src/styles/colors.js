// Finance-Centric Color System
// Professional market colors for stock analysis platform

export const colors = {
  // Market Colors
  bullGreen: '#00C853',      // Gains, positive performance
  bearRed: '#FF1744',        // Losses, negative performance
  neutralGrey: '#9E9E9E',    // Neutral states
  
  // Background Colors
  darkBackground: '#0A0A0A', // Main background
  cardBackground: '#141414', // Card backgrounds
  surfaceBackground: '#1A1A1A', // Secondary surfaces
  
  // Border Colors
  border: '#2A2A2A',         // Default borders
  borderLight: '#3A3A3A',    // Light borders
  borderDark: '#1A1A1A',     // Dark borders
  
  // Text Colors
  textPrimary: '#FFFFFF',    // Primary text
  textSecondary: '#B0B0B0',  // Secondary text
  textTertiary: '#666666',   // Tertiary text
  textMuted: '#4A4A4A',      // Muted text
  
  // Accent Colors
  accentGold: '#FFB300',     // Highlights, premium features
  accentBlue: '#2196F3',     // Info, links
  accentOrange: '#FF9800',   // Warnings
  
  // Status Colors
  success: '#00C853',        // Success states
  error: '#FF1744',          // Error states
  warning: '#FF9800',        // Warning states
  info: '#2196F3',           // Info states
  
  // Chart Colors
  chartGreen: '#00C853',     // Positive chart data
  chartRed: '#FF1744',       // Negative chart data
  chartNeutral: '#9E9E9E',   // Neutral chart data
  chartGrid: '#2A2A2A',      // Chart grid lines
  
  // Interactive States
  hover: 'rgba(0, 200, 83, 0.1)',     // Green hover overlay
  active: 'rgba(0, 200, 83, 0.2)',    // Green active overlay
  focus: 'rgba(0, 200, 83, 0.3)',     // Green focus ring
  
  // Shadows
  shadowLight: 'rgba(0, 0, 0, 0.1)',
  shadowMedium: 'rgba(0, 0, 0, 0.2)',
  shadowHeavy: 'rgba(0, 0, 0, 0.3)',
  
  // Gradients
  gradientGreen: 'linear-gradient(135deg, #00C853, #00A040)',
  gradientRed: 'linear-gradient(135deg, #FF1744, #D32F2F)',
  gradientDark: 'linear-gradient(135deg, #0A0A0A, #1A1A1A)',
  gradientCard: 'linear-gradient(135deg, #141414, #1A1A1A)',
  
  // Professional gradients
  gradientPrimary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  gradientSuccess: 'linear-gradient(135deg, #00C853 0%, #00A040 100%)',
  gradientDanger: 'linear-gradient(135deg, #FF1744 0%, #D32F2F 100%)',
  gradientCardEnhanced: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)',
  
  // Glass morphism
  glassBackground: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  
  // Enhanced shadows
  shadowCard: '0 8px 32px rgba(0, 0, 0, 0.3)',
  shadowButton: '0 4px 16px rgba(0, 200, 83, 0.3)',
  shadowHover: '0 12px 40px rgba(0, 0, 0, 0.4)',
};

// Helper functions for dynamic colors based on performance
export const getPerformanceColor = (value) => {
  if (value > 0) return colors.bullGreen;
  if (value < 0) return colors.bearRed;
  return colors.neutralGrey;
};

export const getPerformanceGradient = (value) => {
  if (value > 0) return colors.gradientGreen;
  if (value < 0) return colors.gradientRed;
  return `linear-gradient(135deg, ${colors.neutralGrey}, ${colors.neutralGrey})`;
};

// Typography system
export const typography = {
  fontFamily: {
    primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace"
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px'
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75
  }
};

// Animation presets
export const animations = {
  transition: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    bounce: '0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },
  keyframes: {
    fadeInUp: `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
    loading: `
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `
  }
};

export default colors;
