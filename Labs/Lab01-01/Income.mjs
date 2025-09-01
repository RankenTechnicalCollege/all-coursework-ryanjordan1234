// income.mjs
import readline from "readline";

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to prompt and parse positive number
function promptNumber(promptText, cb) {
  rl.question(promptText, (input) => {
    const num = parseFloat(input);
    if (isNaN(num) || num <= 0) {
      console.log("❌ Error: Please enter a number greater than 0.");
      promptNumber(promptText, cb);
    } else cb(num);
  });
}

// Tax bracket definitions
const brackets = {
  single: [
    { rate: 0.10, cap: 11925 },
    { rate: 0.12, cap: 48475 },
    { rate: 0.22, cap: 103350 },
    { rate: 0.24, cap: 197300 },
    { rate: 0.32, cap: 250525 },
    { rate: 0.35, cap: 626350 },
    { rate: 0.37, cap: Infinity }
  ],
  married: [
    { rate: 0.10, cap: 23850 },
    { rate: 0.12, cap: 96950 },
    { rate: 0.22, cap: 206700 },
    { rate: 0.24, cap: 394600 },
    { rate: 0.32, cap: 501050 },
    { rate: 0.35, cap: 751600 },
    { rate: 0.37, cap: Infinity }
  ]
};

// Tax calculation
function computeTax(status, income) {
  const b = brackets[status];
  let remaining = income;
  let previousCap = 0;
  let tax = 0;

  for (const bracket of b) {
    const taxable = Math.min(remaining, bracket.cap - previousCap);
    if (taxable <= 0) break;
    tax += taxable * bracket.rate;
    remaining -= taxable;
    previousCap = bracket.cap;
    if (remaining <= 0) break;
  }

  return tax;
}

// Main flow
function main() {
  console.log("🏷 Income Tax Calculator (2025)");
  console.log("Filing Status:\n1. Single\n2. Married filing jointly");

  rl.question("Choose 1 or 2: ", (choice) => {
    let status;
    if (choice === "1") status = "single";
    else if (choice === "2") status = "married";
    else {
      console.log("❌ Error: Please enter 1 or 2.");
      rl.close();
      return;
    }

    promptNumber("Enter your Taxable Income for 2025: $", (income) => {
      const taxOwed = computeTax(status, income);
      console.log(`\n💰 Estimated tax owed: $${Math.ceil(taxOwed)}`);
      rl.close();
    });
  });
}

main();
