// multiplication.mjs
import readline from "readline";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask the user for table size
rl.question("Enter table size (1-12): ", (answer) => {
  const size = parseInt(answer, 10);

  // Validate input
  if (isNaN(size) || size < 1 || size > 12) {
    console.log("❌ Please enter a valid number between 1 and 12.");
    rl.close();
    return;
  }

  // Determine max number for padding (largest value in table)
  const maxNumber = size * size;
  const colWidth = maxNumber.toFixed(0).length + 2; // +2 for spacing

  // Print header row
  let header = "".padStart(colWidth); // Empty corner cell
  for (let i = 1; i <= size; i++) {
    header += i.toFixed(0).padStart(colWidth);
  }
  console.log(header);

  // Print table rows
  for (let row = 1; row <= size; row++) {
    let line = row.toFixed(0).padStart(colWidth); // Row header
    for (let col = 1; col <= size; col++) {
      line += (row * col).toFixed(0).padStart(colWidth);
    }
    console.log(line);
  }

  rl.close();
});
