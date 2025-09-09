// Handle request form submission
document.addEventListener('DOMContentLoaded', () => {
const requestForm = document.getElementById('requestForm');
if (requestForm) {
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();

            const user = firebase.auth().currentUser;
            if (!user) {
            alert('Please log in to request parts');
            return;
        }

            try {
        // Get form data
                const requestedQuantity = parseInt(document.getElementById('requestQuantity').value);
                const requestData = {
                    partName: document.getElementById('requestPartName').value,
                    program: document.getElementById('requestProgram').value,
                    category: document.getElementById('requestCategory').value,
                    quantity: requestedQuantity, // Keep for general display / legacy
                    originalQuantity: requestedQuantity, // For tracking fulfillment
                    quantityNeeded: requestedQuantity,   // For tracking fulfillment
                    details: document.getElementById('requestDetails').value,
                    urgency: document.getElementById('requestUrgency').value,
                    requesterId: user.uid,
                    status: 'open', // Initial status
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

        // Handle reference image upload
        const referenceImage = document.getElementById('requestImage').files[0];
        if (referenceImage) {
            // Note: Image upload functionality requires Firebase Storage setup
            // For now, images will be skipped until storage is configured
            console.log('Image uploads are currently disabled - Firebase Storage not configured');
            // TODO: Implement image upload when Firebase Storage is set up
        }

                // Add to Firestore
                await firebase.firestore().collection('requests').add(requestData);

                alert('Part request submitted successfully! Your request is now visible to other teams.');
                requestForm.reset();
                loadRequestsList(); // Refresh the requests list
        } catch (error) {
            console.error('Error requesting part:', error);
            alert('An error occurred while submitting the request');
        }
    });
}

// Load and display current requests
async function loadRequestsList() {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;

    try {
            const requestsSnapshot = await firebase.firestore()
                .collection('requests')
                .orderBy('createdAt', 'desc')
                .get();

            let requestsHtml = '';
            for (const doc of requestsSnapshot.docs) {
                const request = doc.data();
                
                // Get requester user data first, then team data
                const requesterUserDoc = await firebase.firestore()
                    .collection('users')
                    .doc(request.requesterId)
                    .get();
                
                let requesterTeamNumber = 'N/A';
                if (requesterUserDoc.exists) {
                    const requesterUserData = requesterUserDoc.data();
                    if (requesterUserData.teamId) {
                        const requesterTeamDoc = await firebase.firestore()
                            .collection('teams')
                            .doc(requesterUserData.teamId)
                            .get();
                        if (requesterTeamDoc.exists) {
                            requesterTeamNumber = requesterTeamDoc.data().teamNumber;
                        }
                    }
                }

                requestsHtml += `
                    <tr class="${request.status === 'fulfilled' ? 'table-success' : (request.status === 'being_fulfilled' ? 'table-primary' : '')}">
                    <td>${request.partName}</td>
                    <td>${request.program.toUpperCase()}</td>
                    <td>${request.category}</td>
                    <td>${request.quantityNeeded || request.quantity} / ${request.originalQuantity || request.quantity}</td>
                    <td>Team ${requesterTeamNumber}</td>
                    <td>
                        <span class="badge ${getUrgencyBadgeClass(request.urgency)}">
                            ${request.urgency.toUpperCase()}
                        </span>
                    </td>
                    <td>${request.createdAt ? new Date(request.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <span class="badge bg-${getRequestPageStatusBadge(request.status)}">
                            ${formatRequestPageStatus(request.status)}
                        </span>
                    </td>
                    <td>
                        ${ (request.status === 'open' || request.status === 'being_fulfilled') && request.requesterId !== firebase.auth().currentUser?.uid
                            ? `<a href="donate.html?requestId=${doc.id}&partName=${encodeURIComponent(request.partName)}" class="btn btn-sm btn-primary">
                                Donate for this Request
                               </a>`
                            : request.requesterId === firebase.auth().currentUser?.uid 
                                ? '<a href="profile.html#requestsContent" class="btn btn-sm btn-info">Manage</a>' 
                                : '' // No action for other states or if not logged in / not owner
                        }
                    </td>
                </tr>
                `;
        }
            requestsList.innerHTML = requestsHtml || '<tr><td colspan="8" class="text-center">No requests found</td></tr>';
    } catch (error) {
        console.error('Error loading requests:', error);
            requestsList.innerHTML = '<tr><td colspan="8" class="text-center">Error loading requests</td></tr>';
    }
}

// Helper function to get badge class based on urgency
function getUrgencyBadgeClass(urgency) {
        switch (urgency?.toLowerCase()) {
        case 'high':
            return 'bg-danger';
        case 'medium':
            return 'bg-warning';
        case 'low':
            return 'bg-success';
        default:
            return 'bg-secondary';
    }
}

// Helper for status badge on request page table
function getRequestPageStatusBadge(status) {
    switch (status) {
        case 'open': return 'success';
        case 'being_fulfilled': return 'info';
        case 'fulfilled': return 'secondary';
        case 'cancelled': return 'danger';
        default: return 'dark';
    }
}

// Helper for formatting status on request page table
function formatRequestPageStatus(status) {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Initialize page
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            loadRequestsList();
        }
    });
}); 
}; 