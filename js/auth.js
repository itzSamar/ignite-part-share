console.log('New Auth.js loaded successfully');

// Global variables for multi-step form
let currentStep = 1;
let teamVerificationData = null;
let teamData = null;
let userData = null;

// Step navigation functions
function showStep(stepNumber) {
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
        const stepElement = document.getElementById(`step${i}`);
        if (stepElement) {
            stepElement.style.display = 'none';
        }
    }
    
    // Show current step
    const currentStepElement = document.getElementById(`step${stepNumber}`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
    }
    
    // Update progress bar
    updateProgressBar(stepNumber);
    
    currentStep = stepNumber;
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

// Step 1: Team Verification
async function verifyTeam() {
    const teamNumber = document.getElementById('teamNumber').value;
    const teamName = document.getElementById('teamName').value;
    const teamPassword = document.getElementById('teamPassword').value; // Added teamPassword
    
    if (!teamNumber || !teamName || !teamPassword) { // Added teamPassword check
        alert('Please fill in all required fields');
        return;
    }
    
    // Show loading state
    const verifyBtn = document.getElementById('verifyTeamBtn');
    const originalText = verifyBtn.textContent;
    verifyBtn.textContent = 'Verifying...';
    verifyBtn.disabled = true;
    
    try {
        // Check if team exists in database and verify password
        const verificationResult = await checkTeamExists(teamNumber, teamName, teamPassword);
        
        if (verificationResult.exists) {
            teamVerificationData = verificationResult;
            
            // Show step 2
            showStep(2);
            
            // Store team data for later use
            teamData = {
                teamId: verificationResult.teamId,
                teamNumber: teamNumber,
                teamName: teamName,
                teamPassword: teamPassword
            };
            
            // Show success message
            document.getElementById('verificationSuccess').style.display = 'block';
            document.getElementById('verificationError').style.display = 'none';
            
            // Team verification successful, ready for step 2
            
        } else {
            // Show error message
            document.getElementById('verificationError').textContent = verificationResult.error;
            document.getElementById('verificationError').style.display = 'block';
            document.getElementById('verificationSuccess').style.display = 'none';
        }
        
    } catch (error) {
        console.error('Verification error:', error);
        document.getElementById('verificationError').textContent = 'Verification failed. Please try again.';
        document.getElementById('verificationError').style.display = 'block';
    } finally {
        // Reset button
        verifyBtn.textContent = originalText;
        verifyBtn.disabled = false;
    }
}

// Check if team exists in database and verify password
async function checkTeamExists(teamNumber, teamName, teamPassword) {
    try {
        const db = firebase.firestore();
        
        // Query teams collection by team number and name
        const teamsQuery = await db.collection('teams')
            .where('teamNumber', '==', teamNumber)
            .where('teamName', '==', teamName)
            .get();
        
        if (teamsQuery.empty) {
            return {
                exists: false,
                error: 'The team does not exist. Please check your team number and name, or ask your coach to create the team first. If you are a coach, you can create a new team.'
            };
        }
        
        const teamDoc = teamsQuery.docs[0];
        const teamData = teamDoc.data();
        
        // Check if the password matches
        if (teamData.teamPassword !== teamPassword) {
            return {
                exists: false,
                error: 'Incorrect team password. Please ask your coach for the correct password.'
            };
        }
        
        return {
            exists: true,
            teamId: teamDoc.id,
            coachEmail: teamData.coachEmail,
            teamData: teamData
        };
        
    } catch (error) {
        console.error('Error checking team:', error);
        throw new Error('Error checking team: ' + error.message);
    }
}

// Step 2: Personal Information
function collectUserInfo() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const role = document.getElementById('role').value;
    const relationship = document.getElementById('relationship').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!firstName || !lastName || !email || !role || !password || !confirmPassword) {
        alert('Please fill in all required fields');
        return false;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return false;
    }
    
    // Store user info
    userData = {
        firstName,
        lastName,
        email,
        phone: phone || null,
        role,
        relationship: relationship || null,
        password
    };
    
    // Return the user data for immediate use
    return userData;
}

