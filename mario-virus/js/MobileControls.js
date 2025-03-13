// Mobile Controls Handler
(function() {
  // Detect touch device
  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  
  // Add class to body if touch device
  if (isTouchDevice()) {
    document.body.classList.add('touch-device');
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
    const event = new KeyboardEvent(isKeyDown ? 'keydown' : 'keyup', {
      keyCode: keyCode,
      which: keyCode,
      bubbles: true
    });
    document.body.dispatchEvent(event);
  }
  
  // Setup button event listeners
  document.addEventListener('DOMContentLoaded', function() {
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
      if (!btn) return;
      
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
    });
  });
})();