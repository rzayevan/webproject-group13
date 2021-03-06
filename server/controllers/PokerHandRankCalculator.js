let Card = require("../model/Card.js");
let PokerUtils = require('../utilities/PokerUtils.js');

/**
 * Calculates the hand rank for a given players cards and supplied community cards
 * @param {String[]} communityCards An array containing the current community cards
 * @param {String[]} playerCards An array containing the current cards of the player
 */
exports.calculatePokerHandRank = function(communityCards, playerCards) {
    let cards = new Array(communityCards.length + playerCards.length);
    for(let i = 0; i < communityCards.length; i++) { // convert the five community cards into objects the calculator can use
        let split = communityCards[i].split("_");
        let number;
        // the poker cards use the notation 'number_suit' in string format, the number portion needs to be converted
        switch(split[0]) {
            case 'A':
                number = 1; // ace is the value of 1, some functions in the code will also treat it as 14 (1+ than king=13)
                break;
            case 'J':
                number = 11; // jack is worth 11
                break;
            case 'Q':
                number = 12; // queen is worth 12
                break;
            case 'K':
                number = 13; // king is worth 13
                break;
            default:
                number = parseInt(split[0]); // all other numbers are worth themselves ex: 2 => 2
        }
        let suit = split[1];
        cards[i] = new Card(number, suit);
    }
    for(let i = 0; i < playerCards.length; i++) { // convert the two player cards into objects the calcultor can use
        let split = playerCards[i].split("_");
        let number;
        // the poker cards use the notation 'number_suit' in string format, the number portion needs to be converted
        switch(split[0]) {
            case 'A':
                number = 1; // ace is the value of 1, some functions in the code will also treat it as 14 (1+ than king=13)
                break;
            case 'J':
                number = 11; // jack is worth 11
                break;
            case 'Q':
                number = 12; // queen is worth 12
                break;
            case 'K':
                number = 13; // king is worth 13
                break;
            default:
                number = parseInt(split[0]); // all other numbers are worth themselves ex: 2 => 2
        }
        let suit = split[1];
        cards[i+communityCards.length] = new Card(number, suit);
    }
    // we will iterate through the functions until one returns a positive value

    // number refers to how many cards to include in the highcard calculation
    // condition refers to how that function is to return that result, each function
    // uses the condition to its own definition
    let setUps = [{},{},{},{condition: false}, {condition: true}, {number: 2}, {number: 1}, {number: 3}, {number: 5, condition: true}];
    
    let result = -1;
    
    let handRankFunctions = [
        this.handStraightFlushValue,
        this.handQuadsValue,
        this.handFullHouseValue,
        this.handFlushValue,
        this.handStraightValue,
        this.handThreeOfAKindValue,
        this.handTwoPairValue,
        this.handSinglePairValue,
        this.handHighCardValue
    ]

    for (let i = 0; i < handRankFunctions.length; i++) {
        result = handRankFunctions[i](cards, setUps[i]);
        if (result !== -1) {
            return result;
        }
    }

    return result;
}

/**
 * Check if the supplied cards have a straight flush
 * @param {String[]} cards Array of cards
 * @param {Object[]} setup Array of setup values
 */
exports.handStraightFlushValue = function(cards, setup){
    // first assess whether the hand qualifies as a flush, return the numbers that match the flush suit
    let numbers = exports.handFlushValue(cards, {condition: true});
    if(numbers === -1) {
        return -1;
    }
    let remainingCards = exports.getRemainingCards(numbers); // convert the numbers back into card objects
    // now assess whether the remaining cards qualify as a straight
    let straightResult = exports.handStraightValue(remainingCards, {condition: false});
    if(straightResult === -1) {
        return -1;
    }
    let result = 0x900000 + straightResult; // hexidecimal formating
    return result;
}

/**
 * Check if the supplied cards have a quad
 * @param {String[]} cards Array of cards
 * @param {Object[]} setup Array of setup values
 */
