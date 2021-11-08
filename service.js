chrome.notifications.onButtonClicked.addListener((id, btnIndex) => {
    if (id === 'slots_available') {
        if (btnIndex === 0) {
            chrome.notifications.clear(id);
        } else if (btnIndex === 1) {
            console.log('opening');
            chrome.tabs.create({ url: 'https://selfregistration.cowin.gov.in/' });
        }
    }
});

chrome.notifications.onClicked.addListener((id) => {
    if (id === 'slots_available')
        chrome.tabs.create({ url: 'https://selfregistration.cowin.gov.in/' });
});
