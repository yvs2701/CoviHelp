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

const renderSlots = (response) => {
    var table = document.getElementsByTagName('table');
    if (table.length == 1) {
        // till now we have only 1 table (i.e. no slots-table was generated)
        table = document.createElement('table');
        table.setAttribute('class', 'slots-table');
        document.getElementById('submit').insertAdjacentElement("afterend", table);
    } else {
        table = table[1]; // assign table to the slots-table to rerender it with new data
    }
    if (response.sessions.length === 0) {
        table.innerHTML = '<tr><td><h4>No slots found</h4></td></tr>';
    } else {
        const res = filters(response.sessions, table); // modify the response based on filters selected by user
        if (res.length === 0) {
            table.innerHTML = '<tr><td><h4>No slots found</h4></td></tr>';
        } else {
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
}

const findVaccineByPincode = async (pin) => {
    const today = new Date();
    /* String.padStart(): Pads the current string with a given string (possibly repeated) so that the
    resulting string reaches a given length. The padding is applied from the start (left) of the current string. */
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    const response = await
        getRequest(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByPin?pincode=${pin}&date=${dd}-${mm}-${yyyy}`);
    renderSlots(response);
}
const findVaccineByState = async (dist_id) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    const response = await
        getRequest(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByDistrict?district_id=${dist_id}&date=${dd}-${mm}-${yyyy}`);
    renderSlots(response);
}

window.onload = () => {
    getStates();
    const stateRadio = document.getElementsByName('state-or-pin');
    const pincode_input_field = document.getElementById('$pincode');
    const state_dropdown_field = document.getElementById('choose-state');
    const district_dropdown_field = document.getElementById('choose-district');

    stateRadio[0].onchange = () => {
        pincode_input_field.toggleAttribute('disabled');
        state_dropdown_field.toggleAttribute('disabled');
        if (!district_dropdown_field.hasAttribute('disabled'))
            district_dropdown_field.toggleAttribute('disabled');
    };
    stateRadio[1].onchange = () => {
        pincode_input_field.toggleAttribute('disabled');
        state_dropdown_field.toggleAttribute('disabled');
        if (state_dropdown_field.value !== 'NULL' && district_dropdown_field.hasAttribute('disabled')) {
            district_dropdown_field.toggleAttribute('disabled');
        } else if (state_dropdown_field.value === 'NULL' && !district_dropdown_field.hasAttribute('disabled'))
            district_dropdown_field.toggleAttribute('disabled');
    };

    state_dropdown_field.onchange = () => {
        if (state_dropdown_field.value !== 'NULL') {
            getDistricts(state_dropdown_field.value);
            if (district_dropdown_field.hasAttribute('disabled'))
                district_dropdown_field.toggleAttribute('disabled');
        } else if (state_dropdown_field.value === 'NULL' && !district_dropdown_field.hasAttribute('disabled'))
            district_dropdown_field.toggleAttribute('disabled');
    };

    document.getElementById('submit').onclick = () => {
        if (stateRadio[0].checked && pincode_input_field.value.length === 6)
            findVaccineByPincode(pincode_input_field.value);
        else if (stateRadio[1].checked)
            findVaccineByState(district_dropdown_field.value);
    }
}