exports.handQuadsValue = function(cards, setup){
    let numbers = exports.getTheNumbersArrayA14(cards); // we want all aces=14 (1 higher than king=13)
    let quad = 4;
    numbers.sort(function(a, b){return a - b}); // sort the numbers in ascending order
    let twoToAceCount = exports.getTwoToAceCount(numbers); // sort the numbers into matching number groups
    let cardNumber = exports.findHighestGroup(twoToAceCount, quad);
    if(cardNumber === -1) {
        return -1;
    }
    let quadResult = 0;
    for(let k = quad; k > 0; k--) {
        quadResult += cardNumber * exports.integerPow(16, k); // the hexidecimal result of the quads
    }
    exports.removeSomeMatchingKeys(numbers, cardNumber, quad); // need a highcard, remove the quad set and search the remainer
    let remainingCards = exports.getRemainingCards(numbers); // convert numbers into card objects
    let highCardResult = exports.handHighCardValue(remainingCards, {number: 1, condition: false});
    let result = 0x800000 + quadResult + highCardResult; // combine results into final hexidecimal
    return result;
}

/**
 * Check if the supplied cards have a full house
 * @param {String[]} cards Array of cards
 * @param {Object[]} setup Array of setup values
 */
exports.handFullHouseValue = function(cards, setup){
    // first find a three of a kind
    let threeOfAKindValueResult = exports.handThreeOfAKindValue(cards, {number:0});
    if(threeOfAKindValueResult === -1) {
        return -1;
    }
    let tripletResult = threeOfAKindValueResult.tripletResult;
    let remainingCards = threeOfAKindValueResult.remainingCards; // we will use remaining cards to find a pair
    let singlePairResult = exports.handSinglePairValue(remainingCards, {number:0});
    if(singlePairResult === -1) {
        return -1;
    }
    let exponent = 2; // triplet result needs to be shifted by 2
    let result = 0x700000 + tripletResult * exports.integerPow(16, exponent) + singlePairResult; // combine results into hexidecimal format
    return result;
}

/**
 * Check if the supplied cards have a flush
 * @param {String[]} cards Array of cards
 * @param {Object[]} setup Array of setup values
 */
exports.handFlushValue = function(cards, setup){
    // we sort the cards by suit
    let suits = [];
    suits.push([]); suits.push([]); suits.push([]); suits.push([]);
    for(let i = 0; i < cards.length; i++){
        let number = cards[i].number;
        if(number === PokerUtils.GetAceLowValue()){
            number = PokerUtils.GetAceHighValue();
        }
        suits[Card.getSuitNumber(cards[i].suit) - 1].push(number);
    }
    let result = 0x600000;
    let neededHandSize = PokerUtils.GetNeededHandSize();
    for(let i = 0; i < PokerUtils.GetNumberOfSuits(); i++) {
        if(suits[i].length >= neededHandSize) { // found a flush
            suits[i].sort(function(a, b){return a - b});
            if(setup.condition) { // return the cards, else go further and result calculated result
                return suits[i];
            }
            for(let k = 0; k < neededHandSize; k++) {
                result += suits[i][(suits[i].length - 1) - k] * exports.integerPow(16, 4-k);
            }
            return result;
        }
    }
    return -1;
}

/**
 * Check if the supplied cards have a straight
 * @param {String[]} cards Array of cards
 * @param {Object[]} setup Array of setup values
 */
exports.handStraightValue = function(cards, setup) {
    // we are trying to find the largest sequence of cards and if 5+ then its a straight
    // first let the ace assume the value of 14 and then include a special condition to check for ace as 1 as well
    let result = -1;
    let numbers = exports.getTheNumbersArrayA14(cards);
    numbers.sort(function(a, b){return a - b});
    numbers = exports.removeDuplicates(numbers);
    // we start from the end and work our way down and include a special case for the ace also equal to 1
    let count = 1; // we will always have a straight of at least 1

    let neededHandSize = PokerUtils.GetNeededHandSize();
    let aceStraightMark = PokerUtils.GetAceStraightMark();

    for(let i = numbers.length - 1; i >= aceStraightMark; i--) {
        // then we go further down, checking each card until either a straight or break is found
        for(let j = i - 1; j >= 0; j--) {
            if(numbers[j] === numbers[i] - count) { // check if sequence still holds
                count++;
                if(count === neededHandSize){
                    result = 0x000000;
                    // we have a straight
                    if(setup.condition){ // we send back a straight status, or another function called this function and will set their own status
                        result = 0x500000;
                    }
                    for(let k = 0; k < neededHandSize; k++){
                        result += numbers[i-k] * exports.integerPow(16, 4-k); // add the straight value in hexidecimal
                    }
                    return result;
                } else if(count === aceStraightMark && numbers[i] === PokerUtils.GetSpecialCaseTopCardValue() && numbers[numbers.length - 1] === PokerUtils.GetAceHighValue()) {
                    // we have count of four going 2,3,4,5 and an ace, its a straight
                    result = 0x000001; // automatically add the value of 1 to the hexidecimal
                    if(setup.condition) {
                        result = 0x500001;
                    }
                    for(let k = 0; k < aceStraightMark; k++) {
                        result += numbers[i-k] * exports.integerPow(16, 4-k);
                    }
                    return result;
                }
            } else {
                // the run ended, set i to position j
                count = 1;
                i = j;
            }
        }
    }
    return result;
}

