document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    const teamNumberEl = document.getElementById('teamNumber');
    const teamNameEl = document.getElementById('teamName');
    const profilePointsEl = document.getElementById('profilePoints');
    const donatedCountEl = document.getElementById('donatedCount');
    const receivedCountEl = document.getElementById('receivedCount');
    const activeRequestsCountEl = document.getElementById('activeRequestsCount');
    const donationsListEl = document.getElementById('donationsList');
    const requestsListEl = document.getElementById('requestsList');
    const transactionHistoryEl = document.getElementById('transactionHistory');
    const notificationsListContainerEl = document.getElementById('notificationsListContainer');
    const profileNotificationCountBadge = document.getElementById('profileNotificationCount');

    // Form elements for editing
    const editTeamNumberEl = document.getElementById('editTeamNumber');
    const editTeamNameEl = document.getElementById('editTeamName');
    const editLocationEl = document.getElementById('editLocation');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Get user data from Firestore users collection
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                const userData = userDoc.exists ? userDoc.data() : null;

                if (!userData) {
                    console.error('User data not found');
                    return;
                }

                // Get team data from teams collection
                let teamData = null;
                if (userData.teamId) {
                    const teamDoc = await firebase.firestore().collection('teams').doc(userData.teamId).get();
                    teamData = teamDoc.exists ? teamDoc.data() : null;
                }

                if (!teamData) {
                    console.error('Team data not found');
                    return;
                }

                // Update profile information with team data
                if (teamNumberEl) teamNumberEl.textContent = `Team #${teamData.teamNumber || '0000'}`;
                if (teamNameEl) teamNameEl.textContent = teamData.teamName || 'Team Name';
                if (profilePointsEl) profilePointsEl.textContent = (teamData.points || 0).toString();

                // Populate edit form with team data
                if (editTeamNumberEl) editTeamNumberEl.value = teamData.teamNumber || '';
                if (editTeamNameEl) editTeamNameEl.value = teamData.teamName || '';
                if (editLocationEl) editLocationEl.value = `${teamData.city || ''}, ${teamData.state || ''}, ${teamData.country || ''}`;

                // Load donations
                const donationsSnapshot = await firebase.firestore()
                    .collection('donations')
                    .where('donorId', '==', user.uid)
                    .orderBy('createdAt', 'desc')
                    .get();

                let donationsHtml = '';
                if (donationsSnapshot.empty) {
                    donationsListEl.innerHTML = '<div class="alert alert-info">No donations yet. Click on \"Donate Parts\" to add some!</div>';
                } else {
                    donationsSnapshot.forEach(doc => {
                        const donation = doc.data();
                        const donationId = doc.id;
                        const createdAt = donation.createdAt ? new Date(donation.createdAt.toDate()).toLocaleDateString() : 'N/A';
                        const hasImages = donation.images && donation.images.length > 0;
                        
                        let statusBadgeClass = 'secondary';
                        let statusText = formatStatus(donation.status);
                        let additionalInfo = '';
                        let actionButtons = '';

                        switch (donation.status) {
                            case 'available':
                                statusBadgeClass = 'success';
                                actionButtons = `
                                    <div class="btn-group mt-2">
                                        <button class="btn btn-sm btn-primary edit-donation-btn" data-donation-id="${donationId}"><i class="fas fa-edit"></i> Edit</button>
                                        <button class="btn btn-sm btn-warning toggle-donation-status-btn" data-donation-id="${donationId}" data-current-status="available"><i class="fas fa-pause"></i> Mark Unavailable</button>
                                        <button class="btn btn-sm btn-danger delete-donation-btn" data-donation-id="${donationId}"><i class="fas fa-trash"></i> Delete</button>
                                    </div>`;
                                break;
                            case 'claimed':
                                statusBadgeClass = 'info';
                                statusText = 'Claimed';
                                if (donation.claimedByTeamNumber && donation.claimedByTeamName) {
                                    additionalInfo = `<p class="card-text"><small class="text-muted">Claimed by: Team ${donation.claimedByTeamNumber} (${donation.claimedByTeamName})</small></p>`;
                                } else if (donation.claimedByUserId) {
                                    additionalInfo = `<p class="card-text"><small class="text-muted">Claimed by user ID: ${donation.claimedByUserId}</small></p>`; // Fallback
                                }
                                break;
                            case 'pending_transfer':
                                statusBadgeClass = 'warning';
                                statusText = 'Pending Confirmation';
                                if (donation.fulfillsRequestId && donation.recipientTeamNumber && donation.recipientTeamName) {
                                    // This info is added upon confirmation, so not typically available here. Let's assume we want to show who it's GOING TO if known.
                                    // This case will be more for general donations claimed by someone, or for specific donations before recipient is known by donor.
                                    // For a donation *fulfilling* a request, the recipient is implicitly the requester.
                                    // We might need to fetch request details if we want to show "Pending confirmation from Team X (requester)" here.
                                    // For now, the generic message is fine.
                                    additionalInfo = `<p class="card-text"><small class="text-muted">Awaiting confirmation from recipient.</small></p>`;
                                }
                                break;
                            case 'transferred':
                                statusBadgeClass = 'primary';
                                statusText = 'Successfully Transferred';
                                if (donation.recipientTeamNumber && donation.recipientTeamName) {
                                    additionalInfo = `<p class="card-text"><small class="text-muted">To: Team ${donation.recipientTeamNumber} (${donation.recipientTeamName})</small></p>`;
                                } else if (donation.recipientId) {
                                     additionalInfo = `<p class="card-text"><small class="text-muted">To user ID: ${donation.recipientId}</small></p>`; // Fallback
                                }
                                break;
                            case 'unavailable':
                                statusBadgeClass = 'dark';
                                statusText = 'Unavailable (Paused)';
                                 actionButtons = `
                                    <div class="btn-group mt-2">
                                        <button class="btn btn-sm btn-success toggle-donation-status-btn" data-donation-id="${donationId}" data-current-status="unavailable"><i class="fas fa-play"></i> Mark Available</button>
                                        <button class="btn btn-sm btn-danger delete-donation-btn" data-donation-id="${donationId}"><i class="fas fa-trash"></i> Delete</button>
                                    </div>`;
                                break;
                            default:
                                statusText = formatStatus(donation.status || 'Unknown');
                        }

                        donationsHtml += `
                            <div class="card mb-3 donation-card">
                                <div class="row g-0">
                                    ${hasImages ? `
                                        <div class="col-md-3">
                                            <img src="${donation.images[0]}" class="img-fluid rounded-start" alt="${donation.partName}" style="height: 100%; max-height: 150px; object-fit: cover;">
                                        </div>
                                    ` : '<div class="col-md-3 d-flex align-items-center justify-content-center bg-light text-muted"><small>No Image</small></div>'}
                                    <div class="col-md-${hasImages ? '9' : '9'}">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between align-items-start">
                                                <h5 class="card-title mb-1">${donation.partName}</h5>
                                                <span class="badge bg-${statusBadgeClass}">${statusText}</span>
                                            </div>
                                            <h6 class="card-subtitle mb-2 text-muted">${donation.program.toUpperCase()} | ${donation.category}</h6>
                                            <p class="card-text small ellipsis">${donation.description}</p>
                                            <div class="mb-2">
                                                <span class="badge bg-info">Condition: ${donation.condition}</span>
                                                <span class="badge bg-secondary">Quantity: ${donation.quantity}</span>
                                                <span class="badge bg-primary">${getDeliveryMethodText(donation.shipping)}</span>
                                            </div>
                                            <p class="card-text"><small class="text-muted">Listed on ${createdAt}</small></p>
                                            ${additionalInfo}
                                            ${actionButtons}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    donationsListEl.innerHTML = donationsHtml;

                    // Re-attach event listeners for action buttons on donations
                    document.querySelectorAll('.edit-donation-btn').forEach(button => {
                        button.addEventListener('click', function() { editDonation(this.dataset.donationId); });
                    });
                    document.querySelectorAll('.toggle-donation-status-btn').forEach(button => {
                        button.addEventListener('click', function() { 
                            const newStatus = this.dataset.currentStatus === 'available' ? 'unavailable' : 'available';
                            toggleDonationStatus(this.dataset.donationId, newStatus);
                        });
                    });
                    document.querySelectorAll('.delete-donation-btn').forEach(button => {
                        button.addEventListener('click', function() { deleteDonation(this.dataset.donationId); });
                    });

                }
                donatedCountEl.textContent = donationsSnapshot.size;

                // Load requests (and their pending donations)
                const requestsSnapshot = await firebase.firestore()
                    .collection('requests')
                    .where('requesterId', '==', user.uid)
                    .orderBy('createdAt', 'desc')
                    .get();

                requestsListEl.innerHTML = ''; // Clear previous content (important if re-rendering)
                let activeReqCount = 0;
                if (requestsSnapshot.empty) {
                    requestsListEl.innerHTML = '<div class="alert alert-info">You have not made any part requests yet.</div>';
                } else {
                    for (const doc of requestsSnapshot.docs) {
                        const request = doc.data();
                        const requestId = doc.id;
                        if (request.status === 'open' || request.status === 'being_fulfilled') {
                            activeReqCount++;
                        }

                        let requestCardHtml = `
                            <div class="card mb-3 request-summary-card">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">Request: ${request.partName}</h5>
                                    <span class="badge bg-${getRequestStatusBadge(request.status)}">${formatStatus(request.status)}</span>
                                </div>
                                <div class="card-body">
                                    <p><strong>Category:</strong> ${request.category} | <strong>Program:</strong> ${request.program.toUpperCase()}</p>
                                    <p><strong>Quantity Originally Requested:</strong> ${request.originalQuantity || request.quantity} | <strong>Quantity Still Needed:</strong> ${request.quantityNeeded || request.quantity}</p>
                                    <p><strong>Urgency:</strong> <span class="badge ${getUrgencyBadgeClass(request.urgency)}">${request.urgency}</span></p>
                                    <p><strong>Description:</strong> ${request.description}</p>
                                    <small class="text-muted">Requested on: ${request.createdAt ? new Date(request.createdAt.toDate()).toLocaleDateString() : 'N/A'}</small>
                                    ${ (request.status === 'open' || request.status === 'being_fulfilled') ? `
                                        <button class="btn btn-sm btn-danger float-end delete-request-btn" data-request-id="${requestId}">Cancel Request</button>
                                    ` : ''}
                                </div>`;

                        // Check for donations made for this request that are pending transfer
                        if (request.status === 'being_fulfilled' || request.status === 'open') { // Also check 'open' if a donation might arrive before status changes
                            const pendingDonationsSnapshot = await firebase.firestore().collection('donations')
                                .where('fulfillsRequestId', '==', requestId)
                                .where('status', '==', 'pending_transfer')
                                .get();

                            if (!pendingDonationsSnapshot.empty) {
                                requestCardHtml += `<div class="card-footer"><h6 class="mb-2">Incoming Donations (Pending Your Confirmation):</h6>`;
                                pendingDonationsSnapshot.forEach(donationDoc => {
                                    const donation = donationDoc.data();
                                    const donationId = donationDoc.id;
                                    const hasDonationImages = donation.images && donation.images.length > 0;
                                    requestCardHtml += `
                                        <div class="border p-2 mb-2 rounded">
                                            <div class="row">
                                                ${hasDonationImages ? `
                                                <div class="col-md-2">
                                                    <img src="${donation.images[0]}" class="img-fluid rounded" alt="${donation.partName}" style="max-height: 80px; object-fit: cover;">
                                                </div>` : '<div class="col-md-2 text-center"><small class="text-muted">No Image</small></div>'}
                                                <div class="col-md-${hasDonationImages ? '7' : '7'}">
                                                    <strong>Part:</strong> ${donation.partName} (Qty: ${donation.quantity})<br>
                                                    <strong>From Team:</strong> ${donation.donorTeamNumber || 'N/A'} (${donation.donorTeamName || 'Unknown'})<br>
                                                    <strong>Condition:</strong> ${donation.condition}
                                                </div>
                                                <div class="col-md-3 d-flex align-items-center">
                                                    <button class="btn btn-sm btn-success w-100 confirm-receipt-btn" 
                                                            data-donation-id="${donationId}" 
                                                            data-request-id="${requestId}" 
                                                            data-donated-quantity="${donation.quantity}"
                                                            data-donor-id="${donation.donorId}"
                                                            data-donated-part-name="${donation.partName}">
                                                        Confirm Receipt
                                                    </button>
                                                </div>
                                            </div>
                                        </div>`;
                                });
                                requestCardHtml += `</div>`; // end card-footer
                            }
                        }
                        requestCardHtml += `</div>`; // end request-summary-card
                        requestsListEl.innerHTML += requestCardHtml;
                    }
                }
                activeRequestsCountEl.textContent = activeReqCount;
                
                // Add event listeners for new buttons
                document.querySelectorAll('.confirm-receipt-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        confirmReceipt(
                            this.dataset.donationId, 
                            this.dataset.requestId, 
                            parseInt(this.dataset.donatedQuantity), 
                            this.dataset.donorId,
                            this.dataset.donatedPartName
                        );
                    });
                });
                document.querySelectorAll('.delete-request-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        if(confirm("Are you sure you want to cancel this request? This cannot be undone.")) {
                            deleteRequest(this.dataset.requestId);
                        }
                    });
                });

                // Load received parts count
                const receivedSnapshot = await firebase.firestore()
                    .collection('transactions')
                    .where('receiverId', '==', user.uid)
                    .get();
                receivedCountEl.textContent = receivedSnapshot.size;

                // Load transaction history - simplified query
                const transactionsSnapshot = await firebase.firestore()
                    .collection('transactions')
                    .where('participantIds', 'array-contains', user.uid)
                    .limit(10)
                    .get();

                let transactionsHtml = '';
                const transactions = transactionsSnapshot.docs
                    .map(doc => ({...doc.data(), id: doc.id}))
                    .filter(transaction => transaction.status === 'completed')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 10);

                transactions.forEach(transaction => {
                    const isReceiver = transaction.receiverId === user.uid;
                    transactionsHtml += `
                        <div class="list-group-item">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${isReceiver ? 'Received' : 'Donated'}: ${transaction.partName}</h6>
                                <small>${new Date(transaction.timestamp.toDate()).toLocaleDateString()}</small>
                            </div>
                            <p class="mb-1">Quantity: ${transaction.quantity}</p>
                            <small>${isReceiver ? 'From' : 'To'} Team #${transaction[isReceiver ? 'donorTeamNumber' : 'receiverTeamNumber']}</small>
                        </div>
                    `;
                });
                transactionHistoryEl.innerHTML = transactionsHtml || '<div class="list-group-item">No transaction history</div>';

                // Load notifications
                loadNotifications(user.uid);

                // Check for hash and switch to tab
                if (window.location.hash) {
                    const hash = window.location.hash;
                    const tabTrigger = document.querySelector(`.nav-tabs button[data-bs-target=\"${hash}Content\"]`);
                    if (hash === '#notifications') { //Specific handling for notifications as its content pane ID is different
                         const notificationsTabTrigger = document.getElementById('notifications-tab');
                         if(notificationsTabTrigger) {
                            bootstrap.Tab.getOrCreateInstance(notificationsTabTrigger).show();
                         }
                    } else if (tabTrigger) {
                        bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
                    }
                }

            } catch (error) {
                console.error('Error loading profile data:', error);
                alert('Failed to load profile data');
            }
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
        }
    });

    // Handle profile updates
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const user = firebase.auth().currentUser;
            if (!user) return;

            try {
                await firebase.firestore().collection('teams').doc(user.uid).update({
                    teamNumber: editTeamNumberEl.value,
                    teamName: editTeamNameEl.value,
                    location: editLocationEl.value
                });

                // Close modal and refresh page
                bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
                window.location.reload();
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Failed to update profile');
            }
        });
    }
});

