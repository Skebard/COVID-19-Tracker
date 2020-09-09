$(document).ready(function () {
    //todo HTML elements
    let worldMenu = $("#world-search-id");
    let spainMenu = $("#spain-search-id");


    //todo initialization functions
    //get the language of the browser
    let lang = "en";
    if (window.navigator.language.includes("es")) {
        lang = "es";
    }
    getSelectNames(lang);

    $.getJSON('http://www.geoplugin.net/json.gp?jsoncallback=?', function (data) {
        console.log(data);
        data.geoplugin_countryName = "spain";
        selectCountryRegions(data.geoplugin_countryName);
    });


    $("#btn-world").click((e) => {
        worldMenu.removeClass("hide");
        spainMenu.addClass("hide");
    });
    $("#btn-spain").click((e) => {
        worldMenu.addClass("hide");
        spainMenu.removeClass("hide");
    });



    $.getJSON('https://api.covid19tracking.narrativa.com/api/country/spain/region/madrid?date_from=2020-03-20&date_to=2020-03-22', function (data) {
        console.log(data);

    });


});

function addEvents(){
    let date =$("#day-id-world");
    Object.keys(ISO_COUNTRIES).forEach((el)=>{
        let country = $(`#jqvmap1_${el.toLowerCase()}`);
        let originalColor = country.css("fill");
        if(country.length>0){
            let countryName = ISO_COUNTRIES[el].toLowerCase();
            let exception = CODE_COUNTRIES.indexOf(el.toLowerCase());
            if( exception!==-1){
                countryName = COUNTRIES[exception];
            }
            country.click(()=>{
               console.log("hello its me: "+countryName);
               displayData(validateDateInput(date),countryName);
               country.css("fill",originalColor);//cancel library
            });
        }
    });
}


//checks if the countries and their respective regions are in the local storage.If not
//it stores them.
//land(optional): indicates in which language the country names will be displayed. "en" = english "es"=spanish
function getSelectNames(lang, selectedCountry) {
    function populateCountries(countries, lang = "en") {
        let countrySelector = $("#country-id");
        countries.forEach((country) => {
            let countryName = (lang == "en") ? country.name : country.name_es;
            let option = $("<option>" + countryName + "</option>");
            option.val(country.name);
            countrySelector.append(option);
        });
    }
    //chek if the countries are already stored in the local storage
    if (localStorage.covidCountries != undefined) {
        let countries = JSON.parse(localStorage.covidCountries);
        if (countries.length > 100) { //at least we expect data from 100 countries
            populateCountries(countries, lang);
            return true;
        }
    }


    $.getJSON('https://api.covid19tracking.narrativa.com/api/2020-09-01', function (data) {
        let all = data.dates['2020-09-01'];
        let countries = all.countries;
        let countryRegions = [];
        let countriesNames = Object.keys(countries);
        countriesNames.forEach(name => {
            let currentCountry = countries[name];
            let newCountry = {
                name: currentCountry.name,
                name_es: currentCountry.name_es,
                regions: []
            }
            currentCountry.regions.forEach(el => {
                newCountry.regions.push(el.name);
            });
            countryRegions.push(newCountry);
        });
        populateCountries(countryRegions, lang);
        localStorage.covidCountries = JSON.stringify(countryRegions);
    });
}

function selectCountryRegions(countryName) {
    let regionSelector = $("#region-id");
    let option = $(`<option>Entire country</option>`);
    regionSelector.append(option);
    JSON.parse(localStorage.covidCountries).forEach((country) => {
        if (country.name.toLowerCase() === countryName.toLowerCase() || country.name_es.toLowerCase() === countryName.toLowerCase()) {
            country.regions.forEach(r => {
                let option = $(`<option>${r}</option>`);
                regionSelector.append(option);
            });
            return true;
        }
    });
    //set default country Spain
}

