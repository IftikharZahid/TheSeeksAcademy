# The Seeks Academy 🎓

**The Seeks Academy** is a modern, feature-rich educational mobile application built with React Native. It provides a comprehensive platform for students to manage their academic life, including courses, assignments, results, and communication with the institute.

## ✨ Features

- **Authentication**: Secure Login and Signup screens with a modern UI.
- **Dashboard**:
  - **DeckSwiper**: Interactive "Tinder-style" card swiper for featured courses.
  - **Quick Actions**: Easy access to key modules (Courses, Assignments, Teachers, etc.).
  - **Dynamic Header**: Personalized greeting based on the time of day.
- **Academic Management**:
  - **Courses**: Browse and view details of available courses.
  - **Assignments**: Track assignment deadlines and status.
  - **Results**: View exam results and performance summaries.
  - **Timetable**: Check weekly class schedules.
  - **Attendance**: Monitor monthly attendance records.
  - **Teachers**: View teacher profiles and qualifications.
- **Communication**:
  - **NoticeBoard**: Stay updated with important announcements (Alerts, Fees, Exams).
  - **Messages**: Receive updates from the admin and teachers.
  - **WhatsApp Integration**: Direct contact with the developer via WhatsApp.
- **Profile & Settings**:
  - **Profile**: Manage personal information.
  - **Settings**: Configure app preferences, view developer info, and secure logout.
  - **About Screen**: View developer details and portfolio.

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) (via [Expo](https://expo.dev/))
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Navigation**: [React Navigation](https://reactnavigation.org/) (Stack & Bottom Tabs)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **Icons**: React Native Vector Icons / Lucide React Native / React Native SVG

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

- **Node.js** (v14 or later)
- **npm** or **yarn**
- **Expo Go** app on your physical device (Android/iOS) OR an Emulator/Simulator.

### Installation

1.  **Clone the repository** (if applicable) or navigate to the project directory:

    ```bash
    cd TheSeeksAcademy
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Start the development server**:
    ```bash
    npx expo start
    ```

### Running the App

- **Physical Device**: Scan the QR code displayed in the terminal using the **Expo Go** app.
- **Android Emulator**: Press `a` in the terminal.
- **iOS Simulator**: Press `i` in the terminal (macOS only).

## 📂 Project Structure

```
src/
├── assets/          # Images and static assets
├── components/      # Reusable UI components (DeckSwiper, TopHeader, etc.)
├── context/         # React Context for state management (CoursesContext)
├── data/            # Mock data files
├── screens/         # Application screens (Home, Profile, Login, etc.)
│   └── navigation/  # Navigation configuration (MainTabs, HomeStack)
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

_Built By IftikharZahid with ❤️ for The Seeks Academy_