let unsubscribeProfileNotifications = null;

async function loadNotifications(userId) {
    const notificationsListContainerEl = document.getElementById('notificationsListContainer');
    const profileNotificationCountBadge = document.getElementById('profileNotificationCount');
    if (!notificationsListContainerEl) return;

    if (unsubscribeProfileNotifications) {
        unsubscribeProfileNotifications();
    }

    const notificationsQuery = firebase.firestore().collection('notifications')
        .where('recipientId', '==', userId)
        .orderBy('timestamp', 'desc');

    unsubscribeProfileNotifications = notificationsQuery.onSnapshot(snapshot => {
        let notificationsHtml = '';
        let unreadCount = 0;
        if (snapshot.empty) {
            notificationsListContainerEl.innerHTML = '<p class="text-center text-muted">No notifications yet.</p>';
             if(profileNotificationCountBadge) {
                profileNotificationCountBadge.textContent = '0';
                profileNotificationCountBadge.style.display = 'none';
            }
            return;
        }

        snapshot.forEach(doc => {
            const notification = doc.data();
            const notificationId = doc.id;
            const timestamp = notification.timestamp ? new Date(notification.timestamp.toDate()).toLocaleString() : 'No date';
            
            if (!notification.read) {
                unreadCount++;
            }

            let actionButton = '';
            let message = notification.message;

            // Handle donation claim notifications
            if (notification.type === 'donation_claimed' && !notification.accepted) {
                message = `Would you like to donate '${notification.partName}' to Team ${notification.claimingTeamNumber} (${notification.claimingTeamName})?`;
                actionButton = `
                    <button class="btn btn-success btn-sm mt-2 accept-donation-request-btn" 
                        data-notification-id="${notificationId}"
                        data-requester-id="${notification.claimingTeamId}"
                        data-requester-email="${notification.claimingTeamEmail}"
                        data-team-number="${notification.claimingTeamNumber}"
                        data-team-name="${notification.claimingTeamName}"
                        onclick="acceptDonationRequest('${notificationId}', '${notification.claimingTeamId}', '${notification.claimingTeamEmail}', event)">
                        Accept
                    </button>
                `;
            }
            // Keep the existing donation request handling
            else if (notification.type === 'donation_request' && !notification.accepted) {
                actionButton = `
                    <button class="btn btn-success btn-sm mt-2 accept-donation-request-btn" 
                        data-notification-id="${notificationId}"
                        data-requester-id="${notification.requesterId}"
                        data-requester-email="${notification.requesterEmail}"
                        data-team-number="${notification.requesterTeamNumber}"
                        data-team-name="${notification.requesterTeamName}"
                        onclick="acceptDonationRequest('${notificationId}', '${notification.requesterId}', '${notification.requesterEmail}', event)">
                        Would you like to donate to Team ${notification.requesterTeamNumber}?
                    </button>
                `;
            }

            notificationsHtml += `
                <a href="#" class="list-group-item list-group-item-action ${notification.read ? 'read-notification' : 'fw-bold'}" 
                   data-id="${notificationId}" 
                   onclick="markNotificationAsRead('${notificationId}', event)">
                    <div class="d-flex w-100 justify-content-between">
                        <p class="mb-1">${message}</p>
                        <small class="text-muted">${timestamp}</small>
                    </div>
                    ${actionButton}
                    ${!notification.read ? '<small>Click to mark as read.</small>' : '<small class="text-muted">Read</small>'}
                </a>
            `;
        });

        notificationsListContainerEl.innerHTML = notificationsHtml;
        if (profileNotificationCountBadge) {
            profileNotificationCountBadge.textContent = unreadCount;
            profileNotificationCountBadge.style.display = unreadCount > 0 ? '' : 'none';
        }

    }, error => {
        console.error("Error loading notifications for profile:", error);
        notificationsListContainerEl.innerHTML = '<p class="text-center text-danger">Error loading notifications.</p>';
    });
}

