// Utility functions for Figma to React Bridge Plugin

/**
 * Helper function to convert font weight strings to numbers
 */
export function convertFontWeightToNumber(
  fontWeightStyle?: string
): number | undefined {
  if (!fontWeightStyle) return undefined;

  const weightMap: { [key: string]: number } = {
    Thin: 100,
    "Extra Light": 200,
    Light: 300,
    Regular: 400,
    Medium: 500,
    "Semi Bold": 600,
    Bold: 700,
    "Extra Bold": 800,
    Black: 900,
  };

  // Try direct lookup first
  if (weightMap[fontWeightStyle]) {
    return weightMap[fontWeightStyle];
  }

  // Try case-insensitive lookup
  const lowerStyle = fontWeightStyle.toLowerCase();
  for (const [key, value] of Object.entries(weightMap)) {
    if (key.toLowerCase() === lowerStyle) {
      return value;
    }
  }

  // If it's already a number, parse it
  const numericWeight = parseInt(fontWeightStyle, 10);
  if (!isNaN(numericWeight) && numericWeight >= 100 && numericWeight <= 900) {
    return numericWeight;
  }

  // Default to regular weight
  return 400;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `figma-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone and sanitize data to ensure it's serializable
 */
export function sanitizeData(data: any): any {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error("Error sanitizing data:", error);
    return null;
  }
}
