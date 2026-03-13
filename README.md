# Ansiversa Mini-App Starter

This repository is the official starter template for all **Ansiversa Mini-Apps**.  
Every app in the Ansiversa ecosystem begins with this structure—clean, fast, and consistent.

If you are a developer or contributor, you can use this template to build any app in the ecosystem.

---

## 🚀 Features

- **Astro 5** — blazing-fast frontend framework  
- **Tailwind CSS** — utility-first styling  
- **@ansiversa/components** — shared UI library for unified design  
- **Global Styles** — imported automatically from the components package  
- **Clean File Structure** — easy to extend for any type of app  
- **Ready for Deployment** — optimized for Vercel out of the box  

---

## 📁 Project Structure

```
app/
 ├── public/
 ├── src/
 │   ├── layouts/
 │   │   └── AppShell.astro
 │   └── pages/
 │       ├── index.astro
 │       └── login.astro
 ├── astro.config.mjs
 ├── package.json
 ├── tsconfig.json
 ├── postcss.config.cjs
 └── tailwind.config.cjs
```

---

## 🧩 Using Ansiversa Components

All apps share the same UI look and feel using:

```ts
import "@ansiversa/components/styles/global.css";
import { WebLayout, AuthLayout } from "@ansiversa/components";
```

This ensures:

- Perfect consistency across **100+ apps**
- Unified branding  
- Fully reusable layouts and UI blocks  

---

## ▶️ Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

`npm run dev` is pinned to `http://localhost:4321` with strict port mode.  
If that port is already used by another app/process, the command will fail fast instead of silently switching to another port.

Like `resume-builder`, the public landing page (`/`) and help page (`/help`) stay available locally without auth.
Protected app routes still redirect to the parent login, and in DEV the fallback parent URL is `http://localhost:2000` unless `PUBLIC_ROOT_APP_URL` is set.

If local auth is not available and requests are redirecting to the parent domain login, enable a DEV-only bypass in `.env`:

```bash
DEV_AUTH_BYPASS=true
DEV_AUTH_BYPASS_USER_ID=01e5cef7-b18d-4616-999c-454175356c24
DEV_AUTH_BYPASS_EMAIL=ansiversa-demo@local
DEV_AUTH_BYPASS_NAME=Ansiversa Demo
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## 🌐 Deployment

Ansiversa apps are optimized for **Vercel**:

- No configuration required
- Astro server output ready
- CI/CD supported automatically

Just link your repo to Vercel → deploy.

---

## 🔗 About Ansiversa

Ansiversa is a curated ecosystem of 100+ premium mini-apps designed for learning, productivity, writing, creativity, utilities, wellness, and more.

Each app shares:

- One global design language  
- One component system  
- One identity  
- Premium UX  

You are currently viewing the official **starter template** that powers all apps.

---

## 🤝 Contributing

If you wish to contribute to this template or suggest improvements, please open an issue or submit a pull request.

---

## 📄 License

MIT License — free to use and modify.
