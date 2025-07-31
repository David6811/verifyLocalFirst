let sidebarIframe = null;

function createSidebar() {
  if (sidebarIframe) return;

  // Create sidebar container
  const sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'mateme-sidebar-container';
  sidebarContainer.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    z-index: 2147483647;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
  `;

  // Create iframe
  sidebarIframe = document.createElement('iframe');
  sidebarIframe.src = chrome.runtime.getURL('sidebar.html');
  sidebarIframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: white;
  `;

  sidebarContainer.appendChild(sidebarIframe);
  document.body.appendChild(sidebarContainer);

  // Adjust page content to make room for sidebar
  adjustPageContent(true);

  // Listen for close messages from sidebar
  window.addEventListener('message', function(event) {
    if (event.data.action === 'closeSidebar') {
      removeSidebar();
    }
  });
}

function removeSidebar() {
  const container = document.getElementById('mateme-sidebar-container');
  if (container) {
    container.remove();
    sidebarIframe = null;
    adjustPageContent(false);
  }
}

function adjustPageContent(addSidebar) {
  // Adjust body to make room for sidebar
  if (addSidebar) {
    document.body.style.marginRight = '400px';
    document.body.style.transition = 'margin-right 0.3s ease-in-out';
  } else {
    document.body.style.marginRight = '0';
  }
}

// Auto-create sidebar when page loads
document.addEventListener('DOMContentLoaded', function() {
  createSidebar();
});

// If DOM is already loaded, create sidebar immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createSidebar);
} else {
  createSidebar();
}

// Prevent conflicts with existing content
(function() {
  'use strict';
  // Extension code is isolated
})();