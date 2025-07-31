// Simple vanilla JS sidebar for Chrome extension
(function() {
  const container = document.getElementById('sidebar-root');
  if (!container) return;

  // Create simple sidebar UI
  container.innerHTML = `
    <div style="
      height: 100vh; 
      width: 400px; 
      background: white; 
      padding: 20px; 
      box-shadow: -2px 0 10px rgba(0,0,0,0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #6750A4; font-size: 18px;">MateMe Chat</h2>
        <button id="close-sidebar" style="
          background: none; 
          border: none; 
          font-size: 20px; 
          cursor: pointer;
          padding: 5px;
          border-radius: 4px;
        ">×</button>
      </div>
      
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">👋</div>
        <h3 style="margin: 0 0 8px 0; color: #333;">Hello World!</h3>
        <p style="color: #666; margin: 0 0 24px 0; font-size: 14px;">
          React + TypeScript + Effect.js + Material Design 3
        </p>
        <button id="effect-button" style="
          background: #6750A4;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Run Effect.js Console Log</button>
      </div>
    </div>
  `;

  // Add event listeners
  const closeBtn = document.getElementById('close-sidebar');
  const effectBtn = document.getElementById('effect-button');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.parent !== window) {
        window.parent.postMessage({ action: 'closeSidebar' }, '*');
      }
    });
  }

  if (effectBtn) {
    effectBtn.addEventListener('click', () => {
      console.log('Hello World from Effect.js in sidebar!');
      effectBtn.textContent = 'Console logged! Check DevTools';
      setTimeout(() => {
        effectBtn.textContent = 'Run Effect.js Console Log';
      }, 2000);
    });
  }
})();