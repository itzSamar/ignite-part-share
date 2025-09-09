// Notification utility functions
function showNotification(message, type = 'info', title = null) {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.warn('Notification container not found');
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const titleText = title || (type === 'error' ? 'Error' : type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : 'Info');
    
    notification.innerHTML = `
        <div class="notification-header">
            <h6 class="notification-title">${titleText}</h6>
            <button class="notification-close" onclick="closeNotification(this)">&times;</button>
        </div>
        <p class="notification-message">${message}</p>
    `;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        closeNotification(notification.querySelector('.notification-close'));
    }, 5000);
}

function closeNotification(closeButton) {
    const notification = closeButton.closest('.notification');
    if (notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Make functions globally available
window.showNotification = showNotification;
window.closeNotification = closeNotification;

// Test function to create a notification
window.testNotification = async function() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            showNotification('Please log in to test notifications', 'error', 'Login Required');
            return;
        }
        
        await firebase.firestore().collection('notifications').add({
            recipientId: user.uid,
            type: 'test',
            message: 'This is a test notification',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        showNotification('Test notification created!', 'success', 'Test Complete');
    } catch (error) {
        console.error('Error creating test notification:', error);
        showNotification('Failed to create test notification: ' + error.message, 'error', 'Test Failed');
    }
};

// Test function to check notification count
window.checkNotifications = async function() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            showNotification('Please log in to check notifications', 'error', 'Login Required');
            return;
        }
        
        const snapshot = await firebase.firestore().collection('notifications')
            .where('recipientId', '==', user.uid)
            .get();
        
        const unreadCount = snapshot.docs.filter(doc => !doc.data().read).length;
        
        console.log(`Total notifications: ${snapshot.size}`);
        console.log(`Unread notifications: ${unreadCount}`);
        console.log('All notifications:', snapshot.docs.map(doc => ({ 
            id: doc.id, 
            read: doc.data().read, 
            type: doc.data().type,
            message: doc.data().message 
        })));
        
        showNotification(`Found ${unreadCount} unread notifications out of ${snapshot.size} total`, 'info', 'Notification Check');
    } catch (error) {
        console.error('Error checking notifications:', error);
        showNotification('Failed to check notifications: ' + error.message, 'error', 'Check Failed');
    }
};

// Test function to manually trigger notification listener
window.triggerNotificationListener = function() {
    const user = firebase.auth().currentUser;
    if (!user) {
        showNotification('Please log in to trigger notification listener', 'error', 'Login Required');
        return;
    }
    
    console.log('Manually triggering notification listener...');
    listenForNotifications(user.uid);
    showNotification('Notification listener triggered. Check console for output.', 'info', 'Listener Triggered');
};

