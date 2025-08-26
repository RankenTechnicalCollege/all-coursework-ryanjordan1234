const secret = true; 
document.getElementById("btnSucker").addEventListener("click", function() {
    let userInput;
     userInput = document.getElementById("txtUserInput").value;

    if(userInput.trim() === "") {
        userInput = "No input provided";
    }
    else if(!isNaN(Number(userInput))) {
        userInput = Number(userInput); // convert to number if it's numeric
    }
    else if(userInput.toLowerCase() === "true") {
        userInput = true; // convert to boolean true
    }
    else if(userInput.toLowerCase() === "false") {
        userInput = false; // convert to boolean false
    }
    
    let outputString;
    if (userInput != secret) {
        outputString = " You did not guess the secret word ";
    }
    else if (userInput == secret) {
        outputString = " You guessed the secret word! ";
    }
    

    document.getElementById("output").innerText = `${outputString} \n Data type: ${typeof userInput}`;
});