async function markNotificationAsRead(notificationId, event) {
    if (event) event.preventDefault();
    try {
        const db = firebase.firestore();
        await db.collection('notifications').doc(notificationId).update({ read: true });
        console.log(`Notification ${notificationId} marked as read.`);
        // The list will auto-update due to the onSnapshot listener in loadNotifications
        // The navbar count will auto-update due to the listener in main.js
    } catch (error) {
        console.error("Error marking notification as read:", error);
        alert('Failed to mark notification as read.');
    }
}

// Add this new function to handle donation request acceptance
async function acceptDonationRequest(notificationId, requesterId, requesterEmail, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            showNotification('Please log in to accept donation requests.', 'error', 'Login Required');
            return;
        }

        const db = firebase.firestore();
        const batch = db.batch();

        // Get the current user's team details
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            showNotification('Your user information could not be found. Please update your profile.', 'error', 'Profile Error');
            return;
        }
        const userData = userDoc.data();
        
        if (!userData.teamId) {
            showNotification('You are not associated with a team. Please update your profile.', 'error', 'No Team Found');
            return;
        }
        
        const donorTeamDoc = await db.collection('teams').doc(userData.teamId).get();
        if (!donorTeamDoc.exists) {
            showNotification('Your team information could not be found. Please update your profile.', 'error', 'Team Error');
            return;
        }
        const donorTeamData = donorTeamDoc.data();

        // Mark the notification as accepted
        const notificationRef = db.collection('notifications').doc(notificationId);
        batch.update(notificationRef, { 
            accepted: true,
            read: true 
        });

        // Create notification for requester
        const requesterNotificationRef = db.collection('notifications').doc();
        batch.set(requesterNotificationRef, {
            recipientId: requesterId,
            type: 'donor_accepted',
            message: `Team ${donorTeamData.teamNumber} (${donorTeamData.teamName}) would like to donate to your request. Please reach out to them at ${user.email} to coordinate the donation.`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            donorEmail: user.email,
            donorTeamNumber: donorTeamData.teamNumber,
            donorTeamName: donorTeamData.teamName
        });

        // Create confirmation notification for donor (self)
        const donorNotificationRef = db.collection('notifications').doc();
        batch.set(donorNotificationRef, {
            recipientId: user.uid,
            type: 'donation_acceptance_sent',
            message: `Please check your email for a message from ${requesterEmail}. They will be reaching out to coordinate the donation.`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });

        await batch.commit();

        showNotification(`Great! Please watch your email (${user.email}) for a message from Team ${requesterEmail}. They will be reaching out to coordinate the donation.`, 'success', 'Request Accepted');
        // Refresh notifications
        loadNotifications(user.uid);

    } catch (error) {
        console.error('Error accepting donation request:', error);
        showNotification('Failed to accept donation request. Please try again.', 'error', 'Acceptance Failed');
    }
}

