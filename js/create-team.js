console.log('Create Team JS loaded successfully');

// Global variables for multi-step form
let currentStep = 1;
let teamData = null;
let userData = null;

// Step navigation functions
function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.registration-step').forEach(step => {
        step.style.display = 'none';
    });
    
    // Show the selected step
    const selectedStep = document.getElementById(`step${stepNumber}`);
    if (selectedStep) {
        selectedStep.style.display = 'block';
    }
    
    // Update progress bar
    updateProgressBar(stepNumber);
    
    // Update summary if moving to step 3
    if (stepNumber === 3) {
        updateSummary();
    }
}

function updateProgressBar(activeStep) {
    for (let i = 1; i <= 3; i++) {
        const stepIndicator = document.querySelector(`.step-indicator[data-step="${i}"]`);
        if (stepIndicator) {
            if (i <= activeStep) {
                stepIndicator.classList.add('active');
            } else {
                stepIndicator.classList.remove('active');
            }
        }
    }
}

// Update summary when moving to step 3
function updateSummary() {
    if (teamData && userData) {
        // Team summary
        const teamSummary = document.getElementById('teamSummary');
        if (teamSummary) {
            teamSummary.innerHTML = `
                <p><strong>Team Number:</strong> ${teamData.teamNumber}</p>
                <p><strong>Team Name:</strong> ${teamData.teamName}</p>
                <p><strong>Location:</strong> ${teamData.city}, ${teamData.state}, ${teamData.country}</p>
                <p><strong>Program:</strong> ${teamData.program?.toUpperCase()}</p>
            `;
        }

        // Coach summary
        const coachSummary = document.getElementById('coachSummary');
        if (coachSummary) {
            coachSummary.innerHTML = `
                <p><strong>Name:</strong> ${userData.firstName} ${userData.lastName}</p>
                <p><strong>Email:</strong> ${userData.email}</p>
                <p><strong>Role:</strong> ${userData.role}</p>
            `;
        }

        // Update display team info for success message
        const displayTeamNumber = document.getElementById('displayTeamNumber');
        const displayTeamName = document.getElementById('displayTeamName');
        const displayTeamPassword = document.getElementById('displayTeamPassword');
        if (displayTeamNumber) displayTeamNumber.textContent = teamData.teamNumber;
        if (displayTeamName) displayTeamName.textContent = teamData.teamName;
        if (displayTeamPassword) displayTeamPassword.textContent = teamData.teamPassword;
    }
}

// Step 1: Collect Team Information
function collectTeamInfo() {
    // Collect team information
    const teamNumber = document.getElementById('teamNumber').value;
    const teamName = document.getElementById('teamName').value;
    const city = document.getElementById('city').value;
    const state = document.getElementById('state').value;
    const country = document.getElementById('country').value;
    const program = document.getElementById('program').value;
    const teamPassword = document.getElementById('teamPassword').value;
    const entranceCode = document.getElementById('entranceCode').value;
    
    if (!teamNumber || !teamName || !city || !state || !country || !program || !teamPassword || !entranceCode) {
        showNotification('Please fill in all required fields', 'error', 'Missing Information');
        return;
    }
    
    // Validate entrance code
    if (entranceCode !== 'IPSPILOTQ1') {
        showNotification('Invalid entrance code. Please contact your administrator for the correct code.', 'error', 'Invalid Code');
        return;
    }
    
    // Store team info
    teamData = {
        teamNumber,
        teamName,
        city,
        state,
        country,
        program,
        teamPassword
    };
    
    // Proceed to next step
    showStep(2);
}

// Step 2: Collect Coach Information
function collectCoachInfo() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const role = document.getElementById('role').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!firstName || !lastName || !email || !role || !password || !confirmPassword) {
        showNotification('Please fill in all required fields', 'error', 'Missing Information');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error', 'Password Mismatch');
        return;
    }
    
    // Store user info
    userData = {
        firstName,
        lastName,
        email,
        role,
        password
    };
    
    // Proceed to final step
    showStep(3);
}

