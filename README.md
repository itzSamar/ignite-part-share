# IGNITE Part Share

A modern web application for FIRST Robotics teams to share and request parts, built with Firebase and Bootstrap 5.

## 🚀 Features

- **Team Management**: Create teams, join existing teams, and manage team members
- **Part Sharing**: Donate parts to other teams and browse available parts
- **Part Requests**: Request specific parts from the community
- **Real-time Notifications**: Get notified about part requests and donations
- **Leaderboard**: Track team activity and engagement
- **Mobile Responsive**: Optimized for both desktop and mobile devices
- **Firebase Integration**: Secure authentication and real-time database

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome 6
- **Backend**: Firebase
  - Authentication
  - Cloud Firestore (Database)
  - Firebase Hosting
- **Fonts**: Inter (Google Fonts)

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js (v16 or higher)
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project set up

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ignite-part-share
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Setup

#### Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password)
4. Create a Firestore database
5. Enable Firebase Hosting

#### Configure Firebase
1. Copy your Firebase config from the project settings
2. Update `js/firebase-init.js` with your Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 4. Deploy to Firebase
```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Deploy everything
firebase deploy
```

## 📁 Project Structure

```
ignite-part-share/
├── index.html              # Main landing page
├── pages/                  # Individual page files
│   ├── login.html
│   ├── create-team.html
│   ├── join-team.html
│   ├── parts-list.html
│   ├── donate.html
│   ├── request.html
│   ├── profile.html
│   ├── leaderboard.html
│   └── terms.html
├── js/                     # JavaScript files
│   ├── firebase-init.js    # Firebase configuration
│   ├── main.js            # Global functions and utilities
│   ├── auth.js            # Authentication logic
│   ├── create-team.js     # Team creation logic
│   ├── parts.js           # Parts management
│   ├── donate.js          # Donation logic
│   ├── request.js         # Part request logic
│   ├── profile.js         # User profile management
│   └── leaderboard.js     # Leaderboard functionality
├── styles/                 # CSS files
│   ├── main.css           # Main stylesheet
│   └── new-design.css     # Additional design styles
├── models/                 # Data models
│   └── notification.js    # Notification model
├── data/                   # Data directory
│   └── db/                # Database files
├── firebase.json           # Firebase configuration
├── firestore.rules        # Firestore security rules
├── firestore.indexes      # Firestore indexes
└── package.json           # Node.js dependencies
```

## 🔧 Configuration

### Firebase Security Rules
The current Firestore rules allow read/write access to all documents for development. For production, update `firestore.rules` with proper security rules.

### Team Creation
Teams require an entrance code: `IPSPILOTQ1`

### Email Verification
Users must verify their email addresses to access all features. Check spam folders for verification emails.

## 📱 Mobile Support

The application is fully responsive and optimized for mobile devices with:
- Touch-friendly interface
- Responsive layouts
- Mobile-optimized navigation
- Touch-optimized forms and buttons

## 🎨 Customization

### Branding
- Update the site title in all HTML files
- Modify colors in `styles/main.css` CSS variables
- Replace the logo/brand name as needed

### Features
- Points system is currently disabled (TBD)
- Image upload for donations is disabled
- Notification system is fully functional

## 🚀 Deployment Options

### Firebase Hosting (Recommended)
```bash
firebase deploy --only hosting
```

### Custom Domain
1. Configure custom domain in Firebase Console
2. Update Firebase config if needed
3. Deploy with `firebase deploy`

### Static Hosting
The project can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support or questions:
- Check the Firebase Console for errors
- Review browser console for JavaScript errors
- Ensure all Firebase services are properly configured

## 🔄 Updates

To update the project:
1. Pull the latest changes
2. Run `npm install` to update dependencies
3. Deploy with `firebase deploy`

---

**IGNITE Part Share** - Connecting FIRST Robotics teams through part sharing! 🤖🔥
