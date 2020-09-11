let currentWorldData;
let currentSpainData;
$(document).ready(function () {
    //todo HTML elements
    let worldMenu = $("#world-search-id");
    let spainMenu = $("#spain-search-id");
    let searchWorld= $("#world-search-id");
    let searchSpain = $("#spain-search-id");
    let btnWorldVisibility = $("#btn-world-visibility");
    let worldMap = $("#vmap");
    let resultWorld = $(".results-world");
    let resultSpain = $(".results-spain");
    let today = new Date();
    let yesterday = new Date(today.getFullYear(),today.getMonth(),today.getDate()-1)

    //todo initialization functions
    //get the language of the browser
    let lang = "en";
    if (window.navigator.language.includes("es")) {
        lang = "es";
    }
    getSelectNames(lang);

    $.getJSON('http://www.geoplugin.net/json.gp?jsoncallback=?', function (data) {
        //console.log(data);
        data.geoplugin_countryName = "spain";
        selectCountryRegions(data.geoplugin_countryName);
    });

    setDefaultDate();
    addMapEvents();
    searchWorldData();
    displayAllRegions(yesterday,"spain");
    addSortingEvents();
    searchWorld.submit((e)=>searchWorldData(e));
    searchSpain.submit((e)=>searchSpainData(e));

    $("#btn-world").click((e) => {
        worldMenu.removeClass("hide");
        spainMenu.addClass("hide");
        resultWorld.removeClass("hide");
        resultSpain.addClass("hide");

    });
    $("#btn-spain").click((e) => {
        worldMenu.addClass("hide");
        spainMenu.removeClass("hide");
        resultWorld.addClass("hide");
        resultSpain.removeClass("hide");
    });
    btnWorldVisibility.click(()=>{
        worldMap.toggleClass("hide");
        if(worldMap.hasClass("hide")){
            btnWorldVisibility.text("Show");
            btnWorldVisibility.addClass("show");
        }else{
            btnWorldVisibility.text("Hide");
            btnWorldVisibility.removeClass("show");
        }
    })


    $.getJSON('https://api.covid19tracking.narrativa.com/api/country/spain/region/madrid?date_from=2020-03-20&date_to=2020-03-22', function (data) {
        console.log(data);
    });

});

function addMapEvents(){
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
               displayData(validateDateInput(date),countryName);
               country.css("fill",originalColor);//cancel library
            });
        }
    });
}


//sets the date for the date inputs. The default date is yesterday because for the current day it could be that not all the data
//has been collected
function setDefaultDate(){
    let today = new Date();
    let yesterday = new Date(today.getFullYear(),today.getMonth(),today.getDate()-1);
    $("#day-id-world, #day-id-spain").val(formatDate(yesterday));
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

    JSON.parse(localStorage.covidCountries).forEach((country) => {
        if (country.name.toLowerCase() === countryName.toLowerCase() || country.name_es.toLowerCase() === countryName.toLowerCase()) {
            country.regions.forEach(r => {
                let option = $(`<option>${r}</option>`);
                option.val(r);
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
        clearResults(true);
    }else{
        clearResults(false);
    }
    $("#loading-icon").removeClass("hide");
    $.getJSON(request, function (data,str,jqXHR) {
        let oData;
        //global = {...global,...data}
        if (region === undefined) {
            
            global = data;
            oData = data.dates[formatedDate].countries;
            let firstKey = Object.keys(oData)[0];
            oData = oData[firstKey];
            createRow(oData);
        } else {
            oData = data.dates[formatedDate].countries;
            oData = oData[Object.keys(oData)[0]].regions["0"];
            createRow(oData,true);
        }
    })
    .done(()=>  $("#loading-icon").addClass("hide"));
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


function clearResults(spain=false) {
    let container;
    if(spain){
        container = $(".results-spain > :nth-child(1n+2");
        //currentSpainData = [];
    }else{
        container = $(".results-world > :nth-child(1n+3");// 3 because there is the map and the row with data titles
        //currentWorldData = [];
    }
    container.children().remove();
}


function createRow(data,spain=false) {
    let row = $(`<ul class="row"></ul>`);
    let liName = $(`<li>${data.name}</li>`);
    row.append(liName);
    const propertiesNames = ["today_confirmed", "today_new_confirmed", "today_deaths", "today_new_deaths", "today_recovered", "today_new_recovered"];
    propertiesNames.forEach(name => {
        let getData = data[name];
        let li;
        if (getData != undefined) {
            li = $(`<li>${getData}</li>`);
            
        }else{
            li = $("<li>0</li>");
        }
        row.append(li);

    });
    if(spain){
        $(".results-spain").append(row);
    }else{
        $(".results-world").append(row);
    }
}


/**
 * Prints the data sorted
 *  @parameter: parameter to use as reference
 *  @ascending: if true the data will be ascending if false descending
 *  @data: data to be sorted
 *  @world: if true data if from world if false it is from spain
 */
function sortData(parameter,ascending,data,world=true){
    clearResults(!world);
   let keys = Object.keys(data);
   keys.sort((a,b)=>{
       if(ascending){
        return data[a][parameter]-data[b][parameter];
       }
        return data[b][parameter]-data[a][parameter];
   });
   keys.forEach((key)=>{
       createRow(data[key],!world);
   });
}

function addSortingEvents(){
    $(".results-world .column-title >li").each((index,el)=>{
        let ascending = true;
        let arrows = $(el).children();
        $(el).click((e)=>{
            let param = $(e.currentTarget).data("value");
            $(".results-world .column-title >li >span").css("background-image","url('images/up-down-arrow.svg')")
            if(ascending){
                arrows.css("background-image","url('images/up-down-arrow-D.svg')");
            }else{
                arrows.css("background-image","url('images/up-down-arrow-U.svg')");
            }
            sortData(param,ascending,currentWorldData,true);
            ascending = !ascending;
        });
    })

    $(".results-spain .column-title >li").each((index,el)=>{
        let ascending = true;
        let arrows = $(el).children();
        $(el).click((e)=>{
            let param = $(e.currentTarget).data("value");
            $(".results-spain .column-title >li >span").css("background-image","url('images/up-down-arrow.svg')")
            if(ascending){
                arrows.css("background-image","url('images/up-down-arrow-D.svg')");
            }else{
                arrows.css("background-image","url('images/up-down-arrow-U.svg')");
            }
            sortData(param,ascending,currentSpainData,false);
            ascending = !ascending;
        });
    })

}

function searchWorldData(e=undefined){
    if(e!==undefined){
        e.preventDefault();
    }
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


function displayAllRegions(date,country){
    let formatedDate = formatDate(date);
    let request = `https://api.covid19tracking.narrativa.com/api/${formatedDate}/country/${country.toLowerCase()}`;
    $.getJSON(request,function(data){
        let oData = data.dates[formatedDate].countries;
        oData = oData[Object.keys(oData)[0]].regions;
        currentSpainData = oData;
        console.log(oData);
        console.log(data);
        oData.forEach((region)=>{
            createRow(region,true);
        })
    });
}


function displayWorld(date = undefined) {
    clearResults();
    //select date
    let selectedDate = (date === undefined) ? new Date() : date;
    let formatedDate = formatDate(selectedDate);
    let request = `https://api.covid19tracking.narrativa.com/api/${formatedDate}`;

    $("#loading-icon").removeClass("hide");

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
        $("#loading-icon").addClass("hide");
    });

    function printTable() {
        let oData = currentData.dates[formatedDate].countries;
        currentWorldData = oData;
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



//todo we need to get the id for the regions so later we can make
//todo requests to get that region