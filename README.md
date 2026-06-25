# Auris - Step Inside The Sound 🎧

Auris is a cutting-edge, immersive web application that delivers a spatial audio experience right in your browser. Built with modern web technologies, it allows users to experience 3D sound positioning, real-time room physics simulation, and binaural audio—no specialized hardware required.

## 🌟 Key Features

- **HRTF Binaural Audio:** High-fidelity spatial audio rendering that mimics human hearing.
- **3D Sound Positioning:** Move audio sources around your virtual head in real-time.
- **Room Physics Simulation:** Adjust room size, damping, and wet/dry mix with dynamically generated Impulse Responses (IR).
- **Progressive Web App (PWA):** Installable on both desktop and mobile devices for a native-like experience.
- **Head Tracking & Haptics:** Advanced progressive enhancements for supported devices, making the audio experience even more immersive.
- **Real-Time Visualizers:** Beautiful, responsive UI with waveform and room spatial visualizers.

## 🛠️ Tech Stack

- **Framework:** React 19 + Vite
- **Styling:** TailwindCSS v4, Framer Motion for fluid animations
- **State Management:** Zustand
- **Audio Processing:** Web Audio API, custom AudioEngine, Synthetic IR Generation
- **Type Safety:** TypeScript

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/auris.git
   cd auris
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

### Build for Production

To create a production-ready build:
```bash
npm run build
```
You can then preview the build with:
```bash
npm run preview
```

## 💡 Usage Note

For the best experience, **please use headphones**. Auris relies on binaural rendering which requires stereo separation to properly simulate 3D space.

## 📸 Screenshots

*(Add screenshots of the Control Panel, Room Visualizer, and Room Physics here)*

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/auris/issues).

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
