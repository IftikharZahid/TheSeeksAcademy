# The Seeks Academy 🎓

**The Seeks Academy** is a comprehensive educational platform that includes a **Mobile Application** (built with React Native) for students and teachers, and a powerful **Desktop/Web Administrative Dashboard** (built with React, Vite, and Electron) for institute management. It provides everything needed to manage academic life, including courses, assignments, results, and seamless communication.

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
- **Profile & Settings**:
  - **Profile**: Manage personal information.
  - **Settings**: Configure app preferences, view developer info, and secure logout.
  - **About Screen**: View developer details and portfolio.
- **Admin Dashboard (Desktop/Web)**:
  - **Centralized Management**: Manage students, teachers, courses, and finances in one place.
  - **Data Visualization**: Rich charts and analytics for attendance, revenue, and exam performance.
  - **Export Capabilities**: Easily generate and download PDF and Excel reports for records.
  - **Cross-Platform**: Run as a web app or install as a native desktop application via Electron.

## 🛠️ Tech Stack

### Mobile App
- **Framework**: [React Native](https://reactnative.dev/) (via [Expo](https://expo.dev/))
- **Navigation**: [React Navigation](https://reactnavigation.org/)
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **Icons**: React Native Vector Icons / Lucide React Native / React Native SVG

### Admin Dashboard
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Desktop Packaging**: [Electron](https://www.electronjs.org/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Charts & Visualization**: [Recharts](https://recharts.org/)

### Shared
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Backend/Database**: [Firebase](https://firebase.google.com/)

## 🚀 Getting Started

Follow these instructions to set up and run the projects locally.

### Prerequisites

- **Node.js** (v18 or later recommended)
- **npm** or **yarn**
- **Expo Go** app on your physical device (Android/iOS) OR an Emulator/Simulator.

### 📱 Mobile App Setup

1.  Navigate to the main project directory:
    ```bash
    cd TheSeeksAcademy
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Expo development server:
    ```bash
    npx expo start
    ```
4.  **Running**: Scan the QR code with **Expo Go**, or press `a` for Android Emulator / `i` for iOS Simulator.

### 💻 Admin Dashboard Setup

1.  Navigate to the dashboard directory:
    ```bash
    cd TheSeeksAcademy/TheSeeks-Dashboard
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Run as Web App**:
    ```bash
    npm run dev
    ```
4.  **Run as Desktop App (Electron)**:
    ```bash
    npm run electron:dev
    ```
5.  **Build Desktop App (Windows .exe)**:
    ```bash
    npm run electron:build
    ```

## 💻 Moving to Another Laptop

If you want to move this project to another laptop, follow these steps:

1.  **Copy the Project**:
    - Copy the entire project folder to the new laptop.
    - **Tip**: You can skip copying the `node_modules` folder to save time and space, as you will reinstall dependencies anyway.

2.  **Install Setup Tools** (on the new laptop):
    - Install **Node.js** (LTS version recommended) from [nodejs.org](https://nodejs.org/).
    - Install a code editor like **VS Code**.

3.  **Install Dependencies**:
    - Open a terminal/command prompt in the project folder on the new laptop.
    - Run the following command to download all necessary libraries:
      ```bash
      npm install
      ```

4.  **Run the Project**:
    - Start the app using:
      ```bash
      npx expo start
      ```

## 📂 Project Structure

```
TheSeeksAcademy/
├── TheSeeks-Dashboard/    # React + Vite + Electron Admin Dashboard
│   ├── electron/          # Electron main process files
│   ├── src/               # React web application source code
│   └── package.json       # Dashboard dependencies and scripts
│
├── src/                   # React Native Mobile App Source
│   ├── assets/            # Images and static assets
│   ├── components/        # Reusable UI components
│   ├── screens/           # Application screens
│   ├── store/             # Redux state management
│   └── ...
├── app.json               # Expo configuration
└── package.json           # Mobile app dependencies
```

## 📦 Moving to a New System

If you want to move this project to another laptop or computer, follow these steps to ensure a smooth transition:

### 1. Preparation
- **Node.js**: Ensure the new machine has **Node.js** installed. Download it from [nodejs.org](https://nodejs.org/).
- **Copy Files**: Copy the entire project folder to the new machine.
  > **Important**: You do NOT need to copy the `node_modules` or `.expo` folders. These will be recreated during installation. `package.json` and `package-lock.json` MUST be included.

### 2. Installation on New Machine
1.  Open a terminal (Command Prompt, PowerShell, or Terminal) on the new system.
2.  Navigate to the project folder:
    ```bash
    cd path/to/TheSeeksAcademy
    ```
3.  Install the dependencies:
    ```bash
    npm install
    # or if you use yarn
    yarn install
    ```
    *This process may take a few minutes as it downloads all necessary libraries.*

### 3. Running the Project
Once the installation is complete, you can start the project just like before:

```bash
npx expo start
```
- A QR code will appear. Scan it with the **Expo Go** app on your phone.
- Press `a` to run on Android Emulator.
- Press `i` to run on iOS Simulator (macOS only).

### Troubleshooting
- If you face any issues, try starting with the clear cache flag:
  ```bash
  npx expo start --clear
  ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

_Built By IftikharZahid with ❤️ for The Seeks Academy_
