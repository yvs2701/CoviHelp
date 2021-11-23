const stateRadio = document.querySelectorAll('input[name="state-or-pin"]');
const pincode_input_field = document.getElementById('$pincode');
const state_dropdown_field = document.getElementById('choose-state');
const district_dropdown_field = document.getElementById('choose-district');
var stop_background_checking = true;

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
const notify = () => {
    const ding_notify = new Audio('./sounds/ding.mp3');
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
    ding_notify.play();
}

// gets location
const getStates = async () => {
    const url = 'https://cdn-api.co-vin.in/api/v2/admin/location/states';
    const response = await getRequest(url);

    const state_dropdown = document.getElementById('choose-state');
    response['states'].forEach(state => {
        const dropdown_item = document.createElement('option');
        dropdown_item.setAttribute('value', `${state.state_id}`);
        dropdown_item.appendChild(document.createTextNode(state.state_name));
        state_dropdown.appendChild(dropdown_item);
    });
}
const getDistricts = async (state) => {
    const url = `https://cdn-api.co-vin.in/api/v2/admin/location/districts/${state}`;
    const response = await getRequest(url);

    const district_dropdown = document.getElementById('choose-district');
    district_dropdown.innerHTML = '<option value="NULL">choose district</option>';
    response['districts'].forEach(district => {
        const dropdown_item = document.createElement('option');
        dropdown_item.setAttribute('value', `${district.district_id}`);
        dropdown_item.appendChild(document.createTextNode(district.district_name));
        district_dropdown.appendChild(dropdown_item);
    });
}

// filters data according to user selections
const filters = (arr) => {
    const age = parseInt(document.getElementById('age-group-filter').value);
    arr = arr.filter(obj => obj.min_age_limit >= age); // age filtered

    /* const dose = document.getElementsByName('dose');
    due to some warnings in the docs: https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByName
    We can still use:*/
    const dose = document.querySelector('input[name="vaccine"]:checked').value;
    if (dose === '1')
        arr = arr.filter(obj => obj.available_capacity_dose1 !== 0); // dose filtered
    else if (dose === '1')
        arr = arr.filter(obj => obj.available_capacity_dose2 !== 0); // dose filtered

    const vaccine = document.querySelector('input[name="vaccine"]:checked').value;
    if (vaccine) arr = arr.filter(obj => obj.vaccine === vaccine); // vaccine filtered

    return arr;
}

