// Utility function for handling tasks
function runTask(buttonId, statusId, taskName, delay) {
    const statusEl = document.getElementById(statusId);
    
    // Show loading message
    statusEl.textContent = `${taskName}... Loading ⏳`;

    // Simulate async delay
    setTimeout(() => {
        statusEl.textContent = `${taskName} ✅ Done!`;
    }, delay);
}

// Attach event listeners
document.getElementById("brewButton").addEventListener("click", () => {
    runTask("brewButton", "brewStatus", "Brewing Coffee ☕", 3000);
});

document.getElementById("toastButton").addEventListener("click", () => {
    runTask("toastButton", "toastStatus", "Making Toast 🍞", 2000);
});

document.getElementById("juiceButton").addEventListener("click", () => {
    runTask("juiceButton", "juiceStatus", "Pouring Juice 🧃", 1000);
});
