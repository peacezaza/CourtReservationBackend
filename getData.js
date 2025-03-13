const axios = require("axios")



async function getCountryData() {
    try {
        const response = await axios.get("https://countriesnow.space/api/v0.1/countries");

        // const countryNames = response.data.map(data => data.country);
        // console.log(response.data)

        const countryNames = response.data.data.map(data => data.country)


        return countryNames

    } catch (error) {
        console.error("Error fetching countries:", error);
        return false
    }
}

async function getStates(country) {
    try {
        const response = await axios.post("https://countriesnow.space/api/v0.1/countries/states", {
            country: country
        });
        if (response.data.error === false && response.data.data.states) {
            const states = response.data.data.states;

            // Map through the states array and log each state name
            const stateNames = states.map(state => state.name);
            // console.log(stateNames);
            return stateNames
        } else {
            console.log("No states data found.");
        }
    } catch (error) {
        console.error("Error fetching states:", error);
    }
}

function getWeekPeriod(){
    const today = new Date()
    const dayOfWeek = today.getDay()

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));

    const weekperiod = {
        start:startOfWeek.toISOString(),
        end:endOfWeek.toISOString()
    }

    return weekperiod
}

function getMonthPeriod() {
    const today = new Date();

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthPeriod = {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
    };

    return monthPeriod;
}

function getYearPeriod() {
    const today = new Date();

    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31);

    const yearPeriod = {
        start: startOfYear.toISOString(),
        end: endOfYear.toISOString()
    };

    return yearPeriod;
}

const groupByWeeks = (statistics) => {
    const weeks = { week1: 0, week2: 0, week3: 0, week4: 0 };

    statistics.forEach(entry => {
        const localDate = new Date(entry.date);
        const dayOfMonth = localDate.getDate(); // Get day of the month

        if (dayOfMonth <= 7) {
            weeks.week1 += entry.total_reservations;
        } else if (dayOfMonth <= 14) {
            weeks.week2 += entry.total_reservations;
        } else if (dayOfMonth <= 21) {
            weeks.week3 += entry.total_reservations;
        } else {
            weeks.week4 += entry.total_reservations;
        }
    });

    return weeks;
};

const groupByMonths = (statistics) => {
    const months = {
        Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
        Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0
    };

    statistics.forEach(entry => {
        const localDate = new Date(entry.date);
        const monthKey = localDate.toLocaleString("en-US", { month: "short" }); // Get "Jan", "Feb", etc.

        months[monthKey] += entry.total_reservations;
    });

    return months;
};

module.exports = { getCountryData, getStates, getWeekPeriod, getMonthPeriod, getYearPeriod, groupByWeeks, groupByMonths }
