# ⚽ Tournament Match Tracker Engine (v3)

An interactive, tournament management system built with **React**, **Tailwind CSS**, and optimized for fast processing. The engine handles group stage mathematics, real-time standings generation, and transitions into a **randomized knockout playoff tier** with built-in state persistence.

---

## 🏆 Tournament Architecture & Rules

The engine handles 9 players across 3 distinct phases, completely automating tie-breakers and fixtures.

### 1. Group Stage
* **Roster Allocation:** 9 players are scrambled and distributed evenly into 3 groups (Group A, Group B, Group C).
* **Round Robin:** Managers play a 3-match fixture circuit per group.
* **Point Rules:** 3 Points for a win, 1 Point for a draw, 0 Points for a loss.
* **Tie-Breakers:** Standings are computed dynamically using **Points ➔ Goal Difference (GD) ➔ Alphabetical sorting**.

### 2. Playoff Advancements (The Top 6)
* The **Top 2 Global Seeds** (determined by group placement and point efficiency) earn an automatic bye week and are locked directly into the Semifinals.
* **Seeds 3, 4, 5, and 6** are grouped into a high-stakes Knockout Quarterfinals tier.

### 3. Knockout Elimination Phase
* **Randomized Fixtures:** The engine takes Seeds 3 through 6 and matches them completely at random into Quarterfinal 1 (QF1) and Quarterfinal 2 (QF2). 
* **State Locking:** This pairing logic locks securely into the application state to prevent bracket reshuffling during score entries or page reloads.
* **Single Elimination:** Bracket matches cannot end in a draw. A winner must advance to face the waiting top-seeded managers in the Semifinals, leading to the Grand Final Arena.

---

## 🛠️ Tech Stack & Key Modules

* **Frontend Framework:** React 18
* **Styling:** Tailwind CSS (Dark Mode / High-Contrast Neon Accents)
* **State Preservation:** Synchronized `localStorage` lifecycle trackers preventing accidental resets on browser refreshes.
* **Mathematical State Engine:** React `useMemo` hooks calculating global seeds and leaderboard arrays instantly upon score inputs.

---

## ⚡ Quick Start & Deployment
Prerequisite
Ensure you have Node.js (v18 or higher recommended) installed.

1. Installation
Clone your repository, navigate to the root directory, and install dependencies:

npm install

2. Local Development
Fire up the local development server to test tournament transitions:

npm run dev

3. Production Compilation
To build a highly optimized, minified bundle ready for server hosting:

npm run build

4. Direct Deployment
If utilizing GitHub Pages or a similar platform setup with your package.json configurations, deploy with:

npm run deploy

---

## 📂 Project Structure

```text
├── src/
│   ├── App.jsx        # Core application, scoring matrix, and knockout brackets
│   ├── main.jsx       # Application mount point
│   └── index.css      # Tailwind directives and root styles
├── package.json       # Dependencies and build script tasks
└── README.md          # Project documentation
