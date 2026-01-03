# 🎯 Resolution Tracker

An AI-powered personal resolution tracker that helps you set, monitor, and achieve your goals throughout the year using natural language processing and intelligent feedback.

## ✨ Features

- **🤖 AI-Powered Coaching**: Natural language interaction with Claude AI for goal creation and progress updates
- **📊 Advanced Analytics**: Comprehensive dashboard with progress tracking, trends, and insights
- **🎯 Smart Goal Management**: Category-based organization with milestone tracking
- **💾 Data Export/Import**: Export progress data in JSON/CSV formats with backup/restore functionality
- **🔄 Offline Support**: Queue updates when offline and sync when reconnected
- **📱 Responsive Design**: Beautiful, animated interface that works on all devices
- **🎨 Progress Visualization**: Dynamic progress bars and category-based color coding

## 🚀 Live Demo

Visit the live application: [https://yourusername.github.io/resolution-tracker](https://yourusername.github.io/resolution-tracker)

## 🛠️ Technology Stack

- **Frontend**: React 18 with Hooks
- **Styling**: Tailwind CSS with custom animations
- **Icons**: Lucide React
- **AI Integration**: Anthropic Claude API
- **Storage**: Browser localStorage with error handling
- **Deployment**: GitHub Pages

## 📱 How to Use

### Creating Goals
1. Use natural language to describe your goals: "I want to learn Spanish this year"
2. The AI will automatically categorize and add your resolution
3. Set progress milestones to track smaller achievements

### Tracking Progress
1. Update your progress with simple messages: "I studied for 2 hours today"
2. The AI will adjust your progress percentage and provide encouraging feedback
3. View detailed analytics and insights about your journey

### Managing Data
1. Export your data anytime in JSON or CSV format
2. Create backups to protect your progress
3. Restore from backups if needed

## 🔧 Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/resolution-tracker.git
cd resolution-tracker

# Open the HTML file in a browser
open docs/index.html

# Or serve locally with Python
python -m http.server 8000
# Then visit http://localhost:8000/docs/
```

## 🚀 Deployment

This project is configured for automatic deployment to GitHub Pages:

1. **Fork this repository**
2. **Go to repository Settings > Pages**
3. **Select "GitHub Actions" as the source**
4. **Push to main branch to trigger deployment**

## ⚙️ Configuration

### AI Integration
To enable full AI functionality:
1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. The current demo uses simulated AI responses for demonstration
3. For production, implement secure API key management

### Custom Styling
- Modify the CSS in `docs/index.html`
- Colors and animations can be customized in the style section
- Font families can be changed via Google Fonts imports

## 📊 Features Deep Dive

### Analytics Dashboard
- **Progress Tracking**: Visual representation of goal completion
- **Category Analysis**: Break down goals by type (health, career, personal, etc.)
- **Momentum Tracking**: Monitor activity levels over time
- **AI Recommendations**: Get personalized suggestions for improvement

### Offline Capability
- **Queue System**: Updates are saved locally when offline
- **Auto Sync**: Pending updates sync automatically when back online
- **Error Handling**: Graceful fallbacks for network issues

### Data Management
- **Local Storage**: All data persisted in browser localStorage
- **Export Options**: Download data in multiple formats
- **Backup/Restore**: Full data backup with version control

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com) for Claude AI
- [Lucide](https://lucide.dev) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com) for styling
- [React](https://reactjs.org) for the framework

## 📧 Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/resolution-tracker](https://github.com/yourusername/resolution-tracker)

---

Made with ❤️ for achieving greatness in 2026!