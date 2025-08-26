const btn = document.getElementById("btnCheck");
const output = document.getElementById("output");
const userInput = document.getElementById("txtUserInput");

btn.addEventListener("click", function() {
    let input = userInput.value.trim();
    let converted;

    // Convert input to proper type
    if (input === "") {
        converted = "";
    } else if (!isNaN(Number(input))) {
        converted = Number(input);
    } else if (input.toLowerCase() === "true") {
        converted = true;
    } else if (input.toLowerCase() === "false") {
        converted = false;
    } else {
        converted = input; // keep as string
    }

    // Check truthy/falsy
    if (converted) {
        output.innerText = `Your input (${converted}) is Truthy! Its JavaScript Data Type is ${typeof converted}.`;
    } else {
        output.innerText = `Your input (${converted}) is Falsy! Its JavaScript Data Type is ${typeof converted}.`;
    }
});
