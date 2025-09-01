// temperature.mjs
import readline from "readline";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to validate numeric input
function getValidatedNumber(promptText, callback) {
  rl.question(promptText, (input) => {
    const value = parseFloat(input);

    if (isNaN(value) || value <= 0) {
      console.log("❌ Error: Please enter a valid number greater than 0.");
      getValidatedNumber(promptText, callback); // ask again
    } else {
      callback(value);
    }
  });
}

// Main logic
function main() {
  console.log("🌡️ Temperature Converter");
  console.log("1. Convert Celsius to Fahrenheit");
  console.log("2. Convert Fahrenheit to Celsius");

  rl.question("Choose an option (1 or 2): ", (choice) => {
    if (choice !== "1" && choice !== "2") {
      console.log("❌ Error: Please enter 1 or 2.");
      rl.close();
      return;
    }

    if (choice === "1") {
      getValidatedNumber("Enter temperature in Celsius: ", (celsius) => {
        const fahrenheit = (celsius * 9/5) + 32;
        console.log(`\n✅ ${celsius.toFixed(2)} °C = ${fahrenheit.toFixed(2)} °F`);
        rl.close();
      });
    } else {
      getValidatedNumber("Enter temperature in Fahrenheit: ", (fahrenheit) => {
        const celsius = (fahrenheit - 32) * (5/9);
        console.log(`\n✅ ${fahrenheit.toFixed(2)} °F = ${celsius.toFixed(2)} °C`);
        rl.close();
      });
    }
  });
}

main();