// Helper functions for donation management
async function editDonation(donationId) {
    try {
        const donationDoc = await firebase.firestore().collection('donations').doc(donationId).get();
        const donation = donationDoc.data();

        // Create and show modal
        const modalHtml = `
            <div class="modal fade" id="editDonationModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Donation</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editDonationForm">
                                <div class="mb-3">
                                    <label class="form-label">Part Name</label>
                                    <input type="text" class="form-control" id="editPartName" value="${donation.partName}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" id="editDescription" rows="3" required>${donation.description}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Quantity</label>
                                    <input type="number" class="form-control" id="editQuantity" value="${donation.quantity}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Condition</label>
                                    <select class="form-select" id="editCondition" required>
                                        <option value="new" ${donation.condition === 'new' ? 'selected' : ''}>New</option>
                                        <option value="likeNew" ${donation.condition === 'likeNew' ? 'selected' : ''}>Like New</option>
                                        <option value="good" ${donation.condition === 'good' ? 'selected' : ''}>Good</option>
                                        <option value="fair" ${donation.condition === 'fair' ? 'selected' : ''}>Fair</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Shipping</label>
                                    <select class="form-select" id="editShipping" required>
                                        <option value="donor" ${donation.shipping === 'donor' ? 'selected' : ''}>I will handle shipping</option>
                                        <option value="recipient" ${donation.shipping === 'recipient' ? 'selected' : ''}>Recipient pays shipping</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="saveDonationEdit('${donationId}')">Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editDonationModal'));
        modal.show();

        // Clean up modal after it's hidden
        document.getElementById('editDonationModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    } catch (error) {
        console.error('Error loading donation details:', error);
        alert('Failed to load donation details');
    }
}

async function saveDonationEdit(donationId) {
    try {
        const updates = {
            partName: document.getElementById('editPartName').value,
            description: document.getElementById('editDescription').value,
            quantity: parseInt(document.getElementById('editQuantity').value),
            condition: document.getElementById('editCondition').value,
            shipping: document.getElementById('editShipping').value
        };

        await firebase.firestore().collection('donations').doc(donationId).update(updates);
        
        // Close modal and refresh page
        bootstrap.Modal.getInstance(document.getElementById('editDonationModal')).hide();
        window.location.reload();
    } catch (error) {
        console.error('Error updating donation:', error);
        alert('Failed to update donation');
    }
}

async function toggleDonationStatus(donationId, status) {
    try {
        await firebase.firestore().collection('donations').doc(donationId).update({
            status: status === 'unavailable' ? 'unavailable' : 'available'
        });
        window.location.reload();
    } catch (error) {
        console.error('Error updating donation status:', error);
        alert('Failed to update donation status');
    }
}

async function deleteDonation(donationId) {
    if (!confirm('Are you sure you want to remove this donation? This cannot be undone.')) return;

    try {
        const donationDoc = await firebase.firestore().collection('donations').doc(donationId).get();
        const donation = donationDoc.data();

        // Note: Image deletion from storage requires Firebase Storage setup
        // For now, images will remain in storage until it's configured
        if (donation.images && donation.images.length > 0) {
            console.log('Image deletion is currently disabled - Firebase Storage not configured');
            // TODO: Implement image deletion when Firebase Storage is set up
        }

        // Delete the donation document
        await firebase.firestore().collection('donations').doc(donationId).delete();
        window.location.reload();
    } catch (error) {
        console.error('Error deleting donation:', error);
        alert('Failed to delete donation');
    }
}

async function confirmReceipt(donationId, requestId, donatedQuantity, donorId, donatedPartName) {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Please log in.");
        return;
    }

    try {
        const db = firebase.firestore();
        const batch = db.batch();

        // 0. Get recipient (current user) team details to store on donation doc
        const recipientTeamDoc = await db.collection('teams').doc(user.uid).get();
        const recipientTeamData = recipientTeamDoc.exists ? recipientTeamDoc.data() : { teamId: user.uid, teamName: 'Unknown', teamNumber: 'N/A' };

        // 1. Update donation status
        const donationRef = db.collection('donations').doc(donationId);
        batch.update(donationRef, {
            status: 'transferred',
            confirmedByRecipientAt: firebase.firestore.FieldValue.serverTimestamp(),
            recipientId: user.uid, // Storing who received it
            recipientTeamId: recipientTeamData.teamId || user.uid,
            recipientTeamName: recipientTeamData.teamName,
            recipientTeamNumber: recipientTeamData.teamNumber
        });

        // 2. Update request status & quantity
        const requestRef = db.collection('requests').doc(requestId);
        const requestDoc = await requestRef.get();
        if (!requestDoc.exists) {
            throw new Error("Request document not found.");
        }
        const requestData = requestDoc.data();
        const currentQuantityNeeded = requestData.quantityNeeded || requestData.quantity; // Fallback to original quantity if quantityNeeded is not set
        const newQuantityNeeded = Math.max(0, currentQuantityNeeded - donatedQuantity);
        
        let newRequestStatus = requestData.status;
        if (newQuantityNeeded <= 0) {
            newRequestStatus = 'fulfilled';
        } else {
            // Check if other donations are still pending for this request
            const otherPendingDonations = await db.collection('donations')
                .where('fulfillsRequestId', '==', requestId)
                .where('status', '==', 'pending_transfer')
                .limit(1) // We only need to know if at least one other exists, excluding the current one
                .get();
            
            // If the current donation was the only one pending and it didn't fully satisfy the request
            if (otherPendingDonations.empty || (otherPendingDonations.size === 1 && otherPendingDonations.docs[0].id === donationId)) {
                 newRequestStatus = 'open'; // Re-open if not fully met and no other donations are on their way
            } else {
                newRequestStatus = 'being_fulfilled'; // Keep as being_fulfilled if other donations are still pending
            }
        }
        
        batch.update(requestRef, {
            quantityNeeded: newQuantityNeeded,
            status: newRequestStatus,
            lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Send notification to donor
        const currentUserTeamDoc = await db.collection('teams').doc(user.uid).get();
        const currentUserTeamData = currentUserTeamDoc.exists ? currentUserTeamDoc.data() : { teamNumber: 'N/A', teamName: 'Unknown' };

        batch.set(db.collection('notifications').doc(), { // Use .doc() to auto-generate ID
            recipientId: donorId,
            type: 'donation_receipt_confirmed',
            message: `Team ${currentUserTeamData.teamNumber} (${currentUserTeamData.teamName}) has confirmed receipt of your donation of '${donatedPartName}' for their request. Please check your email for their coordination message. Thank you!`,
            donationId: donationId,
            requestId: requestId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        // 4. Potentially update points for receiver (e.g. if points are for successful exchange) - for now, no points change on receive.

        await batch.commit();
        alert('Receipt confirmed! The donor has been notified and the request has been updated.');
        
        // Reload profile data to reflect changes
        // This is a bit heavy-handed, ideally, just re-render the requests section or update UI directly
        const authUser = firebase.auth().currentUser;
        if (authUser) {
            // Manually trigger a refresh of the main content loading parts
            // This is a simplified way, might need a more specific function if profile.js is further modularized
            const event = new CustomEvent('authchanged', { detail: { user: authUser } });
            document.dispatchEvent(event);
            // Or find a more direct way to call the part of onAuthStateChanged that loads data
            // Forcing a page reload is the simplest but not smoothest UX:
            window.location.reload(); 
        }


    } catch (error) {
        console.error("Error confirming receipt:", error);
        alert("Failed to confirm receipt: " + error.message);
    }
}

function getRequestStatusBadge(status) {
    switch (status) {
        case 'open': return 'success';
        case 'being_fulfilled': return 'primary';
        case 'fulfilled': return 'secondary';
        case 'cancelled': return 'danger';
        default: return 'dark';
    }
}

function formatStatus(status) {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Modify existing deleteRequest to refresh UI better if needed
async function deleteRequest(requestId) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        await firebase.firestore().collection('requests').doc(requestId).delete();
        // Optionally, also cancel/delete notifications related to this request if appropriate.
        // And handle any donations that were 'pending_transfer' for this request.
        // For now, simple deletion.
        alert('Request cancelled.');
        window.location.reload(); // Simple refresh
    } catch (error) {
        console.error('Error deleting request:', error);
        alert('Failed to delete request.');
    }
}

// Helper function for urgency badge (already exists or similar)
function getUrgencyBadgeClass(urgency) {
    switch (urgency?.toLowerCase()) {
        case 'high': return 'bg-danger';
        case 'medium': return 'bg-warning';
        case 'low': return 'bg-info'; // Matched to other badge styles
        default: return 'bg-secondary';
    }
}

function getDeliveryMethodText(shipping) {
    switch(shipping) {
        case 'donor': return 'I will ship';
        case 'recipient': return 'Recipient pays shipping';
        case 'dropoff': return 'Local drop-off/pickup';
        default: return 'Shipping TBD';
    }
} 