// Submit Request to Join Team
async function submitJoinRequest() {
    console.log('submitJoinRequest called');
    
    // First collect user data since we're now in step 2
    const userDataResult = collectUserInfo();
    if (userDataResult === false) {
        return; // Validation failed, collectUserInfo already showed an alert
    }
    
    console.log('teamVerificationData:', teamVerificationData);
    console.log('teamData:', teamData);
    console.log('userData:', userData);
    
    if (!teamVerificationData || !teamData || !userData) {
        console.error('Missing data:', { teamVerificationData, teamData, userData });
        alert('Please complete all previous steps');
        return;
    }
    
    // Check if submit button exists
    const submitBtn = document.getElementById('submitRegistrationBtn');
    if (!submitBtn) {
        console.error('Submit button not found');
        alert('Form error: Submit button not found');
        return;
    }
    
    // Show loading state
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting Request...';
    submitBtn.disabled = true;
    
    try {
        console.log('Creating join request...');
        // Create the join request
        await createJoinRequest();
        
        console.log('Join request created successfully');
        
        // Check if success elements exist
        const successDiv = document.getElementById('registrationSuccess');
        const formDiv = document.getElementById('registrationForm');
        
        if (!successDiv || !formDiv) {
            console.error('Success or form elements not found');
            alert('Form error: Success elements not found');
            return;
        }
        
        // Show success message
        document.getElementById('registrationSuccess').style.display = 'block';
        document.getElementById('registrationForm').style.display = 'none';
        
        // Redirect to login after 3 seconds with better error handling
        console.log('Join request successful, redirecting to login in 3 seconds...');
        setTimeout(() => {
            try {
                console.log('Redirecting to login page...');
                window.location.href = 'login.html';
            } catch (redirectError) {
                console.error('Redirect failed:', redirectError);
                // Fallback: show manual redirect link
                const successDiv = document.getElementById('registrationSuccess');
                if (successDiv) {
                    successDiv.innerHTML += `
                        <div class="mt-3">
                            <p>Redirect failed. <a href="login.html" class="btn btn-primary">Click here to go to login</a></p>
                        </div>
                    `;
                }
            }
        }, 3000);
        
    } catch (error) {
        console.error('Join request error:', error);
        alert('Request failed: ' + error.message);
    } finally {
        // Reset button
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Create join request
async function createJoinRequest() {
    try {
        const db = firebase.firestore();
        
        // Create user in Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(
            userData.email, 
            userData.password
        );
        const user = userCredential.user;
        
        // Create user document in Firestore FIRST
        await db.collection('users').doc(user.uid).set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            relationship: userData.relationship,
            teamId: teamData.teamId,
            teamNumber: teamData.teamNumber,
            teamName: teamData.teamName,
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create approval request
        await db.collection('pending_approvals').add({
            userId: user.uid,
            teamId: teamData.teamId,
            teamNumber: teamData.teamNumber,
            teamName: teamData.teamName,
            userFirstName: userData.firstName,
            userLastName: userData.lastName,
            userEmail: userData.email,
            userRole: userData.role,
            requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'approved' // Auto-approve since password was verified
        });
        
        // Add user to team members immediately
        await db.collection('team_members').add({
            userId: user.uid,
            teamId: teamData.teamId,
            teamNumber: teamData.teamNumber,
            role: userData.role,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isAdmin: false
        });
        
        // Update team member count (no additional points for new members)
        await db.collection('teams').doc(teamData.teamId).update({
            memberCount: firebase.firestore.FieldValue.increment(1)
        });
        
        console.log('Join request created and approved successfully');
        
    } catch (error) {
        console.error('Error creating join request:', error);
        throw error;
    }
}

// Initialize the registration form
document.addEventListener('DOMContentLoaded', () => {
    console.log('Join team form initialized');
    
    // Show first step by default
    showStep(1);
    
    // Add event listeners
    const verifyTeamBtn = document.getElementById('verifyTeamBtn');
    if (verifyTeamBtn) {
        verifyTeamBtn.addEventListener('click', verifyTeam);
    }
    
    const submitRegistrationBtn = document.getElementById('submitRegistrationBtn');
    if (submitRegistrationBtn) {
        submitRegistrationBtn.addEventListener('click', submitJoinRequest);
    }
    
    // Form is ready for use
});

// Handle login form submission (existing functionality)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    console.log('Login form found');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            console.log('Attempting login with email:', email);
            
            // Sign in with Firebase
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log('Login successful for user:', user.uid);

            // Get user data from Firestore
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            console.log('User data from Firestore:', userData);

            if (!userData) {
                throw new Error('User account not found in database. Please contact your coach or administrator.');
            }

            // Get team data
            if (userData && userData.teamId) {
                const teamDoc = await firebase.firestore().collection('teams').doc(userData.teamId).get();
                const teamData = teamDoc.data();
                
                // Store combined data in localStorage
                localStorage.setItem('userData', JSON.stringify({ ...userData, ...teamData }));
            } else {
                localStorage.setItem('userData', JSON.stringify(userData));
            }
            
            // Redirect to home page
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. ';
            
            if (error.code === 'auth/invalid-credential') {
                errorMessage += 'Invalid email or password. Please check your credentials and try again.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage += 'No account found with this email. Please join a team first or contact your coach.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage += 'Incorrect password. Please try again.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage += 'This account has been disabled. Please contact your administrator.';
            } else {
                errorMessage += error.message || 'Unknown error occurred.';
            }
            
            alert(errorMessage);
        }
        });
    }