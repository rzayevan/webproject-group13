const DataAccessLayer = require('../controllers/DataAccessLayer.js');
const NUMBER_OF_ICONS = 16;
const DAILY_BONUS_VALUE = 100;

/**
 * Checks if the provided credentials match the ones stored in the application
 */
exports.credentialsMatch = function(user) {
    let users = DataAccessLayer.GetCachedUsers();
    let matchFound = false;
    let userData = {};
    let banned = false;
    users.forEach(existingUser => {
        if (user.email.toLowerCase() === existingUser.email.toLowerCase() && user.password === existingUser.password) {
            matchFound = true;
            userData = existingUser;
            banned = existingUser.banned;
        }
    });

    return {matchFound: matchFound, userData: userData, banned: banned};
}

/**
 * Checks whether or not the provided email is unique
 */
exports.emailExists = function(user) {
    let users = DataAccessLayer.GetCachedUsers();
    let emailExists = false;

    users.forEach(existingUser => {
        if (user.email.toLowerCase() === existingUser.email.toLowerCase()) {
            emailExists = true;
        }
    });

    return emailExists;
}

<<<<<<< HEAD
/**
 * Sets user log in status
 * Will set supplied user's loggedIn status to the boolean value provided
 */
exports.setUserLogInStatus = function(user,loggedIn) {
    user.loggedIn = loggedIn;
    DataAccessLayer.UpdateUser(user);
}

exports.getUser = function(id) {
=======
exports.getUserById = function(id) {
>>>>>>> 1451cc0a3dc3c037a0a860bdb32c895ae0a06e06
    let users = DataAccessLayer.GetCachedUsers();

    let matchingUser = users.find(user => {
        return user.id === id;
    });

    return matchingUser;
}

exports.getUserByUsername = function(username) {
    let users = DataAccessLayer.GetCachedUsers();

    let matchingUser = users.find(user => {
        return user.username === username;
    });

    return matchingUser;
}

exports.createUserIcon = function(number) {
    if(number !== undefined && !Number.isNaN(number)){
        return 'player_icon_' + number.toString();
    }
    else{
        return 'player_icon_' + Math.floor(Math.random()*NUMBER_OF_ICONS+1).toString();
    }
}

exports.getDailyBonusValue = function() {
    return DAILY_BONUS_VALUE;
}