// Step 3: Create Team
async function createTeam() {
    if (!teamData || !userData) {
        showNotification('Please complete all previous steps', 'error', 'Incomplete Form');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('createTeamBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Team...';
    submitBtn.disabled = true;
    
    try {
        const db = firebase.firestore();
        console.log('Firestore instance created');
        console.log('Current Firebase Auth state:', firebase.auth().currentUser);
        
        // Check if team number already exists
        console.log('Checking if team number exists:', teamData.teamNumber);
        const existingTeamQuery = await db.collection('teams')
            .where('teamNumber', '==', teamData.teamNumber)
            .get();
        
        console.log('Team query completed, empty:', existingTeamQuery.empty);
        
        if (!existingTeamQuery.empty) {
            throw new Error('A team with this number already exists. Please use a different team number.');
        }
        
        // Create user in Firebase Auth
        console.log('Creating user in Firebase Auth...');
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(
            userData.email, 
            userData.password
        );
        const user = userCredential.user;
        
        console.log('User created in Firebase Auth:', user.uid);
        
        // Sign in the user to ensure they're authenticated
        console.log('Signing in user...');
        await firebase.auth().signInWithEmailAndPassword(userData.email, userData.password);
        
        // Verify user is authenticated
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            throw new Error('User authentication failed after account creation');
        }
        
        console.log('Current authenticated user:', currentUser.uid);
        console.log('User email verified:', currentUser.emailVerified);
        console.log('User token:', await currentUser.getIdToken());
        
        // Test Firestore access first
        console.log('Testing Firestore access...');
        try {
            const testDoc = await db.collection('test').doc('test').get();
            console.log('Firestore read test successful');
        } catch (testError) {
            console.error('Firestore read test failed:', testError);
        }
        
        // Create team in Firestore FIRST
        console.log('Creating team in Firestore...');
        const teamDataToSave = {
            ...teamData,
            coachEmail: userData.email,
            coachFirstName: userData.firstName,
            coachLastName: userData.lastName,
            points: 0, // Points system currently disabled - TBD
            memberCount: 1,
            adminMembers: [user.uid],
            teamPassword: teamData.teamPassword, // Store the team password
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            verificationStatus: 'verified' // Coach is automatically verified
        };
        
        console.log('Team data to save:', teamDataToSave);
        
        const teamRef = await db.collection('teams').add(teamDataToSave);
        
        console.log('Team created in Firestore:', teamRef.id);
        
        // THEN create user profile in Firestore with the team ID
        await db.collection('users').doc(user.uid).set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            teamId: teamRef.id,
            teamNumber: teamData.teamNumber,
            teamName: teamData.teamName,
            program: teamData.program,
            role: userData.role,
            isTeamAdmin: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            verificationStatus: 'verified'
        });
        
        // Finally add user to team members
        await db.collection('team_members').add({
            userId: user.uid,
            teamId: teamRef.id,
            teamNumber: teamData.teamNumber,
            role: userData.role,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isAdmin: true
        });
        
        console.log('Team and coach account created successfully');
        
        // Send verification email to the coach
        await currentUser.sendEmailVerification();
        console.log('Verification email sent to coach');
        
        // Show success message and hide form
        document.getElementById('registrationSuccess').style.display = 'block';
        document.getElementById('registrationForm').style.display = 'none';
        
        // Wait a moment for the success message to show, then redirect
        setTimeout(() => {
            // Redirect to homepage - the user is already signed in
            window.location.href = '../index.html';
        }, 10000); // 10 second delay so coach can read instructions and copy password
        
    } catch (error) {
        console.error('Error creating team:', error);
        showNotification('Team creation failed: ' + error.message, 'error', 'Creation Failed');
    } finally {
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Country-state mapping
const countryStates = {
    'US': [
        { value: 'AL', text: 'Alabama' },
        { value: 'AK', text: 'Alaska' },
        { value: 'AZ', text: 'Arizona' },
        { value: 'AR', text: 'Arkansas' },
        { value: 'CA', text: 'California' },
        { value: 'CO', text: 'Colorado' },
        { value: 'CT', text: 'Connecticut' },
        { value: 'DE', text: 'Delaware' },
        { value: 'FL', text: 'Florida' },
        { value: 'GA', text: 'Georgia' },
        { value: 'HI', text: 'Hawaii' },
        { value: 'ID', text: 'Idaho' },
        { value: 'IL', text: 'Illinois' },
        { value: 'IN', text: 'Indiana' },
        { value: 'IA', text: 'Iowa' },
        { value: 'KS', text: 'Kansas' },
        { value: 'KY', text: 'Kentucky' },
        { value: 'LA', text: 'Louisiana' },
        { value: 'ME', text: 'Maine' },
        { value: 'MD', text: 'Maryland' },
        { value: 'MA', text: 'Massachusetts' },
        { value: 'MI', text: 'Michigan' },
        { value: 'MN', text: 'Minnesota' },
        { value: 'MS', text: 'Mississippi' },
        { value: 'MO', text: 'Missouri' },
        { value: 'MT', text: 'Montana' },
        { value: 'NE', text: 'Nebraska' },
        { value: 'NV', text: 'Nevada' },
        { value: 'NH', text: 'New Hampshire' },
        { value: 'NJ', text: 'New Jersey' },
        { value: 'NM', text: 'New Mexico' },
        { value: 'NY', text: 'New York' },
        { value: 'NC', text: 'North Carolina' },
        { value: 'ND', text: 'North Dakota' },
        { value: 'OH', text: 'Ohio' },
        { value: 'OK', text: 'Oklahoma' },
        { value: 'OR', text: 'Oregon' },
        { value: 'PA', text: 'Pennsylvania' },
        { value: 'RI', text: 'Rhode Island' },
        { value: 'SC', text: 'South Carolina' },
        { value: 'SD', text: 'South Dakota' },
        { value: 'TN', text: 'Tennessee' },
        { value: 'TX', text: 'Texas' },
        { value: 'UT', text: 'Utah' },
        { value: 'VT', text: 'Vermont' },
        { value: 'VA', text: 'Virginia' },
        { value: 'WA', text: 'Washington' },
        { value: 'WV', text: 'West Virginia' },
        { value: 'WI', text: 'Wisconsin' },
        { value: 'WY', text: 'Wyoming' }
    ],
    'CA': [
        { value: 'AB', text: 'Alberta' },
        { value: 'BC', text: 'British Columbia' },
        { value: 'MB', text: 'Manitoba' },
        { value: 'NB', text: 'New Brunswick' },
        { value: 'NL', text: 'Newfoundland and Labrador' },
        { value: 'NS', text: 'Nova Scotia' },
        { value: 'NT', text: 'Northwest Territories' },
        { value: 'NU', text: 'Nunavut' },
        { value: 'ON', text: 'Ontario' },
        { value: 'PE', text: 'Prince Edward Island' },
        { value: 'QC', text: 'Quebec' },
        { value: 'SK', text: 'Saskatchewan' },
        { value: 'YT', text: 'Yukon' }
    ]
};

function updateStateOptions() {
    const countrySelect = document.getElementById('country');
    const stateSelect = document.getElementById('state');
    
    if (!countrySelect || !stateSelect) return;
    
    const selectedCountry = countrySelect.value;
    
    // Clear existing options except the first one
    stateSelect.innerHTML = '<option value="">Select state/province</option>';
    
    if (selectedCountry && countryStates[selectedCountry]) {
        // Add states for the selected country
        countryStates[selectedCountry].forEach(state => {
            const option = document.createElement('option');
            option.value = state.value;
            option.textContent = state.text;
            stateSelect.appendChild(option);
        });
    } else if (selectedCountry) {
        // For other countries, add a generic option
        const option = document.createElement('option');
        option.value = 'OTHER';
        option.textContent = 'Other/Not Listed';
        stateSelect.appendChild(option);
    }
}

// Initialize the create team form
document.addEventListener('DOMContentLoaded', () => {
    console.log('Create team form initialized');
    
    // Show first step by default
    showStep(1);
    
    // Add country change listener
    const countrySelect = document.getElementById('country');
    if (countrySelect) {
        countrySelect.addEventListener('change', updateStateOptions);
    }
    
    // Add event listeners
    const nextToStep2Btn = document.getElementById('nextToStep2');
    if (nextToStep2Btn) {
        console.log('Found nextToStep2 button, adding event listener');
        nextToStep2Btn.addEventListener('click', collectTeamInfo);
    } else {
        console.error('nextToStep2 button not found');
    }
    
    const nextToStep3Btn = document.getElementById('nextToStep3');
    if (nextToStep3Btn) {
        console.log('Found nextToStep3 button, adding event listener');
        nextToStep3Btn.addEventListener('click', collectCoachInfo);
    } else {
        console.error('nextToStep3 button not found');
    }
    
    const submitRegistrationBtn = document.getElementById('createTeamBtn');
    if (submitRegistrationBtn) {
        console.log('Found createTeamBtn button, adding event listener');
        submitRegistrationBtn.addEventListener('click', createTeam);
    } else {
        console.error('createTeamBtn button not found');
    }

        // Add resend verification function to global scope
        window.resendVerification = async () => {
            try {
                const user = firebase.auth().currentUser;
                if (user) {
                    await user.sendEmailVerification();
                    alert('Verification email sent! Please check your inbox.');
                }
            } catch (error) {
                console.error('Error sending verification email:', error);
                alert('Error sending verification email: ' + error.message);
            }
        };
        
        // Add copy team info function to global scope
        window.copyTeamInfo = () => {
            const teamInfo = `Team Number: ${teamData.teamNumber}\nTeam Name: ${teamData.teamName}\nTeam Password: ${teamData.teamPassword}\n\nInstructions:\n1. Go to "Join Team" on the homepage\n2. Enter the team information above\n3. Fill out personal information\n4. Submit to join immediately`;
            
            navigator.clipboard.writeText(teamInfo).then(() => {
                alert('Team information copied to clipboard! You can now paste this into a message to share with your team members.');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = teamInfo;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Team information copied to clipboard! You can now paste this into a message to share with your team members.');
            });
        };
}); 