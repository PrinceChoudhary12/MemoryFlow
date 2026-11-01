# MemoryFlow — Dynamic Memory Management Visualizer

> An interactive Operating Systems Laboratory & Visualizer built for College CA2 Evaluation.

[![React](https://img.shields.io/badge/React-19.3-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.3-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Overview

**MemoryFlow** is an educational operating systems software tool designed to simulate and visualize primary memory management mechanisms in modern computer systems. Instead of calculating memory offsets on paper, students and evaluators can interactively step through address translation pipelines, inspect page tables, track frame allocations, and benchmark page replacement algorithms.

---

## 🚀 Key Modules & Curriculum Coverage

| Module | Version | OS Concept & Highlights |
| :--- | :--- | :--- |
| **Paging Simulator** | `v0.2.0` | Logical Address Translation $(p, d) \rightarrow (f, d)$, dynamic Page Tables, internal fragmentation. |
| **Segmentation Simulator** | `v0.3.0` | Base & Limit registers, boundary checking, and hardware memory protection traps. |
| **Virtual Memory Lab** | `v0.4.0` | Secondary storage swap backing, demand paging, valid/invalid bits, and Page Fault interrupts. |
| **Page Replacement Studio** | `v0.5.0` | Step-by-step benchmark of **FIFO** vs **LRU**, hit/miss counters, and Belady’s Anomaly demonstration. |
| **Dynamic Memory Allocation**| `v0.6.0` | **First Fit**, **Best Fit**, and **Worst Fit** strategies with free hole coalescing visualization. |
| **Analytics & Comparison** | `v0.7.0` | Recharts hit-rate telemetry, algorithmic comparison charts, and log exports. |

---

## 🎨 Theme Architecture

MemoryFlow features 4 distinct visual themes with zero-flicker CSS variable switching and persistent local storage:
1. **Midnight (Default)**: Deep obsidian cyber lab aesthetic with cyan/violet neon glow.
2. **Light**: Crisp high-contrast daylight mode suited for presentations and lecture halls.
3. **Graphite**: Industrial matte slate with amber read indicators.
4. **Aurora**: Vibrant northern-lights inspired emerald and magenta gradients.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19 + TypeScript (strict mode)
- **Bundler**: Vite 8 with fast HMR
- **Styling**: Tailwind CSS v4 + Custom Glassmorphism UI tokens
- **Icons**: Lucide React
- **Visual Analytics**: Recharts
- **Testing Engine**: Vitest unit testing suite

---

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/PrinceChoudhary12/MemoryFlow.git
cd MemoryFlow
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run automated test suite
```bash
npm run test
```

### 5. Build for production
```bash
npm run build
```

---

## 👤 Author
- **Student**: Prince Choudhary
- **GitHub**: [@PrinceChoudhary12](https://github.com/PrinceChoudhary12)
- **Course**: Operating Systems — CA2 Project Evaluation
