let currentSelectedRequest = null;

document.addEventListener('DOMContentLoaded', () => {
const donateForm = document.getElementById('donateForm');
    const openRequestsListContainerEl = document.getElementById('openRequestsListContainer');
    const searchOpenRequestsEl = document.getElementById('searchOpenRequests');
    const clearSelectedRequestBtn = document.getElementById('clearSelectedRequestBtn');

    // Elements for displaying selected request info
    const noRequestSelectedMessageEl = document.getElementById('noRequestSelectedMessage');
    const specificRequestInfoEl = document.getElementById('specificRequestInfo');
    const requestTeamEl = document.getElementById('requestTeam');
    const requestedPartEl = document.getElementById('requestedPart');
    const requestedProgramEl = document.getElementById('requestedProgram');
    const requestedQuantityEl = document.getElementById('requestedQuantity');
    const requestedUrgencyEl = document.getElementById('requestedUrgency');
    const requestedDetailsEl = document.getElementById('requestedDetails');
    // Hidden fields
    const selectedRequestIdEl = document.getElementById('selectedRequestId');
    const selectedRequesterIdEl = document.getElementById('selectedRequesterId');
    const selectedRequesterTeamNameEl = document.getElementById('selectedRequesterTeamName');
    const selectedRequesterTeamNumberEl = document.getElementById('selectedRequesterTeamNumber');

    // Pre-fill form fields
    const partNameInput = document.getElementById('partName');
    const programInput = document.getElementById('program');
    const categoryInput = document.getElementById('category');
    const quantityInput = document.getElementById('quantity');
    const descriptionInput = document.getElementById('description');

if (donateForm) {
    donateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
            const user = firebase.auth().currentUser;
            if (!user) {
            alert('Please log in to donate parts');
            return;
        }

            // Get user data to find their team
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                alert("Could not find your user data. Please update your profile.");
                return;
            }
            const userData = userDoc.data();

            // Get team data
            if (!userData.teamId) {
                alert("You are not associated with a team. Please contact an administrator.");
                return;
            }

            const teamDoc = await firebase.firestore().collection('teams').doc(userData.teamId).get();
            if (!teamDoc.exists) {
                alert("Could not find your team data. Please contact an administrator.");
                return;
            }
            const teamData = teamDoc.data();

            try {
                const partData = {
                    partName: partNameInput.value,
                    program: programInput.value,
                    category: categoryInput.value,
                    condition: document.getElementById('condition').value,
                    quantity: parseInt(quantityInput.value),
                    description: descriptionInput.value,
                    shipping: document.getElementById('shipping').value,
                    donorId: user.uid,
                    donorTeamId: userData.teamId,
                    donorTeamName: teamData.teamName,
                    donorTeamNumber: teamData.teamNumber,
                    donorFirstName: userData.firstName,
                    donorLastName: userData.lastName,
                    donorEmail: userData.email,
                    status: 'available',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

        // Image upload functionality has been disabled

                let successMessage = 'Part listed successfully for general donation!';

                // Check if this donation is for a specific request
                if (selectedRequestIdEl.value) {
                    partData.fulfillsRequestId = selectedRequestIdEl.value;
                    partData.status = 'pending_transfer'; // Or another status indicating it's matched

                    const requestRef = firebase.firestore().collection('requests').doc(selectedRequestIdEl.value);
                    // Consider updating request status, e.g., quantity fulfilled
                    await requestRef.update({
                        status: 'being_fulfilled', // Or another appropriate status
                        // Potentially update a field like 'donationsReceived' array or quantity fulfilled
                    });

                    // Create notification for the requester
                    const donationDocRef = await firebase.firestore().collection('donations').add(partData);

                    // If it was for a specific request, now add the notification with the donationId
                    if (selectedRequestIdEl.value && partData.fulfillsRequestId) {
                         await firebase.firestore().collection('notifications').add({
                            recipientId: selectedRequesterIdEl.value,
                            type: 'request_fulfillment_initiated', 
                            message: `Team ${teamData.teamNumber} (${teamData.teamName}) has donated '${partData.partName}' for your request '${currentSelectedRequest?.partName || selectedRequestIdEl.value}'. You can review this donation.`, 
                            requestId: selectedRequestIdEl.value,
                            donationId: donationDocRef.id, // Now we have the ID
                            donatingTeamId: userData.teamId,
                            donatingTeamName: teamData.teamName,
                            donatingTeamNumber: teamData.teamNumber,
                            partName: partData.partName, // Name of the part donated
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            read: false
                        });
                    }

                    successMessage = `Part donated for the selected request! The requesting team has been notified.`;
                } else {
                    // Add the donation to Firebase for general donations
                    await firebase.firestore().collection('donations').add(partData);
                }

                // Points system is currently disabled - TBD

                alert(successMessage);
                donateForm.reset();
                clearSelectedRequest(); // Clear selection and UI
                loadOpenRequests(); // Refresh open requests list

        } catch (error) {
            console.error('Error donating part:', error);
            alert('An error occurred while listing the part');
        }
    });
}

    function clearSelectedRequest() {
        currentSelectedRequest = null;
        selectedRequestIdEl.value = '';
        selectedRequesterIdEl.value = '';
        selectedRequesterTeamNameEl.value = '';
        selectedRequesterTeamNumberEl.value = '';

        noRequestSelectedMessageEl.style.display = 'block';
        specificRequestInfoEl.style.display = 'none';
        // Clear pre-filled form fields if desired
        // partNameInput.value = '';
        // programInput.value = ''; 
        // etc.
    }

    if (clearSelectedRequestBtn) {
        clearSelectedRequestBtn.addEventListener('click', () => {
            clearSelectedRequest();
        });
    }

    async function loadOpenRequests() {
        if (!openRequestsListContainerEl) return;
        openRequestsListContainerEl.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
        const user = firebase.auth().currentUser;

        try {
            let query = firebase.firestore().collection('requests')
                .where('status', '==', 'open') // Only show open requests
                .orderBy('createdAt', 'desc')
                .limit(20); // Limit for performance

            const snapshot = await query.get();

            if (snapshot.empty) {
                openRequestsListContainerEl.innerHTML = '<div class="alert alert-info">No open part requests at the moment.</div>';
                return;
            }

            let html = '';
            for (const doc of snapshot.docs) {
                const request = doc.data();
                const requestId = doc.id;

                // Don't show users their own requests in this list
                if (user && request.requesterId === user.uid) {
                    continue;
                }

                // Fetch requester's team details for display
                let requesterTeamDisplay = `Team ${request.requesterTeamNumber || 'N/A'}`;
                if(request.requesterId) {
                     const teamDoc = await firebase.firestore().collection('teams').doc(request.requesterId).get();
                     if(teamDoc.exists) {
                         const teamData = teamDoc.data();
                         requesterTeamDisplay = `Team ${teamData.teamNumber || 'N/A'} (${teamData.teamName || 'Unknown'})`;
                     }
                }

                html += `
                    <div class="card mb-2 request-card-item">
                    <div class="card-body">
                            <h6 class="card-title">${request.partName} <span class="badge bg-secondary">Qty: ${request.quantity}</span></h6>
                            <p class="card-subtitle mb-1 text-muted">Requested by: ${requesterTeamDisplay}</p>
                            <p class="card-subtitle mb-1 text-muted">Program: ${request.program.toUpperCase()} | Category: ${request.category}</p>
                            <p class="card-text small ellipsis">${request.description}</p>
                            <button class="btn btn-sm btn-success select-request-btn w-100" 
                                data-request-id='${requestId}' 
                                data-requester-id='${request.requesterId}' 
                                data-part-name='${request.partName}' 
                                data-requester-team-name='${request.requesterTeamName || 'Unknown'}' 
                                data-requester-team-number='${request.requesterTeamNumber || 'N/A'}'>
                                Select This Request
                            </button>
                        </div>
                    </div>
                `;
            }
            openRequestsListContainerEl.innerHTML = html;

            // Add event listeners to select request buttons
            const selectRequestBtns = openRequestsListContainerEl.querySelectorAll('.select-request-btn');
            selectRequestBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const requestId = e.target.dataset.requestId;
                    const requesterId = e.target.dataset.requesterId;
                    const partName = e.target.dataset.partName;
                    const requesterTeamName = e.target.dataset.requesterTeamName;
                    const requesterTeamNumber = e.target.dataset.requesterTeamNumber;

                    selectRequest(requestId, requesterId, partName, requesterTeamName, requesterTeamNumber);
                });
            });

        } catch (error) {
            console.error('Error loading open requests:', error);
            openRequestsListContainerEl.innerHTML = '<div class="alert alert-danger">Error loading open requests. Please try again.</div>';
        }
    }

    function selectRequest(requestId, requesterId, partName, requesterTeamName, requesterTeamNumber) {
        currentSelectedRequest = {
            id: requestId,
            requesterId: requesterId,
            partName: partName,
            requesterTeamName: requesterTeamName,
            requesterTeamNumber: requesterTeamNumber
        };

        // Update hidden fields
        selectedRequestIdEl.value = requestId;
        selectedRequesterIdEl.value = requesterId;
        selectedRequesterTeamNameEl.value = requesterTeamName;
        selectedRequesterTeamNumberEl.value = requesterTeamNumber;

        // Update UI to show selected request info
        requestTeamEl.textContent = `Team ${requesterTeamNumber} (${requesterTeamName})`;
        requestedPartEl.textContent = partName;
        requestedProgramEl.textContent = 'Program will be determined by your selection';
        requestedQuantityEl.textContent = 'Quantity will be determined by your donation';
        requestedUrgencyEl.textContent = 'Urgency will be determined by your donation';
        requestedDetailsEl.textContent = 'Details will be determined by your donation';

        // Show selected request info and hide "no request selected" message
        noRequestSelectedMessageEl.style.display = 'none';
        specificRequestInfoEl.style.display = 'block';

        // Pre-fill form fields with request data
        partNameInput.value = partName;
        // Note: We don't pre-fill program, category, or quantity as these should be determined by the donor
    }

    // Initialize page
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            loadOpenRequests();
        }
    });
}); 