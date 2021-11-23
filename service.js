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

// makes a get request
const getRequest = async (URL) => {
    const options = {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36', 'content-type': 'application/json'
        },
        mode: 'cors'
    }
    try {
        const data = await fetch(URL, options);
        return data.json();
    } catch (err) {
        console.error('Get request failed:\n' + err);
        return { error_message: err };
    }
}

// creates a chrome notification
const notify_user = () => {
    // chrome.notifications.clear('slots_available');
    chrome.notifications.create('slots_available', {
        iconUrl: 'icon48.png',
        type: 'basic',
        title: 'Slots available',
        message: 'Hurry ! Vaccination slots are available !',
        buttons: [
            {
                title: 'Cancel'
            },
            {
                title: 'Go to CoWin'
            }
        ]
    });
}

// finds vaccines
const findVaccineByPincode = async (pin) => {
    const today = new Date();
    /* String.padStart(): Pads the current string with a given string (possibly repeated) so that the
    resulting string reaches a given length. The padding is applied from the start (left) of the current string. */
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    const response = await
        getRequest(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByPin?pincode=${pin}&date=${dd}-${mm}-${yyyy}`);
    save_settings(response);
    notify_user();
}
const findVaccineByState = async (dist_id) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    const response = await
        getRequest(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByDistrict?district_id=${dist_id}&date=${dd}-${mm}-${yyyy}`);
    save_settings(response);
    notify_user();
}

// saves current user selections and settings
function save_settings(response) {
    var saved_settings = {};
    chrome.storage.local.get('slots_and_settings', (obj) => {
        if (obj.hasOwnProperty('slots_and_settings'))
            saved_settings = obj['slots_and_settings'];
    });
    chrome.storage.local.set({
        'slots_and_settings': {
            ...saved_settings,
            'data': response
        }
    });
    if (response.hasOwnProperty['sessions'])
        if (response.sessions.length !== 0)
            notify_user();
}

chrome.alarms.onAlarm.addListener(() => {
    chrome.storage.local.get('slots_and_settings', (obj) => {
        if (obj.hasOwnProperty('slots_and_settings')) {
            obj = obj['slots_and_settings'];
            if (!obj['stop']) {
                if (obj['pincode-checked'] && obj['pincode'].length === 6)
                    findVaccineByPincode(obj['pincode']);
                else if (obj['district'] !== '')
                    findVaccineByState(obj['district']);
            }
            else {
                chrome.alarms.clearAll();
            }
        }
    });
});

chrome.storage.onChanged.addListener((changes) => {
    chrome.alarms.clearAll();
    if (!changes['slots_and_settings'].newValue['stop']) {
        chrome.alarms.create({ delayInMinutes: 2 });
    }
});