//https://api.covid19tracking.narrativa.com/api/country/spain/region/madrid?date_from=2020-03-20&date_to=2020-03-22
//https://api.covid19tracking.narrativa.com/api/country/spain?date_from=2020-03-20&date_to=2020-03-22
//https://api.covid19tracking.narrativa.com/api/:date/country/:country/region/:region
let global;
function displayData(date, country, region = undefined) {
    let formatedDate = formatDate(date);
    let request = `https://api.covid19tracking.narrativa.com/api/${formatedDate}/country/${country.toLowerCase()}`;
    if (region != undefined) {
        request += `/region/${region.toLowerCase()}`;
    }
    $.getJSON(request, function (data) {
        let oData;
        //global = {...global,...data}
        if (region === undefined) {
            global = data;
            console.log(formatedDate);
            console.log(data);
            oData = data.dates[formatedDate].countries;
            let firstKey = Object.keys(oData)[0];
            oData = oData[firstKey];
            console.log(oData);
            createRow(oData);
        } else {
            oData = data.regions[0];
        }
    });
}

let myData = [];
// [{date,data},{date,data}]
function loadDataLocalStorage() {
    if (localStorage.dataCountriesCovid !== undefined) {
        myData = JSON.parse(localStorage.dataCountriesCovid);
        myData[0].date = new Date(myData[0].date);
    }
}

function updateLocalStorage() {
    localStorage.dataCountriesCovid = JSON.stringify(myData);
}


function clearResults() {
    let container = $(".results");
    let title = container.children()[0];
    container.children().remove();
    container.append(title);
}


function createRow(data) {
    let row = $(`<ul class="row"></ul>`);
    let liName = $(`<li>${data.name}</li>`);
    row.append(liName);
    const propertiesNames = ["today_confirmed", "today_new_confirmed", "today_deaths", "today_new_deaths", "today_recovered", "today_new_recovered"];
    propertiesNames.forEach(name => {
        let getData = data[name];
        if (getData != undefined) {
            let li = $(`<li>${getData}</li>`);
            row.append(li);
        }
    });
    $(".results").append(row);

    //extra
    //open cases
    //intensive care
    //hospitalisedpatients

}




let searchWorld= $("#world-search-id");
let btnClear = $("#btn-clear");
btnClear.click(clearResults);
searchWorld.submit((e)=>searchWorldData(e));

function searchWorldData(e){
    e.preventDefault();
    let date = validateDateInput($("#day-id-world"));
    if(date===false){
        return false;
    }
    let country=$("#country-id").val();
    if(country==="world"){
        displayWorld(date,country);
    }else{
        displayData(date,country);
    }
}
function validateDateInput(date){
    if(date.val()===" "){
        return false;
    }else{
        return new Date(date.val());
    }
}

function displayWorld(date = undefined) {
    clearResults()
    //select date
    let selectedDate = (date === undefined) ? new Date() : date;
    let formatedDate = formatDate(selectedDate);
    let request = `https://api.covid19tracking.narrativa.com/api/${formatedDate}`;

    //loading...

    $.ajax(request, {
        method: "GET"
    }).then(
        function success(data) {
            currentData = data;
            let date = new Date(Object.keys(data.dates)[0]);
            myData.push({
                date: date,
                data: data
            });
            printTable();
        },
        function failed() {
            alert("failed");
        }
    ).done(()=>{
        //clear loading
    });

    function printTable() {
        console.log(currentData);
        let oData = currentData.dates[formatedDate].countries;
        let keys = Object.keys(oData);
        keys.sort((a, b) => {
            return oData[b].today_confirmed - oData[a].today_confirmed;
        });
        keys.forEach((key) => {
            createRow(oData[key]);
        });
    }
}
function formatDate(date) {
    let formatedDate = date.getFullYear() + "-";
    formatedDate += (date.getMonth() > 8) ? date.getMonth() + 1 : "0" + String(date.getMonth() + 1);
    formatedDate += "-";
    formatedDate += (date.getDate() > 9) ? date.getDate() : "0" + String(date.getDate());
    return formatedDate;
}
