// Parts data structure
let parts = [];
let filteredParts = [];

// Fetch parts from the server
async function fetchParts() {
    try {
        // TODO: Replace with actual API endpoint
        const response = await fetch('/api/parts');
        if (response.ok) {
            parts = await response.json();
            filteredParts = [...parts];
            renderParts();
        }
    } catch (error) {
        console.error('Error fetching parts:', error);
        showNotification('Failed to load parts', 'error', 'Loading Error');
    }
}

// Render parts in the container
function renderParts() {
    const container = document.getElementById('partsContainer');
    if (!container) return;

    container.innerHTML = '';

    filteredParts.forEach(part => {
        const partCard = document.createElement('div');
        partCard.className = 'part-card';
        partCard.innerHTML = `
            <h5>${part.name}</h5>
            <p class="text-muted">${part.category} | ${part.condition}</p>
            <p>${part.description}</p>
            <div class="d-flex justify-content-between align-items-center">
                <span class="badge bg-primary">${part.program}</span>
                <button class="btn btn-sm btn-success request-btn" 
                        data-part-id="${part.id}">
                    Request Part
                </button>
            </div>
            <div class="mt-2">
                <small class="text-muted">Donated by Team ${part.donorTeam}</small>
            </div>
        `;

        // Add event listener for request button
        const requestBtn = partCard.querySelector('.request-btn');
        requestBtn.addEventListener('click', () => requestPart(part.id));

        container.appendChild(partCard);
    });
}

// Handle part request
async function requestPart(partId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please log in to request parts', 'error', 'Login Required');
        window.location.href = 'login.html';
        return;
    }

    try {
        // TODO: Replace with actual API endpoint
        const response = await fetch('/api/parts/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ partId }),
        });

        if (response.ok) {
            showNotification('Part request submitted successfully!', 'success', 'Request Sent');
            // Refresh parts list
            fetchParts();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to request part', 'error', 'Request Failed');
        }
    } catch (error) {
        console.error('Error requesting part:', error);
        showNotification('An error occurred while requesting the part', 'error', 'Request Error');
    }
}

