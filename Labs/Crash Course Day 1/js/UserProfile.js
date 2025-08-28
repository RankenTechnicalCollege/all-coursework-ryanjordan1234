// Define the user profile object
const userProfile = {
    name: "Jane Doe",
    email: "jane.doe@example.com",
    isOnline: false
};

// Function to display profile info
function displayProfile() {
    const profileDiv = document.getElementById("profile");
    profileDiv.innerHTML = `
        <p><strong>Name:</strong> ${userProfile.name}</p>
        <p><strong>Email:</strong> ${userProfile.email}</p>
        <p><strong>Online:</strong> ${userProfile.isOnline ? "Yes" : "No"}</p>
    `;
}

// Run display when page loads
window.addEventListener("DOMContentLoaded", displayProfile);

// Handle email update
document.getElementById("updateBtn").addEventListener("click", () => {
    const newEmail = document.getElementById("emailInput").value;
    if (newEmail) {
        userProfile.email = newEmail; // update object
        displayProfile(); // refresh display
        document.getElementById("emailInput").value = ""; // clear input
    } else {
        alert("Please enter a valid email.");
    }
});