/**
 * Check if the supplied cards have a three of a kind
 * @param {String[]} cards Array of cards
 * @param {Object[]} setup Array of setup values
 */
exports.handThreeOfAKindValue = function(cards, setup) {
    let numbers = exports.getTheNumbersArrayA14(cards); // get the numbers
    numbers.sort(function(a, b){return a - b}); // sort the numbers
    let twoToAceCount = exports.getTwoToAceCount(numbers); // sort numbers into groups
    let cardNumber = exports.findHighestGroup(twoToAceCount, 3); // find the highest group
    if(cardNumber === -1) {
        return -1;
    }
    let tripletResult = 0;
    let triplet = 3;
    for(let k = triplet-1; k >= 0; k--) {
        tripletResult += cardNumber * exports.integerPow(16, setup.number + k); // add the hexidecimal value
    }
    exports.removeSomeMatchingKeys(numbers, cardNumber, triplet);
    let remainingCards = exports.getRemainingCards(numbers);
    
    if(setup.number === 0) { // another function called this and only wants the cards
        return {tripletResult: tripletResult, remainingCards: remainingCards};
    }
    // if we made it to this point then send back the full "3 of a kind" status
    let highCardsResult = exports.handHighCardValue(remainingCards, {number: setup.number, condition: false});
    if(highCardsResult === -1) {
        return -1; // error
    }
    let result = 0x400000 + tripletResult + highCardsResult;
    return result;
}

/**
 * Check if the supplied cards have two pairs
 * @param {String[]} cards Array of cards
 * @param {Object[]} setup Array of setup values
 */
exports.handTwoPairValue = function(cards, setup) {
    let numbers = exports.getTheNumbersArrayA14(cards); // get the numbers
    numbers.sort(function(a, b){return a - b}); // sort the numbers
    let twoToAceCount = exports.getTwoToAceCount(numbers); // sort the numbers into groups
    let cardNumber = exports.findHighestGroup(twoToAceCount, 2); // find first pair
    if(cardNumber === -1) {
        return -1;
    }
    let pair = 2;
    let firstPairResult = cardNumber * exports.integerPow(16, setup.number + pair + 1) + cardNumber * exports.integerPow(16, setup.number + pair);
    exports.removeSomeMatchingKeys(numbers, cardNumber, pair);
    let remainingCards = exports.getRemainingCards(numbers);
    let secondPairResult = exports.handSinglePairValue(remainingCards, setup); // find second pair of remaining cards
    if(secondPairResult === -1) {
        return -1;
    }
    let result = 0x300000 + firstPairResult + (secondPairResult - 0x200000); // remove the single pair status
    return result;
}

/**
 * Check if the supplied cards have a pair
 * @param {String[]} cards Array of cards
 * @param {Object[]} setup Array of setup values
 */
exports.handSinglePairValue = function(cards, setup) { // find the highest pair
    let numbers = exports.getTheNumbersArrayA14(cards);
    let pair = 2;
    numbers.sort(function(a, b){return a - b}); // now the array is sort low to high
    let twoToAceCount = exports.getTwoToAceCount(numbers);
    let cardNumber = exports.findHighestGroup(twoToAceCount, pair);
    if(cardNumber === -1) {
        return -1;
    }
    let pairResult = cardNumber * exports.integerPow(16, setup.number + 1) + cardNumber * exports.integerPow(16, setup.number);
    if(setup.number === 0) {
        return pairResult;
    }
    exports.removeSomeMatchingKeys(numbers, cardNumber, pair);
    let remainingCards = exports.getRemainingCards(numbers);
    let highCardResult = exports.handHighCardValue(remainingCards, {number: setup.number, condition: false}); // if full house is calling this then highCardSendBack = 0, and 0 is returned
    let result = 0x200000 + pairResult + highCardResult;
    return result;
}

