// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================
// This file auto-detects local vs production

(function() {
    // Check if already loaded
    if (window._configLoaded) return;
    window._configLoaded = true;
    
    // Detect environment
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('192.168.');
    
    // Set API URLs
    window.API_URL = isLocal 
        ? 'http://localhost:5000/api/v1' 
        : 'https://aliceblue-herring-771053.hostingersite.com/api.php/api/v1';
    
    window.ENVIRONMENT = isLocal ? 'development' : 'production';
    
    console.log('========================================');
    console.log('Environment:', window.ENVIRONMENT);
    console.log('API URL:', window.API_URL);
    console.log('========================================');
})();
