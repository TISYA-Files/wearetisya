# TİSYA — The Alliance

> **Join the movement.** TİSYA connects international students across Türkiye through collaboration, impact, and shared growth.

## About

TİSYA (Türkiye International Student Youth Alliance) is a student-led initiative that brings together international students to collaborate, volunteer, and create real impact. This web application serves as the official onboarding portal where new members choose their path and apply to join the Alliance.

## Roles

| Role | Description |
|---|---|
| **Pathfinder** | Discover opportunities, connect with peers, and navigate the TISYA network at your own pace. |
| **Pioneer** | Volunteer, contribute, and turn ideas into real impact as part of TISYA's programs and initiatives. |
| **Partner / Sponsor** | Collaborate with TISYA as an organization or sponsor to support impactful student initiatives. |
| **Ambassador** | Represent TISYA across your campus, city, or country *(coming soon)*. |
| **Intern** | Gain valuable experience and assist key projects *(coming soon)*. |

## Features

- **Immersive role selection** — Full-screen slanted panels with hover effects and sound feedback
- **Multi-step application forms** — Guided, validated forms tailored to each role
- **Animated progress tracking** — Step indicators, progress bars, and microcopy feedback
- **Agreement & consent flows** — Role-specific terms with scrollable overlay modals
- **Responsive design** — Optimized for both desktop and mobile devices
- **Sound design** — Ambient tones, hover sounds, and selection feedback
- **Dark-themed UI** — Premium glassmorphism aesthetic throughout

## Tech Stack

- **React** + **TypeScript** — Component-driven UI
- **Vite** — Fast build tooling and HMR
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Accessible, composable UI primitives
- **Framer Motion** — Animations and transitions
- **Lucide React** — Icon system

## Getting Started

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project
cd wearetisya

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Deploy to Cloudflare Workers

This project can be deployed directly with Wrangler and does not require a Git connection in Cloudflare. Authenticate once with `npx wrangler@4 login`, then run:

```sh
npm run deploy
```

For automated deployments, set `CLOUDFLARE_API_TOKEN` in the environment before running `npm run deploy`. The token needs permission to edit Workers and Pages, and the account must be selected if it is not already configured.

## Project Structure

```
src/
├── assets/            # Images, logos, role backgrounds
├── components/
│   ├── form-steps/    # Pioneer form step components
│   ├── member-form-steps/  # Pathfinder form step components
│   ├── shared/        # Shared components (progress bar, success screens, modals)
│   └── ui/            # shadcn/ui primitives
├── contexts/          # Sound and background effect providers
├── hooks/             # Custom hooks (sound feedback, mobile detection)
├── lib/               # Utilities, validation, form submission
└── pages/             # Route-level page components
```

## License

This project is proprietary to TİSYA. All rights reserved.
