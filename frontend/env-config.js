// ============================================
// ENVIRONMENT AUTO-DETECTION
// ============================================

// Detect if running locally or on production
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname === '192.168.1.';

// Set API URL based on environment
const API_URL = isLocal 
    ? 'http://localhost:5000/api/v1' 
    : 'https://aliceblue-herring-771053.hostingersite.com/api.php/api/v1';

// Log which environment we're using
console.log('🌍 Environment:', isLocal ? 'Local (Development)' : 'Production (Hostinger)');
console.log('🔗 API URL:', API_URL);
console.log('📍 Hostname:', window.location.hostname);
