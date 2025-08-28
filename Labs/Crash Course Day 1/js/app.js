// ✅ Import the functions from utils.js
import { getNumber, getColor } from './utils.js';

// Call the imported functions and get the results
const randomNumber = getNumber();
const randomColor = getColor();

// Get the HTML elements to display the results
const numberElement = document.getElementById('random-number');
const colorElement = document.getElementById('color-name');

// Set the text content of the elements
numberElement.textContent = `Random Number: ${randomNumber}`;
colorElement.textContent = `Random Color: ${randomColor}`;
