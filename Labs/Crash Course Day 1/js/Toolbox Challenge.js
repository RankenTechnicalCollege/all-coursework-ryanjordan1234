// Vowel Count
function VowelCount(str) {
    const vowels = 'aeiouAEIOU';
    let count = 0;
    for (let char of str) {
        if (vowels.includes(char)) count++;
    }
    return count.toString();
}

// Reverse String
function ReverseString(str) {
    return str.split('').reverse().join('');
}

// Capitalize Words
const CapitalizeWords = function(str) {
    return str.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
};

// Word Count
const WordCount = (str) => {
    return str.trim().split(/\s+/).filter(word => word.length > 0).length.toString();
};

// Concatenate Strings
const ConcatenateStrings = (str1, str2) => str1 + str2;

// Display helper
function displayOutput(result) {
    document.getElementById('output').textContent = result;
}

// Event Listeners
window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('txtUserInput');

    document.getElementById('vowelBtn').addEventListener('click', () => {
        displayOutput("Vowels: " + VowelCount(input.value));
    });

    document.getElementById('reverseBtn').addEventListener('click', () => {
        displayOutput("Reversed: " + ReverseString(input.value));
    });

    document.getElementById('capitalizeBtn').addEventListener('click', () => {
        displayOutput("Capitalized: " + CapitalizeWords(input.value));
    });

    document.getElementById('wordCountBtn').addEventListener('click', () => {
        displayOutput("Words: " + WordCount(input.value));
    });

    document.getElementById('concatBtn').addEventListener('click', () => {
        const extra = prompt("Enter another string to concatenate:");
        displayOutput("Concatenated:"  + ConcatenateStrings(input.value, extra));
    });
});