/**
 * Check if the supplied cards have a high card
 * @param {String[]} cards Array of cards
 * @param {Object[]} setup Array of setup values
 */
exports.handHighCardValue = function(cards, setup) { // find the highcards
    if(setup.number > cards.length) {
        return -1; // error
    }
    let numbers = new Array(cards.length);
    for(let i = 0; i < numbers.length; i++) {
        numbers[i] = cards[i].number;
        if(numbers[i] === PokerUtils.GetAceLowValue()) {
            numbers[i] = PokerUtils.GetAceHighValue();
        }
    }
    numbers.sort(function(a, b){return a - b});
    let result = 0x0;
    if(setup.condition) {
    result += 0x100000;
    }
    for (let i = 0; i < setup.number; i++) {
        result += numbers[(numbers.length - 1) - i] * exports.integerPow(16, (setup.number - 1) - i);
    }
    return result;
}

/**
 * Performs some power mathematics
 */
exports.integerPow = function(base, exponent) {
    let result = base;
    for(let i = 1; i < exponent; i++){
        result = result * base;
    }
    if(exponent === 0){
        return 1;
    }
    else{
        return result;
    }
}

/**
 * Removes all matching keys from an array
 */
exports.removeAllMatchingKeys = function(array, key) { // remove all elements from array that match the key
    let newArray = array.filter(function(x){
        return x !== key;
    });
    return newArray;
}

/**
 * Removes a specified number of matching keys from an array
 */
exports.removeSomeMatchingKeys = function(array, key, count) { // remove a number of matching keys based on the count
    for(var i = array.length - 1; i >= 0; i--) {
        if(array[i] === key) {
            array.splice(i, 1);
            count--;
        }
        if(count <= 0){
            i = -1;
        }
    }
}

/**
 * Removes all duplicates
 */
exports.removeDuplicates = function(numbers) {
    let uniqueArray = [];
    for(let i = 0; i < numbers.length; i++) {
        if(uniqueArray.indexOf(numbers[i]) === -1) {
            uniqueArray.push(numbers[i]);
        }
    }
    return uniqueArray;
}

/**
 * Gets an array of numbers based on ace equal to 14
 */
exports.getTheNumbersArrayA14 = function(cards) {
    let numbers = new Array(cards.length);
    for(let i = 0; i < numbers.length; i++) {
        numbers[i] = cards[i].number;
        if(numbers[i] === PokerUtils.GetAceLowValue()) {
            numbers[i] = PokerUtils.GetAceHighValue();
        }
    }
    return numbers;
}

/**
 * Gets an array of numbers
 */
exports.getTheNumbersArray = function(cards) {
    let numbers = new Array(cards.length);
    for(let i = 0; i < numbers.length; i++) {
        numbers[i] = cards[i].number;
    }
    return numbers;
}

/**
 * Gets count of two to ace
 */
exports.getTwoToAceCount = function(numbers) {
    let offset = 2; // 2's get put into slot 0 so an offset of 2 is needed
    let twoToAceCount = new Array(13).fill(0);
    for(let i = 0; i < numbers.length; i++) {
        twoToAceCount[numbers[i] - offset]++;
    }
    return twoToAceCount;
}

/**
 * Finds the highest group
 */
exports.findHighestGroup = function(twoToAceCount, count) {
    let cardNumber = -1;
    let offset = 2; // 2's get put into slot 0 so an offset of 2 is needed
    for(let i = twoToAceCount.length - 1; i >= 0; i--) {
        if(twoToAceCount[i] >= count){
            cardNumber = i + offset;
            i = 0;
        }
    }
    return cardNumber;
}

/**
 * Gets the remaining cards
 */
exports.getRemainingCards = function(numbers) {
    let remainingCards = new Array(numbers.length);
    for(let i = 0; i < remainingCards.length; i++) {
        remainingCards[i] = new Card(numbers[i], 'S');
    }
    return remainingCards;
}
