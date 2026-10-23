# Prince Benedict Wachira — Portfolio

Personal portfolio site for **Prince Benedict Wachira** — software engineer and DevOps practitioner based in Nairobi, Kenya.

Built as a single-page React application with a minimalist black-and-white, industrial aesthetic. Focused on backend engineering, cloud-native infrastructure, and mobile development.

---
## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [React](https://react.dev/) |
| Build tool | [Vite](https://vite.dev/) |
| Language | JavaScript (JSX) |
| Styling | Plain CSS (custom properties, grid, flex) |
| Fonts | JetBrains Mono, Space Grotesk (Google Fonts) |
| Linting | ESLint |

No UI framework, no CSS-in-JS, no component library — the design is hand-built to keep the bundle small and the visual language consistent.

---

## Features

- **Sticky navigation** with anchor links to each section
- **Hero** with positioning statement, capability tags, and CV download
- **About** — backend/DevOps-focused professional summary
- **Experience timeline** — Loomlights, Cray Group, OpenCrafts
- **Filterable project list** — All / Backend / DevOps / Distributed Systems / Mobile
- **Featured project breakdown** — Challenge / Implementation / Engineering Considerations
- **Architecture patterns** — API, asynchronous processing, and deployment flows as ASCII diagrams
- **Infrastructure section** — CI/CD & GitOps, containers & orchestration, observability & recovery
- **Engineering principles** — four cards describing approach
- **Categorized skills** — Backend, DevOps, Messaging & Automation, Mobile & Frontend
- **Education & certifications**
- **Contact** — email, GitHub, LinkedIn, CV download

### Design details

- Black (`#0a0a0a`) base with white (`#f0f0f0`) text and a single ember accent (`#d4663a`)
- Scanline overlay via `repeating-linear-gradient` on `body::after`
- Hard 1px borders, no rounded corners, no shadows
- Hover-invert effect on cards and rows (background ↔ text color swap)
- Monospace for body, heavy grotesk for headings
- Keyboard focus states and `prefers-reduced-motion` support
