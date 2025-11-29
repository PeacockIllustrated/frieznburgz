// public/employee-flow.js

document.addEventListener('DOMContentLoaded', () => {
    const CORRECT_PASSWORD = "FNB-STAFF!";

    const passwordContainer = document.getElementById('password-container');
    const infoContainer = document.getElementById('info-container');
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('gatekeeper-password');
    const messageElement = document.getElementById('gatekeeper-message');

    passwordForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the form from reloading the page

        const enteredPassword = passwordInput.value.trim();

        if (enteredPassword === CORRECT_PASSWORD) {
            // Hide the password form and show the info container
            passwordContainer.style.display = 'none';
            infoContainer.style.display = 'block';
        } else {
            // Show an error message
            messageElement.textContent = 'Incorrect password. Please try again.';
            passwordInput.value = ''; // Clear the input field
            passwordInput.focus(); // Set focus back to the input for convenience
        }
    });
});
