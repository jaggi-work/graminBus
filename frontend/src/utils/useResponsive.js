
import { useWindowDimensions } from "react-native";

// Define base dimensions (you can adjust these based on your design mockup)
const BASE_WIDTH = 375; // iPhone X/11 Pro base width - common design standard
const BASE_HEIGHT = 812;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  // Calculate scale factor based on device width
  const widthScale = width / BASE_WIDTH;
  const heightScale = height / BASE_HEIGHT;

  /**
   * Linear scaling - use for dimensions that should grow proportionally
   */
  const scale = (size) => {
    return Math.round(widthScale * size);
  };

  /**
   * Moderate scaling - use for fonts and spacing that shouldn't grow as aggressively
   * factor: 0.5 is default (moderate scaling), 0 = no scaling, 1 = full scaling
   */
  const moderateScale = (size, factor = 0.5) => {
    return Math.round(size + (scale(size) - size) * factor);
  };

  /**
   * Vertical scaling - use for heights and vertical margins
   */
  const verticalScale = (size) => {
    return Math.round(heightScale * size);
  };

  /**
   * Clamp a value between min and max
   */
  const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
  };

  /**
   * Responsive font size with min/max constraints
   */
  const fontSize = (baseSize, minSize, maxSize) => {
    const scaled = moderateScale(baseSize, 0.3); // Less aggressive scaling for text
    return clamp(scaled, minSize || baseSize * 0.8, maxSize || baseSize * 1.3);
  };

  /**
   * Responsive spacing with constraints
   */
  const spacing = (baseSize, minSize, maxSize) => {
    const scaled = scale(baseSize);
    return clamp(scaled, minSize || baseSize * 0.7, maxSize || baseSize * 1.5);
  };

  // Device size classification
  const sizeClass =
    width < 360 ? "small" :      // Small phones (e.g., iPhone SE, small Androids)
    width < 414 ? "medium" :     // Standard phones (e.g., iPhone 11, Pixel)
    width < 600 ? "large" :      // Large phones (e.g., iPhone Pro Max, large Androids)
    width < 768 ? "tablet-small" : // Small tablets
    "tablet";                    // Large tablets

  // Convenience booleans
  const isSmallPhone = sizeClass === "small";
  const isMediumPhone = sizeClass === "medium";
  const isLargePhone = sizeClass === "large";
  const isTablet = sizeClass === "tablet" || sizeClass === "tablet-small";
  const isPortrait = height > width;
  const isLandscape = width > height;

  // Percentage-based dimensions
  const wp = (percentage) => {
    return (width * percentage) / 100;
  };

  const hp = (percentage) => {
    return (height * percentage) / 100;
  };

  return {
    // Dimensions
    width,
    height,
    
    // Scaling functions
    scale,
    moderateScale,
    verticalScale,
    fontSize,
    spacing,
    clamp,
    
    // Percentage helpers
    wp,
    hp,
    
    // Device info
    sizeClass,
    isSmallPhone,
    isMediumPhone,
    isLargePhone,
    isTablet,
    isPortrait,
    isLandscape,
    
    // Scale factors (useful for debugging)
    widthScale,
    heightScale,
  };
}