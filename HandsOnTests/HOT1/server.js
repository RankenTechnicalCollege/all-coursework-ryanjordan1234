const express = require('express');
const debug = require('debug')('awd1111-exam-1');
require('dotenv').config();

const app = express();
const PORT = 5010;

// Middleware to parse JSON bodies
app.use(express.json());

// POST /api/mpg/calc
app.post('/api/mpg/calc', (req, res) => {
  const { milesDriven, gallonsUsed } = req.body;
  
  // Parse and validate input
  const miles = parseFloat(milesDriven);
  const gallons = parseFloat(gallonsUsed);
  
  if (isNaN(miles) || miles <= 0) {
    return res.status(400).json({ error: 'Miles driven must be a valid number greater than 0' });
  }
  
  if (isNaN(gallons) || gallons <= 0) {
    return res.status(400).json({ error: 'Gallons used must be a valid number greater than 0' });
  }
  
  // Calculate MPG
  const mpg = miles / gallons;
  const mpgFormatted = mpg.toFixed(2);
  
  debug(`Calculated MPG: ${mpgFormatted}`);
  
  res.json({ mpg: mpgFormatted });
});

// POST /api/temperature/convert
app.post('/api/temperature/convert', (req, res) => {
  const { mode, temp } = req.body;
  
  // Validate mode
  if (mode !== 'FtoC' && mode !== 'CtoF') {
    return res.status(400).json({ error: 'Mode must be either "FtoC" or "CtoF"' });
  }
  
  // Parse and validate temperature
  const temperature = parseFloat(temp);
  
  if (isNaN(temperature) || temperature <= 0) {
    return res.status(400).json({ error: 'Temperature must be a valid number greater than 0' });
  }
  
  // Convert temperature
  let convertedTemp;
  if (mode === 'FtoC') {
    convertedTemp = (temperature - 32) * (5/9);
  } else {
    convertedTemp = (temperature * (9/5)) + 32;
  }
  
  const convertedTempFormatted = convertedTemp.toFixed(2);
  
  debug(`Converted temperature: ${convertedTempFormatted}`);
  
  res.json({ convertedTemperature: convertedTempFormatted });
});

// POST /api/income-tax/calc
app.post('/api/income-tax/calc', (req, res) => {
  const { mode, income } = req.body;
  
  // Validate mode
  if (mode !== 'Single' && mode !== 'Married') {
    return res.status(400).json({ error: 'Mode must be either "Single" or "Married"' });
  }
  
  // Parse and validate income
  const incomeAmount = parseFloat(income);
  
  if (isNaN(incomeAmount) || incomeAmount <= 0) {
    return res.status(400).json({ error: 'Income must be a valid number greater than 0' });
  }
  
  // Calculate income tax based on 2024 tax brackets (from NerdWallet)
  let tax = 0;
  
  if (mode === 'Single') {
    if (incomeAmount > 609350) {
      tax += (incomeAmount - 609350) * 0.37;
      tax += (609350 - 243725) * 0.35;
      tax += (243725 - 191950) * 0.32;
      tax += (191950 - 100525) * 0.24;
      tax += (100525 - 47150) * 0.22;
      tax += (47150 - 11600) * 0.12;
      tax += 11600 * 0.10;
    } else if (incomeAmount > 243725) {
      tax += (incomeAmount - 243725) * 0.35;
      tax += (243725 - 191950) * 0.32;
      tax += (191950 - 100525) * 0.24;
      tax += (100525 - 47150) * 0.22;
      tax += (47150 - 11600) * 0.12;
      tax += 11600 * 0.10;
    } else if (incomeAmount > 191950) {
      tax += (incomeAmount - 191950) * 0.32;
      tax += (191950 - 100525) * 0.24;
      tax += (100525 - 47150) * 0.22;
      tax += (47150 - 11600) * 0.12;
      tax += 11600 * 0.10;
    } else if (incomeAmount > 100525) {
      tax += (incomeAmount - 100525) * 0.24;
      tax += (100525 - 47150) * 0.22;
      tax += (47150 - 11600) * 0.12;
      tax += 11600 * 0.10;
    } else if (incomeAmount > 47150) {
      tax += (incomeAmount - 47150) * 0.22;
      tax += (47150 - 11600) * 0.12;
      tax += 11600 * 0.10;
    } else if (incomeAmount > 11600) {
      tax += (incomeAmount - 11600) * 0.12;
      tax += 11600 * 0.10;
    } else {
      tax = incomeAmount * 0.10;
    }
  } else { // Married
    if (incomeAmount > 731200) {
      tax += (incomeAmount - 731200) * 0.37;
      tax += (731200 - 487450) * 0.35;
      tax += (487450 - 383900) * 0.32;
      tax += (383900 - 201050) * 0.24;
      tax += (201050 - 94300) * 0.22;
      tax += (94300 - 23200) * 0.12;
      tax += 23200 * 0.10;
    } else if (incomeAmount > 487450) {
      tax += (incomeAmount - 487450) * 0.35;
      tax += (487450 - 383900) * 0.32;
      tax += (383900 - 201050) * 0.24;
      tax += (201050 - 94300) * 0.22;
      tax += (94300 - 23200) * 0.12;
      tax += 23200 * 0.10;
    } else if (incomeAmount > 383900) {
      tax += (incomeAmount - 383900) * 0.32;
      tax += (383900 - 201050) * 0.24;
      tax += (201050 - 94300) * 0.22;
      tax += (94300 - 23200) * 0.12;
      tax += 23200 * 0.10;
    } else if (incomeAmount > 201050) {
      tax += (incomeAmount - 201050) * 0.24;
      tax += (201050 - 94300) * 0.22;
      tax += (94300 - 23200) * 0.12;
      tax += 23200 * 0.10;
    } else if (incomeAmount > 94300) {
      tax += (incomeAmount - 94300) * 0.22;
      tax += (94300 - 23200) * 0.12;
      tax += 23200 * 0.10;
    } else if (incomeAmount > 23200) {
      tax += (incomeAmount - 23200) * 0.12;
      tax += 23200 * 0.10;
    } else {
      tax = incomeAmount * 0.10;
    }
  }
  
  const taxRounded = Math.ceil(tax);
  
  debug(`Calculated income tax: ${taxRounded}`);
  
  res.json({ incomeTax: taxRounded });
});

// POST /api/interest/calc
app.post('/api/interest/calc', (req, res) => {
  const { principal, interestRate, years } = req.body;
  
  // Parse and validate inputs
  const principalAmount = parseFloat(principal);
  const rate = parseFloat(interestRate);
  const yearsAmount = parseFloat(years);
  
  if (isNaN(principalAmount) || principalAmount <= 0) {
    return res.status(400).json({ error: 'Principal must be a valid number greater than 0' });
  }
  
  if (isNaN(rate) || rate <= 0 || rate > 100) {
    return res.status(400).json({ error: 'Interest rate must be a valid number between 0 and 100' });
  }
  
  if (isNaN(yearsAmount) || yearsAmount <= 0 || yearsAmount > 50) {
    return res.status(400).json({ error: 'Years must be a valid number between 0 and 50' });
  }
  
  // Calculate final amount using compound interest formula
  const finalAmount = principalAmount * ((1 + rate / 100 / 12) ** (yearsAmount * 12));
  const finalAmountFormatted = finalAmount.toFixed(2);
  
  debug(`Calculated final amount: ${finalAmountFormatted}`);
  
  res.json({ finalAmount: finalAmountFormatted });
});

// Start server
app.listen(PORT, () => {
  debug(`Server running on port ${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
});