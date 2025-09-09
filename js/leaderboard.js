// Fetch and display leaderboard data
async function fetchLeaderboard(program = 'all') {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';

        let query = firebase.firestore().collection('teams')
            .orderBy('points', 'desc')
            .limit(50);

        if (program !== 'all') {
            query = query.where('program', '==', program);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No teams found</td></tr>';
            return;
        }

        // Get donation counts for each team
        const donationCounts = new Map();
        for (const doc of snapshot.docs) {
            const donationsSnapshot = await firebase.firestore()
                .collection('donations')
                .where('donorTeamId', '==', doc.id)
                .get();
            donationCounts.set(doc.id, donationsSnapshot.size);
        }

        // Get member counts for each team
        const memberCounts = new Map();
        for (const doc of snapshot.docs) {
            const membersSnapshot = await firebase.firestore()
                .collection('team_members')
                .where('teamId', '==', doc.id)
                .get();
            memberCounts.set(doc.id, membersSnapshot.size);
        }

    tbody.innerHTML = '';
        snapshot.docs.forEach((doc, index) => {
            const team = doc.data();
        const row = document.createElement('tr');
        
        // Add rank medal for top 3
        let rankDisplay = (index + 1).toString();
        if (index === 0) {
            rankDisplay = '🥇';
        } else if (index === 1) {
            rankDisplay = '🥈';
        } else if (index === 2) {
            rankDisplay = '🥉';
        }

        row.innerHTML = `
            <td>${rankDisplay}</td>
            <td>
                ${team.teamNumber} - ${team.teamName}
                ${team.points >= 1000 ? ' 👑' : ''}
                ${team.points >= 500 ? ' ⭐' : ''}
            </td>
            <td>${(team.program || 'N/A').toUpperCase()}</td>
            <td>${memberCounts.get(doc.id) || 0}</td>
                <td>${donationCounts.get(doc.id) || 0}</td>
            <td>
                    <span class="points-badge">${team.points || 0}</span>
            </td>
        `;

        tbody.appendChild(row);
    });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading leaderboard data</td></tr>';
    }
}

// Handle program filter changes
const programFilter = document.getElementById('programFilter');
if (programFilter) {
    programFilter.addEventListener('change', (e) => {
        fetchLeaderboard(e.target.value);
    });
}

// Update user points in UI
function updateUserPoints() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const pointsElement = document.getElementById('userPoints');
    if (pointsElement && userData.points) {
        pointsElement.textContent = userData.points; // This is team points, not user points
    }
}

// Initialize leaderboard
document.addEventListener('DOMContentLoaded', () => {
    // Fetch and display leaderboard data
    async function fetchLeaderboard(program = 'all') {
        const tbody = document.getElementById('leaderboardBody');
        if (!tbody) return;

        try {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';

            let query = firebase.firestore().collection('teams')
                .orderBy('points', 'desc')
                .limit(50);

            if (program !== 'all') {
                query = query.where('program', '==', program);
            }

            const snapshot = await query.get();

            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">No teams found</td></tr>';
                return;
            }

            // Get donation counts for each team
            const donationCounts = new Map();
            for (const doc of snapshot.docs) {
                const donationsSnapshot = await firebase.firestore()
                    .collection('donations')
                    .where('donorTeamId', '==', doc.id)
                    .get();
                donationCounts.set(doc.id, donationsSnapshot.size);
            }

            // Get member counts for each team
            const memberCounts = new Map();
            for (const doc of snapshot.docs) {
                const membersSnapshot = await firebase.firestore()
                    .collection('team_members')
                    .where('teamId', '==', doc.id)
                    .get();
                memberCounts.set(doc.id, membersSnapshot.size);
            }

            tbody.innerHTML = '';
            snapshot.docs.forEach((doc, index) => {
                const team = doc.data();
                const row = document.createElement('tr');
                
                // Add rank medal for top 3
                let rankDisplay = (index + 1).toString();
                if (index === 0) {
                    rankDisplay = '🥇';
                } else if (index === 1) {
                    rankDisplay = '🥈';
                } else if (index === 2) {
                    rankDisplay = '🥉';
                }

                row.innerHTML = `
                    <td>${rankDisplay}</td>
                    <td>
                        ${team.teamNumber} - ${team.teamName}
                        ${team.points >= 1000 ? ' 👑' : ''}
                        ${team.points >= 500 ? ' ⭐' : ''}
                    </td>
                    <td>${(team.program || 'N/A').toUpperCase()}</td>
                    <td>${memberCounts.get(doc.id) || 0}</td>
                    <td>${donationCounts.get(doc.id) || 0}</td>
                    <td>
                        <span class="points-badge">${team.points || 0}</span>
                    </td>
                `;

                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading leaderboard data</td></tr>';
        }
    }

    // Handle program filter changes
    const programFilter = document.getElementById('programFilter');
    if (programFilter) {
        programFilter.addEventListener('change', (e) => {
            fetchLeaderboard(e.target.value);
        });
    }

    // Initialize leaderboard
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
    fetchLeaderboard();
        }
    });

    updateUserPoints();
}); 