// Apply filters to parts
function applyFilters() {
    const programFilters = {
        fll: document.getElementById('fllFilter').checked,
        ftc: document.getElementById('ftcFilter').checked,
        frc: document.getElementById('frcFilter').checked,
    };

    const categoryFilter = document.getElementById('categoryFilter').value;
    const conditionFilter = document.getElementById('conditionFilter').value;
    const searchTerm = document.getElementById('searchParts').value.toLowerCase();

    filteredParts = parts.filter(part => {
        // Program filter
        if (!programFilters.fll && !programFilters.ftc && !programFilters.frc) {
            // If no program filters are selected, show all
            return true;
        }
        if (programFilters[part.program.toLowerCase()]) {
            return true;
        }
        return false;
    }).filter(part => {
        // Category filter
        if (!categoryFilter) return true;
        return part.category.toLowerCase() === categoryFilter.toLowerCase();
    }).filter(part => {
        // Condition filter
        if (!conditionFilter) return true;
        return part.condition.toLowerCase() === conditionFilter.toLowerCase();
    }).filter(part => {
        // Search term
        if (!searchTerm) return true;
        return part.name.toLowerCase().includes(searchTerm) ||
               part.description.toLowerCase().includes(searchTerm);
    });

    renderParts();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    let lastDoc = null;
    const PARTS_PER_PAGE = 12;

    // Fetch parts from Firestore
    async function fetchParts(loadMore = false, forceRefresh = false) {
        try {
            const partsContainer = document.getElementById('partsList');
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            const loadMoreContainer = document.getElementById('loadMoreContainer');

            if (!loadMore) {
                partsContainer.innerHTML = '<div class="col-12 text-center"><div class="spinner-border" role="status"></div></div>';
                lastDoc = null;
            }

            // Force refresh by clearing cache if needed
            if (forceRefresh) {
                console.log('Force refreshing parts data...');
                await firebase.firestore().clearPersistence();
            }

            // Get filters
            const searchTerm = document.getElementById('searchParts').value.toLowerCase();
            const programFilter = document.getElementById('programFilter').value;
            const categoryFilter = document.getElementById('categoryFilter').value;
            const conditionFilter = document.getElementById('conditionFilter').value;

            // Build query
            let query = firebase.firestore().collection('donations')
                .where('status', '==', 'available')
                .orderBy('createdAt', 'desc');

            if (programFilter) {
                query = query.where('program', '==', programFilter);
            }
            if (categoryFilter) {
                query = query.where('category', '==', categoryFilter);
            }
            if (conditionFilter) {
                query = query.where('condition', '==', conditionFilter);
            }

            if (lastDoc && loadMore) {
                query = query.startAfter(lastDoc);
            }

            query = query.limit(PARTS_PER_PAGE);

            console.log('Fetching parts with query:', query);
            const snapshot = await query.get();
            console.log('Parts fetched:', snapshot.docs.length, 'documents');
            
            if (!loadMore) {
                partsContainer.innerHTML = '';
            }

            if (snapshot.empty && !loadMore) {
                partsContainer.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-info text-center">No parts found</div>
                    </div>
                `;
                loadMoreContainer.style.display = 'none';
                return;
            }

            // Store last document for pagination
            lastDoc = snapshot.docs[snapshot.docs.length - 1];

            // Show/hide load more button
            loadMoreContainer.style.display = snapshot.docs.length === PARTS_PER_PAGE ? 'block' : 'none';

            for (const doc of snapshot.docs) {
                const part = doc.data();
                // Use the team data already stored in the donation document
                const donorData = {
                    teamNumber: part.donorTeamNumber,
                    teamName: part.donorTeamName
                };

                const partCard = document.createElement('div');
                partCard.className = 'col-md-4 mb-4';
                partCard.innerHTML = `
                    <div class="card h-100">
                        ${part.images && part.images.length > 0 ? `
                            <img src="${part.images[0]}" class="card-img-top" alt="${part.partName}" style="height: 200px; object-fit: cover;">
                        ` : ''}
                        <div class="card-body">
                            <h5 class="card-title">${part.partName}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">
                                ${part.program.toUpperCase()} | ${part.category}
                            </h6>
                            <p class="card-text">${part.description}</p>
                            <div class="mb-2">
                                <span class="badge bg-info">${part.condition}</span>
                                <span class="badge bg-secondary">Qty: ${part.quantity}</span>
                                <span class="badge bg-primary">${getDeliveryMethodText(part.shipping)}</span>
                            </div>
                            <p class="card-text">
                                <small class="text-muted">
                                    Donated by Team ${donorData?.teamNumber || 'N/A'} - ${donorData?.teamName || 'Unknown'}
                                </small>
                            </p>
                            <button class="btn btn-success w-100 claim-btn" data-part-id="${doc.id}" data-donor-id="${part.donorId}" data-part-name="${part.partName}">
                                Claim Part
                            </button>
                        </div>
                    </div>
                `;
                
                partCard.querySelector('.claim-btn').addEventListener('click', function() {
                    const partId = this.dataset.partId;
                    const donorId = this.dataset.donorId;
                    const partName = this.dataset.partName;
                    claimPart(partId, donorId, partName);
                });

                partsContainer.appendChild(partCard);
            }
        } catch (error) {
            console.error('Error fetching parts:', error);
            document.getElementById('partsList').innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger text-center">Error loading parts</div>
                </div>
            `;
        }
    }

    // Handle part claim
    window.claimPart = async function(partId, donorId, partName) {
        const user = firebase.auth().currentUser;
        if (!user) {
            showNotification('Please log in to claim parts', 'error', 'Login Required');
            // Consider redirecting to login page: window.location.href = 'login.html';
            return;
        }

        if (user.uid === donorId) {
            showNotification("You cannot claim your own donation.", 'error', 'Invalid Action');
            return;
        }

        try {
            const db = firebase.firestore();
            const partRef = db.collection('donations').doc(partId);
            const partDoc = await partRef.get();

            if (!partDoc.exists || partDoc.data().status !== 'available') {
                showNotification('This part is no longer available or does not exist.', 'error', 'Part Unavailable');
                fetchParts(); // Refresh list
                return;
            }

            // Get claiming user's team details
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
            
            const claimingUserTeamDoc = await db.collection('teams').doc(userData.teamId).get();
            if (!claimingUserTeamDoc.exists) {
                showNotification('Your team information could not be found. Please update your profile.', 'error', 'Team Error');
                return;
            }
            const claimingTeamData = claimingUserTeamDoc.data();

            // Update donation status
            await partRef.update({
                status: 'claimed',
                claimedByUserId: user.uid,
                claimedByTeamId: claimingTeamData.teamId || user.uid, // Use user.uid as fallback if teamId field name is different or not present. Assuming teamId is stored.
                claimedByTeamName: claimingTeamData.teamName, // Assuming teamName is stored
                claimedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Create notification for the donor
            await db.collection('notifications').add({
                recipientId: donorId,
                type: 'donation_claimed',
                partId: partId,
                partName: partName,
                claimingTeamId: claimingTeamData.teamId || user.uid,
                claimingTeamName: claimingTeamData.teamName,
                claimingTeamNumber: claimingTeamData?.teamNumber || 'N/A',
                claimingTeamEmail: user.email,
                claimingUserId: user.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                read: false,
                accepted: false
            });

            showNotification('Part claimed successfully! The donor has been notified.', 'success', 'Part Claimed');
            fetchParts(); // Refresh the parts list

        } catch (error) {
            console.error('Error claiming part:', error);
            showNotification('An error occurred while claiming the part. Please try again.', 'error', 'Claim Error');
        }
    };

    // Add event listeners for filters
    const filters = ['searchParts', 'programFilter', 'categoryFilter', 'conditionFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => fetchParts());
            if (filterId === 'searchParts') {
                let debounceTimeout;
                element.addEventListener('input', () => {
                    clearTimeout(debounceTimeout);
                    debounceTimeout = setTimeout(() => fetchParts(), 300);
                });
            }
        }
    });

    // Add event listener for load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => fetchParts(true));
    }

    // Initialize page
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            fetchParts();
            }
        });
});

function getDeliveryMethodText(shipping) {
    switch(shipping) {
        case 'donor': return 'Donor will ship';
        case 'recipient': return 'Recipient pays shipping';
        case 'dropoff': return 'Local drop-off/pickup';
        default: return 'Shipping TBD';
    }
} 