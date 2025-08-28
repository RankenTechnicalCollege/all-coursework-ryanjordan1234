function add(a,b){
    return a + b;
}

//function expression
const addExpression = function add3(a,b,c){
    return a + b + c;
}

//arrow function
const greet = () => 'Hello World!';

//1 parameter no parentheses needed
const add100 = a => a + 100;

//Multiple Parameters
const multiply3 = (a,b,c) => a * b * c;

const greet2 = (name = "Guest") => {
    const greeting = `Hello ${name}`;
    return greeting;
}

document.getElementById('btnSucker').addEventListener("click", function(){
    document.getElementById('output').innerText = `Call greet2 ${greet2()}`;
}); 