// Mobile Controls Handler
(function() {
  // Detect touch device
  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
  }
  
  // Add class to body if touch device
  function initTouchDetection() {
    if (isTouchDevice()) {
      document.body.classList.add('touch-device');
      console.log('Touch device detected, enabling mobile controls');
    }
  }
  
  // Key codes used in the game
  const KEYS = {
    LEFT: 37,
    RIGHT: 39,
    JUMP: 32, // Space
    RUN: 16,  // Shift
    FIRE: 17  // Ctrl
  };
  
  // Function to simulate keydown/keyup events
  function simulateKeyEvent(keyCode, isKeyDown) {
    const eventType = isKeyDown ? 'keydown' : 'keyup';
    
    // Create event with deprecated keyCode for compatibility
    const event = new KeyboardEvent(eventType, {
      bubbles: true,
      cancelable: true,
      keyCode: keyCode,
      which: keyCode,
      code: getKeyCodeString(keyCode)
    });
    
    // Dispatch the event
    document.dispatchEvent(event);
    console.log(`Simulated ${eventType} for key code ${keyCode}`);
  }
  
  // Helper to convert keyCode to code string
  function getKeyCodeString(keyCode) {
    switch(keyCode) {
      case KEYS.LEFT: return 'ArrowLeft';
      case KEYS.RIGHT: return 'ArrowRight';
      case KEYS.JUMP: return 'Space';
      case KEYS.RUN: return 'ShiftLeft';
      case KEYS.FIRE: return 'ControlLeft';
      default: return '';
    }
  }
  
  // Setup button event listeners
  function setupMobileControls() {
    if (!isTouchDevice()) return;
    
    const buttons = {
      'btn-left': KEYS.LEFT,
      'btn-right': KEYS.RIGHT,
      'btn-jump': KEYS.JUMP,
      'btn-run': KEYS.RUN,
      'btn-fire': KEYS.FIRE
    };
    
    // Add event listeners for all buttons
    Object.keys(buttons).forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (!btn) {
        console.error(`Button with id ${btnId} not found`);
        return;
      }
      
      // Touch start - simulate keydown
      btn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        simulateKeyEvent(buttons[btnId], true);
      });
      
      // Touch end - simulate keyup
      btn.addEventListener('touchend', function(e) {
        e.preventDefault();
        simulateKeyEvent(buttons[btnId], false);
      });
      
      // Prevent default behavior for all touch events
      ['touchmove', 'touchcancel'].forEach(eventType => {
        btn.addEventListener(eventType, e => e.preventDefault());
      });
      
      console.log(`Mobile control button ${btnId} initialized`);
    });
  }
  
  // Initialize when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing mobile controls');
    initTouchDetection();
    setupMobileControls();
  });
  
  // Also try initializing immediately if DOM is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already loaded, initializing mobile controls immediately');
    initTouchDetection();
    setupMobileControls();
  }
})();