const getRequest = async (URL) => {
    const options = {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36', 'content-type': 'application/json'
        },
        mode: 'cors'
    }
    const data = await fetch(URL, options);
    return data.json();
};

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

const findVaccineByPincode = async (pin) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    const response = await
        getRequest(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByPin?pincode=${pin}&date=${dd}-${mm}-${yyyy}`);
    // response.sessions: array...
}
const findVaccineByState = async (dist_id) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    const response = await
        getRequest(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/findByDistrict?district_id=${dist_id}&date=${dd}-${mm}-${yyyy}`);
    // response.sessions: [{}, {}, {}, ...]
}
/** each object in array of response sessions looks like:
{
    address: "Chinhat Lucknow"
    allow_all_age: true
    available_capacity: 0
    available_capacity_dose1: 0
    available_capacity_dose2: 0
    block_name: "Chinhat"
    center_id: 889391
    date: "06-11-2021"
    district_name: "Lucknow"
    fee: "0"
    fee_type: "Free"
    from: "10:00:00"
    lat: 26
    long: 81
    min_age_limit: 18
    name: "Chinhat CHC Mobile Team-2"
    pincode: 226028
    session_id: "f38274f1-0dfa-4288-8174-f47d3bed1e40"
    slots: ["10:00AM-11:00AM", "11:00AM-12:00PM", "12:00PM-01:00PM", "01:00PM-04:00PM"]
    state_name: "Uttar Pradesh"
    to: "16:00:00"
    vaccine: "COVAXIN"
} */
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
