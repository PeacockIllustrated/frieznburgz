// --- staff-training/register-profile.js (Updated with Gatekeeper) ---

import { db, auth } from './firebase-config.js';
// We need the locations array to populate the dropdown.
import { locations } from '../config.js'; 

document.addEventListener('DOMContentLoaded', () => {

    // --- NEW: Gatekeeper Logic ---
    // Get gatekeeper password from environment variable, fallback for backwards compatibility
    const GATEKEEPER_PASSWORD = window.env?.VITE_GATEKEEPER_PASSWORD || 
                                import.meta?.env?.VITE_GATEKEEPER_PASSWORD || 
                                "FNBSTAFF!"; // Fallback - should be replaced with env var

    const gatekeeperForm = document.getElementById('gatekeeper-form');
    const registrationFormContainer = document.getElementById('registration-form-container');
    const gatekeeperPasswordInput = document.getElementById('gatekeeper-password');
    const gatekeeperMessage = document.getElementById('gatekeeper-message');

    // This function handles the password verification
    const handleVerification = () => {
        if (gatekeeperPasswordInput.value.trim() === GATEKEEPER_PASSWORD) {
            // On success, hide the gatekeeper and show the registration form
            gatekeeperForm.parentElement.style.display = 'none'; // Hide the entire auth-card
            registrationFormContainer.style.display = 'block';
        } else {
            // On failure, show an error message
            gatekeeperMessage.textContent = 'Incorrect password. Please try again.';
            gatekeeperPasswordInput.value = ''; // Clear the input
            gatekeeperPasswordInput.focus(); // Set focus back to the input
        }
    };

    // Add event listener for the gatekeeper form submission
    gatekeeperForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Stop the form from reloading the page
        handleVerification();
    });
    // --- End of Gatekeeper Logic ---


    // --- Existing Registration Logic (This code only runs after verification) ---
    const profileForm = document.getElementById('profile-form');
    const locationSelect = document.getElementById('location');
    const formMessage = document.getElementById('form-message');
    const submitBtn = document.getElementById('submitProfileBtn');

    // Populate the location dropdown
    if (locations && locationSelect) {
        locationSelect.innerHTML = '<option value="" disabled selected>-- Select your store --</option>';
        locations.forEach(loc => {
            // Don't allow new staff to select "all locations" or other special cases
            if(loc.id !== 'all_locations') { 
                 const option = document.createElement('option');
                 option.value = loc.id;
                 option.textContent = loc.name;
                 locationSelect.appendChild(option);
            }
        });
    }

    // Handle form submission
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
        formMessage.textContent = '';

        // Get all data from the form
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const staffData = {
            name: document.getElementById('fullName').value.trim(),
            email: email,
            phone: document.getElementById('phone').value.trim(),
            locationId: document.getElementById('location').value,
            startDate: document.getElementById('startDate').value.trim(),
            role: "Employee" // Default role for new sign-ups
        };

        if (!staffData.name || !email || !password || !staffData.phone || !staffData.locationId || !staffData.startDate) {
            formMessage.textContent = 'Please fill out all fields, including email and password.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create My Profile';
            return;
        }

        if (password.length < 6) {
            formMessage.textContent = 'Password must be at least 6 characters long.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create My Profile';
            return;
        }

        try {
            // Step 1: Create the user in Firebase Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Step 2: Use the new user's UID to create their documents in Firestore
            const staffDocRef = db.collection('staff').doc(user.uid);
            await staffDocRef.set(staffData);

            const progressDocRef = db.collection('users').doc(user.uid);
            await progressDocRef.set({
                readSections: [],
                quizHistory: []
            });

            formMessage.style.color = 'var(--success-green)';
            formMessage.textContent = 'Profile created! Please log in to continue.';

            // Redirect to the login page after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            console.error("Error creating profile:", error);
            formMessage.style.color = 'var(--red)';
            // Provide a more user-friendly error message
            if (error.code === 'auth/email-already-in-use') {
                formMessage.textContent = 'This email address is already registered. Please log in instead.';
            } else {
                formMessage.textContent = 'Could not create profile. Please check your details and try again.';
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create My Profile';
        }
    });
});
