/**
 * API Configuration
 * Reads from environment variables set at build time
 */

// Get base API URL from environment
const getApiUrl = () => {
    // Prefer public env var so client bundle sees the configured URL
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_API_URL;
    
    if (apiUrl) {
      return apiUrl;
    }
    
    // Fallback: auto-detect based on window location
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const hostname = window.location.hostname;
      
      // If on production domain, assume API is on ore-api subdomain
      if (hostname.includes('0xvoid.dev')) {
        return `${protocol}//ore-api.0xvoid.dev`;
      }
      
      // Default to localhost for development
      return 'http://localhost:3920';
    }
    
    return 'http://localhost:3920';
  };
  
  export const API_BASE_URL = getApiUrl();
  
  // API Endpoints
  export const API_ENDPOINTS = {
    HEALTH: `${API_BASE_URL}/health`,
    DEPOSIT: `${API_BASE_URL}/deposit`,
    WITHDRAW: `${API_BASE_URL}/withdraw`,
    BALANCE: `${API_BASE_URL}/balance`,
    START_ROUND: `${API_BASE_URL}/start-round`,
    START_TIMER: `${API_BASE_URL}/start-timer`,
  };
  
  console.log('🔧 API Configuration:', {
    baseUrl: API_BASE_URL,
    wsUrl: process.env.NEXT_WS_URL,
    network: process.env.NEXT_SOLANA_NETWORK,
  });
  