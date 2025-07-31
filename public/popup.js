document.addEventListener('DOMContentLoaded', function() {
    const openSidebarBtn = document.getElementById('openSidebar');
    
    openSidebarBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleSidebar'});
            window.close();
        });
    });
});