function handleClick() {
    console.log("Button clicked!");
    document.getElementById("helloWorld").innerText = "Hello, World!";
}

document.getElementById("btnSucker").onclick = () => {
    document.getElementById("output").innerText = "You clicked the Wrong button!";
};