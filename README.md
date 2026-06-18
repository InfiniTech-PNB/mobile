# KavachAI Mobile App

> **Quantum-Safe Infrastructure Dashboard for Mobile**
> Built for PNB Hackathon 2026 by **InfiniTech**

This mobile application provides a robust, interactive dashboard for security administrators to monitor cryptographic vulnerabilities, track Post-Quantum Cryptography (PQC) readiness, and run infrastructure scans directly from their iOS or Android devices.

---

## 📌 Table of Contents

- [Features](#-features)
- [Architecture & Flow](#-architecture--flow)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Local Setup (First Time)](#-local-setup-first-time)
- [Running the Application](#-running-the-application)
- [Application Modules & Screens](#-application-modules--screens)
- [Team](#-team)

---

## 🚀 Features

| Feature | Description |
|---|---|
| **Cross-Platform** | Single codebase compiled natively for both iOS and Android. |
| **Secure Authentication** | Seamless email and OTP-based 2FA login flow. |
| **Mobile Audit Center** | Trigger new PQC and TLS configuration scans on your domains right from your phone. |
| **Data Visualization** | High-performance mobile charts showing risk distribution and PQC readiness. |
| **CBOM & Inventory** | View Cryptographic Bill of Materials and complete crypto algorithm inventories. |
| **Reporting Hub** | View executive summaries, schedule automated reports, or request on-demand reports to your email. |

---

## 🔄 Architecture & Flow

### Execution Flow / How it Works

1. **Authenticate**: User logs in with email and OTP verification (2FA) via the Auth module.
2. **Dashboard**: The main dashboard provides an at-a-glance view of domain readiness, risk scores, and total monitored assets.
3. **Audit/Scan**: Users can navigate to the Scan tab to initiate soft or deep cryptographic scans.
4. **Analysis & Results**: Once a scan completes, users can deep-dive into the TLS configurations, cipher suites, and AI-generated PQC remediation strategies.
5. **Reporting**: The Reporting tab allows administrators to dispatch on-demand executive PDFs or manage recurring scheduled reports.

---

## 🛠️ Tech Stack

### Framework & Routing
| Technology | Purpose |
|---|---|
| **React Native** | Native mobile framework |
| **Expo** | Development platform and build pipeline |
| **Expo Router** | File-based navigation and routing (`app/` directory) |

### Styling & UI
| Technology | Purpose |
|---|---|
| **NativeWind (Tailwind CSS)** | Utility-first styling adapted for React Native |
| **React Native Gifted Charts** | Powerful native chart visualizations |
| **Lucide React Native** | Iconography |

### Data & API
| Technology | Purpose |
|---|---|
| **Axios** | HTTP requests and API integrations |
| **Expo Secure Store** | Secure local storage for JWT tokens |

---

## 📂 Project Structure

```text
mobile/
│
├── app/                 # Expo Router file-based routing
│   ├── (auth)/          # Authentication screens (Login, OTP)
│   ├── (tabs)/          # Main bottom-tab navigation screens (Dashboard, Scan, Reports, etc.)
│   ├── _layout.jsx      # Global navigation layout
│   └── +not-found.jsx   # 404 / Error screen
│
├── assets/              # Static images and fonts
├── components/          # Reusable UI components (Buttons, Cards, Inputs)
├── context/             # React Context for global state (e.g., AuthContext)
├── services/            # API call abstractions and Axios configuration
├── app.json             # Expo project configuration
├── tailwind.config.js   # NativeWind / Tailwind styling config
└── package.json         # Node dependencies
```

---

## ⚙️ Local Setup (First Time)

### Prerequisites
- Node.js (v18+)
- Expo CLI
- Expo Go app on your physical device OR an iOS Simulator / Android Emulator installed on your machine.
- Running Backend Server (`backend-pnb`)

### Setup

1. **Clone & Navigate**
   ```bash
   git clone <repository-url>
   cd mobile
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure API Endpoints**
   Update your local IP address in the relevant `services/api.js` or `.env` configuration so the mobile device can communicate with your local backend server.

---

## 🏃 Running the Application

### Start the Expo Development Server
```bash
npx expo start
```

- **Physical Device**: Open the Expo Go app on your phone and scan the QR code generated in your terminal.
- **iOS Simulator**: Press `i` in the terminal.
- **Android Emulator**: Press `a` in the terminal.
- **Web**: Press `w` in the terminal to view in a browser (if configured).

---

## 📊 Application Modules & Screens

### Authentication (`/app/(auth)`)
- **Login**: Email and password entry.
- **OTP**: 2FA verification.

### Main Navigation (`/app/(tabs)`)
- **Dashboard (`index`)**: High-level overview, metric cards, and charts.
- **Scan**: Initiate new scans and track ongoing audit processes.
- **Results & History**: Review past scan logs and deep-dive into specific asset vulnerabilities.
- **CBOM & Inventory**: Cryptographic Bill of Materials viewer and full cipher inventory breakdown.
- **Reporting**:
  - **Executive**: View high-level CISO summary metrics.
  - **On-Demand**: Trigger immediate email dispatch of PDF reports.
  - **Scheduled**: Manage node-cron report schedules.
- **More**: Additional settings, user profile, and logout functionality.

---

## 👤 Team

- **Author:** InfiniTech
- **Event:** PNB Hackathon 2026