// injects data in html
const renderSlots = (response, notify_user = false) => {
    var table = document.getElementsByTagName('table');
    if (table.length == 1) {
        // till now we have only 1 table (i.e. no slots-table was generated)
        table = document.createElement('table');
        table.setAttribute('class', 'slots-table');
        document.getElementById('stop').insertAdjacentElement("afterend", table);
    } else {
        table = table[1]; // assign table to the slots-table to rerender it with new data
    }
    // check if response exists.. then check if it has any sessions or not
    if (response === undefined) {
        table.innerHTML = '<tr><td><h4>Some error occured</h4></td></tr>';
    } else if (response.hasOwnProperty('sessions')) {
        if (response.sessions.length === 0)
            table.innerHTML = '<tr><td><h4>No slots found</h4></td></tr>';
        else {
            // response is valid and was found; also the user must have clicked submit button
            // hence store the current settings
            save_settings(response);
            const res = filters(response.sessions, table); // modify the response based on filters selected by user
            if (res.length === 0) {
                table.innerHTML = '<tr><td><h4>No slots found</h4></td></tr>';
            } else {
                if (notify_user)
                    notify();
                table.innerHTML =
                    `<thead>
                    <tr>
                        <td><h4>Center Name</h4></td>
                        <td><h4>Address</h4></td>
                        <td><h4>Vaccine</h4></td>
                        <td><h4>Age limit</h4></td>
                        <td><h4>Vaccination slots</h4></td>
                    </tr>
                </thead>
                <tbody>`;
                res.forEach((center) => {
                    table.innerHTML +=
                        `<tr>
                        <td>${center.name}</td>
                        <td>${center.address}</td>
                        <td>${center.vaccine}</td>
                        <td>${center.min_age_limit}</td>
                        <td>
                            <p><h4>Dose 1: </h4>${center.available_capacity_dose1}</p>
                            <p><h4>Dose 2: </h4>${center.available_capacity_dose2}</p>
                        </td>
                    </tr>`;
                });
                table.innerHTML += '</tbody>';
            }
        }
    } else table.innerHTML = '<tr><td><h4>Some error occured</h4></td></tr>';
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
    renderSlots(response, true);
}
const findVaccineByState = async (dist_id) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    const response = await
        getRequest(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByDistrict?district_id=${dist_id}&date=${dd}-${mm}-${yyyy}`);
    save_settings(response);
    renderSlots(response, true);
}

// save settings and restore the saved settings functions
function save_settings(response) {
    if (response)
        chrome.storage.local.set({
            'slots_and_settings': {
                'pincode-checked': stateRadio[0].checked,
                'pincode': pincode_input_field.value,
                'state': state_dropdown_field.value,
                'district': district_dropdown_field.value,
                'age-group-filter': document.getElementById('age-group-filter').value,
                'dose': document.querySelector('input[name="dose"]:checked').value,
                'vaccine': document.querySelector('input[name="vaccine"]:checked').value,
                'stop': stop_background_checking,
                'data': response
            }
        });
    else
        chrome.storage.local.get('slots_and_settings', (obj) => {
            if (obj.hasOwnProperty('slots_and_settings')) {
                obj = obj['slots_and_settings'];
                chrome.storage.local.set({
                    'slots_and_settings': {
                        ...obj,
                        'pincode-checked': stateRadio[0].checked,
                        'pincode': pincode_input_field.value,
                        'state': state_dropdown_field.value,
                        'district': district_dropdown_field.value,
                        'age-group-filter': document.getElementById('age-group-filter').value,
                        'dose': document.querySelector('input[name="dose"]:checked').value,
                        'vaccine': document.querySelector('input[name="vaccine"]:checked').value,
                        'stop': stop_background_checking,
                    }
                });
            }
        });
}
// restore
window.onload = async () => {
    await getStates();
    await chrome.storage.local.get('slots_and_settings', async (obj) => {
        if (obj.hasOwnProperty('slots_and_settings')) {
            obj = obj['slots_and_settings'];
            pincode_input_field.value = obj['pincode'];
            state_dropdown_field.value = obj['state'];
            await getDistricts(obj['state']);
            district_dropdown_field.value = obj['district'];

            if (obj['pincode-checked']) {
                stateRadio[0].checked = true;
                if (pincode_input_field.hasAttribute('disabled')) {
                    pincode_input_field.disabled = false;
                    state_dropdown_field.disabled = true;
                    district_dropdown_field.disabled = true;
                }
                if (!district_dropdown_field.hasAttribute('disabled'))
                    district_dropdown_field.disabled = false;
            }
            else if (!obj['pincode-checked']) {
                stateRadio[1].checked = true;
                if (!pincode_input_field.hasAttribute('disabled')) {
                    pincode_input_field.disabled = true;
                    state_dropdown_field.disabled = false;
                }
                if ((state_dropdown_field.value !== 'NULL' && district_dropdown_field.hasAttribute('disabled'))
                    || state_dropdown_field.value === 'NULL' && !district_dropdown_field.hasAttribute('disabled'))
                    district_dropdown_field.toggleAttribute('disabled');
            }

            document.getElementById('age-group-filter').value = obj['age-group-filter'];

            dose = obj['dose'];
            var radio1 = document.getElementById('dose-all');
            var radio2 = document.getElementById('dose-1');
            var radio3 = document.getElementById('dose-2');
            if (dose === '1')
                radio2.checked = true;
            else if (dose === '2')
                radio3.checked = true;

            vaccine = obj['vaccine'];
            radio1 = document.getElementById('Covishield');
            radio2 = document.getElementById('Covaxin');
            radio3 = document.getElementById('SputnikV');
            if (vaccine === 'COVISHIELD')
                radio1.checked = true;
            else if (vaccine === 'COVAXIN')
                radio2.checked = true;
            else if (vaccine === 'SPUTNIK V')
                radio3.checked = true;

            renderSlots(obj['data'], false);
        } else {
            getStates();
        }
    });

    // event handlers
    stateRadio[0].onclick = () => { // pincode radio
        if (pincode_input_field.hasAttribute('disabled')) {
            pincode_input_field.disabled = false;
            state_dropdown_field.disabled = true;
            district_dropdown_field.disabled = true;
        }
        if (!district_dropdown_field.hasAttribute('disabled'))
            district_dropdown_field.disabled = false;
        save_settings();
    };
    stateRadio[1].onclick = () => {
        if (!pincode_input_field.hasAttribute('disabled')) {
            pincode_input_field.disabled = true;
            state_dropdown_field.disabled = false;
        }
        if ((state_dropdown_field.value !== 'NULL' && district_dropdown_field.hasAttribute('disabled'))
            || state_dropdown_field.value === 'NULL' && !district_dropdown_field.hasAttribute('disabled'))
            district_dropdown_field.toggleAttribute('disabled');
        save_settings();
    };

    state_dropdown_field.onchange = () => {
        if (state_dropdown_field.value !== 'NULL') {
            getDistricts(state_dropdown_field.value);
            if (district_dropdown_field.hasAttribute('disabled'))
                district_dropdown_field.toggleAttribute('disabled');
        } else if (state_dropdown_field.value === 'NULL' && !district_dropdown_field.hasAttribute('disabled'))
            district_dropdown_field.toggleAttribute('disabled');
        save_settings();
    };

    document.getElementById('submit').onclick = () => {
        stop_background_checking = false;
        if (stateRadio[0].checked && pincode_input_field.value.length === 6)
            findVaccineByPincode(pincode_input_field.value);
        else if (stateRadio[1].checked)
            findVaccineByState(district_dropdown_field.value);
    }
    document.getElementById('stop').onclick = () => {
        stop_background_checking = true;
        save_settings();
    }
}
