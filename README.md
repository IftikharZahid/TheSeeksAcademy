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
src/
├── assets/          # Images and static assets
├── components/      # Reusable UI components (DeckSwiper, TopHeader, etc.)
├── context/         # React Context for state management (CoursesContext)
├── data/            # Mock data files
├── screens/         # Application screens (Home, Profile, Login, etc.)
│   └── navigation/  # Navigation configuration (MainTabs, HomeStack)
└── ...
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
