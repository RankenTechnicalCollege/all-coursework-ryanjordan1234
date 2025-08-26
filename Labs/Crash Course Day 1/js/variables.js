const PI = 3.14; // constant variable that has scope within this file aka global scope

document.getElementById("btnSucker").addEventListener("click", function () {

    //numeber variable
    //Boolean variable
    //string variable
    //null variable
    // get user input
    let userInput = document.getElementById("txtUserInput").value;

    if(userInput.trim() === "") {
        userInput = "No input provided";
    }
    else if (!isNaN(Number(userInput))) {
        userInput = Number(userInput); // convert to number if it's numeric
    }
    else if (userInput.toLowerCase() === "true") {
        userInput = true; // convert to boolean true
    }
    else if (userInput.toLowerCase() === "false") {
        userInput = false; // convert to boolean false
    }
  
    // output the value and the type
    document.getElementById("output").innerText = `You entered: ${userInput}
  Data type: ${typeof userInput}`;
  });
  