// Global resend verification function
window.resendVerification = async () => {
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            await user.sendEmailVerification();
            showNotification('Verification email sent! Please check your inbox AND SPAM FOLDER!', 'success', 'Email Sent');
        } else {
            showNotification('You must be logged in to resend verification email.', 'error', 'Not Logged In');
        }
    } catch (error) {
        console.error('Error sending verification email:', error);
        showNotification('Error sending verification email: ' + error.message, 'error', 'Email Error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, checking auth state...');
    let unsubscribeNotifications = null; // To keep track of the notification listener

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(async (user) => {
        console.log('Auth state changed:', {
            isLoggedIn: !!user,
            userId: user?.uid,
            email: user?.email,
            currentPage: window.location.pathname
        });

        const navbarNav = document.querySelector('.navbar-nav:last-child');
        const mainNav = document.querySelector('.navbar-nav.me-auto');
        
        if (user) {
            console.log('User is logged in, fetching user data...');
            
            // Get user data from Firestore
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            const userData = userDoc.data() || {}; // Ensure userData is an object
            console.log('User data fetched:', userData);
            
            // Get team data if user belongs to a team
            let teamData = null;
            if (userData.teamId) {
                const teamDoc = await firebase.firestore().collection('teams').doc(userData.teamId).get();
                teamData = teamDoc.data() || {};
                console.log('Team data fetched:', teamData);
            }
            
            // Store combined data in localStorage
            const combinedData = { ...userData, ...teamData };
            localStorage.setItem('userData', JSON.stringify(combinedData));
            console.log('Combined data stored in localStorage');

            // Check if email is verified (only required for coaches)
            if (!user.emailVerified && userData.role === 'Coach') {
                console.log('Coach email not verified, showing verification notice');
                // Show verification notice in the navbar
                if (navbarNav) {
                    navbarNav.innerHTML = `
                        <div class="alert alert-warning mb-0 py-3" style="font-size: 1.1rem; font-weight: bold; text-align: center;">
                            <i class="fas fa-exclamation-triangle me-2" style="font-size: 1.5rem;"></i>
                            <div style="font-size: 1.4rem; color: #d63384; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">
                                EMAIL VERIFICATION REQUIRED!
                            </div>
                            <div style="font-size: 1.3rem; color: #dc3545; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">
                                CHECK YOUR EMAIL AND SPAM FOLDER!
                            </div>
                            <div style="font-size: 1rem; margin-bottom: 12px;">
                                Click the verification link to access all features. PLEASE CHECK YOUR SPAM FOLDERS.
                            </div>
                            <div>
                                <button class="btn btn-sm btn-outline-warning me-2" onclick="resendVerification()">Resend Email</button>
                                <button class="btn btn-sm btn-outline-success" onclick="checkEmailVerification()">Check Verification</button>
                            </div>
                        </div>
                    `;
                }
                return; // Don't proceed with full user setup until email is verified
            }
            
            try {
                // Show all navigation items
                if (mainNav) {
                    mainNav.innerHTML = `
                        <li class="nav-item">
                            <a class="nav-link ${window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') ? 'active' : ''}" href="${window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html'}">Home</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${window.location.pathname.includes('donate.html') ? 'active' : ''}" href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}donate.html">Donate Parts</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${window.location.pathname.includes('request.html') ? 'active' : ''}" href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}request.html">Request Parts</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${window.location.pathname.includes('parts-list.html') ? 'active' : ''}" href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}parts-list.html">Find Parts</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${window.location.pathname.includes('leaderboard.html') ? 'active' : ''}" href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}leaderboard.html">Leaderboard</a>
                        </li>
                    `;
                    console.log('Updated main navigation for logged-in user');
                }

                // Update navigation for logged-in state
                navbarNav.innerHTML = `
                    <span class="nav-item notification-container">
                        <a class="nav-link" href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}profile.html#notifications" id="notificationsLink">
                            <i class="fas fa-bell"></i>
                            <span class="badge bg-danger notification-badge" id="notificationCount" style="display: none;">0</span>
                        </a>
                    </span>
                    <span class="nav-link">
                        <span class="points-badge">Team Points: <span id="userPoints">${teamData?.points || '0'}</span></span>
                    </span>
                    <div class="user-dropdown">
                        <a href="#" class="user-dropdown-toggle" id="userDropdownToggle">
                            <i class="fas fa-user"></i>
                            <span>${userData.firstName || 'User'}</span>
                            <i class="fas fa-chevron-down"></i>
                        </a>
                        <div class="user-dropdown-menu" id="userDropdownMenu">
                            <a href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}profile.html" class="user-dropdown-item">
                                <i class="fas fa-user-circle"></i> Profile
                            </a>
                            <a href="#" class="user-dropdown-item logout" id="logoutBtn">
                                <i class="fas fa-sign-out-alt"></i> Log Out
                            </a>
                        </div>
                    </div>
                `;
                console.log('Updated user navigation for logged-in user');
                
                // Initialize user dropdown functionality
                const userDropdownToggle = document.getElementById('userDropdownToggle');
                const userDropdownMenu = document.getElementById('userDropdownMenu');
                
                if (userDropdownToggle && userDropdownMenu) {
                    userDropdownToggle.addEventListener('click', (e) => {
                        e.preventDefault();
                        userDropdownMenu.classList.toggle('show');
                    });
                    
                    // Close dropdown when clicking outside
                    document.addEventListener('click', (e) => {
                        if (!userDropdownToggle.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                            userDropdownMenu.classList.remove('show');
                        }
                    });
                }
                
                // resendVerification function is already defined globally above
                
                // Initialize notification listener
                try {
                    await listenForNotifications(user.uid);
                    console.log('Notification listener initialized successfully');
                } catch (error) {
                    console.error('Error initializing notification listener:', error);
                }

                // Add logout handler
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        console.log('Logout clicked, signing out...');
                        if (unsubscribeNotifications) {
                            unsubscribeNotifications();
                            unsubscribeNotifications = null;
                            console.log('Unsubscribed from notifications.');
                        }
                        try {
                            await firebase.auth().signOut();
                            localStorage.removeItem('userData');
                            console.log('Successfully logged out, redirecting to home...');
                            window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
                        } catch (error) {
                            console.error('Logout error:', error);
                            alert('Failed to logout');
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching user data or setting up UI:', error);
            }
        } else {
            console.log('User is not logged in');
            if (unsubscribeNotifications) {
                unsubscribeNotifications();
                unsubscribeNotifications = null;
                console.log('Unsubscribed from notifications due to logout.');
            }
            // User is not logged in
            localStorage.removeItem('userData');
            
            // Show only Home in main navigation
            if (mainNav) {
                mainNav.innerHTML = `
                    <li class="nav-item">
                        <a class="nav-link ${window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') ? 'active' : ''}" href="${window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html'}">Home</a>
                    </li>
                `;
                console.log('Updated main navigation for logged-out user');
            }
            
            // Update navigation for logged-out state
            if (navbarNav) {
                navbarNav.innerHTML = `
                    <a class="nav-link" href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}login.html">Login</a>
                    <a class="nav-link" href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}create-team.html">Create Team</a>
                    <a class="nav-link" href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}join-team.html">Join Team</a>
                `;
                console.log('Updated user navigation for logged-out user');
            }

            // If on a restricted page, redirect to home
            const restrictedPages = ['donate.html', 'request.html', 'parts-list.html', 'leaderboard.html', 'profile.html'];
            if (restrictedPages.some(page => window.location.pathname.includes(page))) {
                console.log('Unauthorized access to restricted page, redirecting to home...');
                // Ensure redirection path is correct based on current location
                let homePath = 'index.html';
                if (window.location.pathname.includes('/pages/')) {
                    homePath = '../index.html';
                }
                if (window.location.pathname !== homePath && !window.location.pathname.endsWith('/')) {
                     window.location.href = homePath;
                }
            }
        }
    });

    function listenForNotifications(userId) {
        console.log('Setting up notification listener for user:', userId);
        
        if (unsubscribeNotifications) {
            console.log('Unsubscribing from previous notification listener');
            unsubscribeNotifications();
        }

        // First, let's check if there are any notifications at all for this user
        firebase.firestore().collection('notifications')
            .where('recipientId', '==', userId)
            .get()
            .then(snapshot => {
                console.log('Initial notification check - Total notifications for user:', snapshot.size);
                snapshot.docs.forEach(doc => {
                    console.log('Notification:', { id: doc.id, read: doc.data().read, type: doc.data().type });
                });
            })
            .catch(error => {
                console.error('Error checking initial notifications:', error);
            });

        try {
            // First try to get all notifications for this user to debug
            const allNotificationsQuery = firebase.firestore().collection('notifications')
                .where('recipientId', '==', userId)
                .orderBy('timestamp', 'desc');
            
            console.log('Setting up notification listener for user:', userId);
            
            // Try the filtered query first, fall back to all notifications if it fails
            let notificationsQuery;
            try {
                notificationsQuery = firebase.firestore().collection('notifications')
                    .where('recipientId', '==', userId)
                    .where('read', '==', false)
                    .orderBy('timestamp', 'desc');
            } catch (indexError) {
                console.warn('Composite index not found, using fallback query:', indexError);
                notificationsQuery = allNotificationsQuery;
            }

            unsubscribeNotifications = notificationsQuery.onSnapshot(snapshot => {
                // Filter unread notifications if using fallback query
                const unreadNotifications = snapshot.docs.filter(doc => !doc.data().read);
                const count = unreadNotifications.length;
                const notificationCountBadge = document.getElementById('notificationCount');
                const notificationsLink = document.getElementById('notificationsLink');
                
                console.log(`User has ${count} unread notifications out of ${snapshot.size} total.`);
                console.log('All notifications:', snapshot.docs.map(doc => ({ id: doc.id, read: doc.data().read, type: doc.data().type })));
                console.log('Unread notifications:', unreadNotifications.map(doc => ({ id: doc.id, data: doc.data() })));

                if (!notificationsLink) {
                    console.error('Notification link element not found');
                    return;
                }

                if (!notificationCountBadge) {
                    console.error('Notification count badge element not found');
                    return;
                }

                // Always ensure the notification link is visible
                notificationsLink.style.display = 'inline-block';
                
                // Update the badge
                notificationCountBadge.textContent = count;
                notificationCountBadge.style.display = count > 0 ? 'inline-block' : 'none';
                
                console.log(`Updated notification badge: ${count} notifications, display: ${notificationCountBadge.style.display}`);

            }, error => {
                console.error("Error in notification listener:", error);
            });

            return Promise.resolve();
        } catch (error) {
            console.error("Error setting up notification listener:", error);
            return Promise.reject(error);
        }
    }

    // Also log the current auth state immediately
    const currentUser = firebase.auth().currentUser;
    console.log('Current auth state on page load:', {
        isLoggedIn: !!currentUser,
        userId: currentUser?.uid,
        email: currentUser?.email,
        currentPage: window.location.pathname
    });
     // If user is already logged in on page load, ensure notifications are listened to
    if (currentUser) {
        listenForNotifications(currentUser.uid);
        // Attempt to set user data if not already done by onAuthStateChanged
        // This can happen if onAuthStateChanged fires before this block on very fast loads
        // or if the user data setting part inside onAuthStateChanged has not completed.
        // However, onAuthStateChanged is generally reliable.
        // We might also need to re-trigger the UI update for points if it didn't catch.
        const userData = JSON.parse(localStorage.getItem('userData'));
        if(userData && document.getElementById('userPoints')) {
            document.getElementById('userPoints').textContent = userData.points || '0'; // This is team points, not user points
        }
         if(userData && document.getElementById('notificationCount') && !unsubscribeNotifications) {
            // If for some reason the listener wasn't setup by onAuthStateChanged yet, but user is present.
            listenForNotifications(currentUser.uid);
        }
    }
}); 