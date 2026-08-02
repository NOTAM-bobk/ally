# Ally — Hydration Buddy 💧

# go to https://datatool.edgeone.app for auto redrect for quick access!!! 

A playful, handwritten-style hydration tracker built with React, Vite, Tailwind CSS, and Framer Motion.

## File structure

```
ally-app/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── src/
    ├── main.jsx        # React entry point
    ├── index.css        # Tailwind + global styles
    ├── App.jsx           # Main dashboard + screen state machine
    ├── Onboarding.jsx    # Intro carousel, name input, account creation
    ├── Account.jsx       # Account screen (placeholder — edit freely)
    └── Insights.jsx      # Insights screen (placeholder — edit freely)
```

## Running locally (if you ever get to a computer)

```bash
npm install
npm run dev
```

---

## 📱 Deploying from your phone (GitHub + Vercel), no computer needed

You have two solid options. **Option A** is fastest if your phone can unzip files and your
mobile browser supports folder upload. **Option B** always works, no zip required.

### Option A — Unzip and drag-upload

1. Download the `ally-app.zip` file from this chat.
2. Open it with your phone's built-in file manager (Files app on iPhone, or Files by Google /
   your device's Files app on Android) and choose **Extract** / **Unzip**. You should end up with
   a folder called `ally-app`.
3. Go to **github.com** in your mobile browser and log in.
4. Tap the **+** icon → **New repository**. Name it `ally-app`, keep it Public or Private, and
   create it **without** a README (so it starts empty).
5. On the new repo's page, tap **"uploading an existing file"** (or Add file → Upload files).
6. Tap the upload box — most mobile browsers let you pick **"Browse"** and then select a whole
   folder. Select the `ally-app` folder (or select all files/subfolders at once) so the `src/`
   folder structure is preserved.
7. Scroll down and tap **Commit changes**.

If your browser's file picker won't let you select folders, use Option B for the `src/` files.

### Option B — Create each file by hand (always works, no zip needed)

GitHub's web "Create new file" box lets you type a path with slashes (like `src/App.jsx`) and
it will automatically create the folder for you. This is a very reliable mobile-only method:

1. On github.com, create a new empty repository named `ally-app`.
2. Tap **Add file → Create new file**.
3. In the filename box, type `package.json`, then paste the contents of that file below it, and
   tap **Commit changes**. Repeat for each file:
   - `index.html`
   - `vite.config.js`
   - `tailwind.config.js`
   - `postcss.config.js`
   - `.gitignore`
   - `src/main.jsx`
   - `src/index.css`
   - `src/App.jsx`
   - `src/Onboarding.jsx`
   - `src/Account.jsx`
   - `src/Insights.jsx`
4. Once every file is committed, your repo is ready.

### Connecting Vercel

1. Go to **vercel.com** on your phone and sign in (you can sign in with your GitHub account).
2. Tap **Add New → Project**.
3. Vercel will list your GitHub repos — tap **Import** next to `ally-app`.
4. Vercel auto-detects the **Vite** framework preset. Leave the default build settings
   (Build Command: `vite build`, Output Directory: `dist`).
5. Tap **Deploy**. In about a minute you'll get a live `.vercel.app` URL you can open right on
   your phone.

Any time you edit a file directly on GitHub (tap the pencil icon on any file → edit → commit),
Vercel will automatically redeploy your changes within a minute or two — your whole workflow can
stay on your phone from here on out.

---

## Customizing

- **Colors, fonts, shadows** live in `tailwind.config.js` under `theme.extend`.
- **Daily goal / step size** are set as constants near the top of `App.jsx` (`STEP`, `PRESETS`,
  and the `goal` state).
- **Account.jsx** and **Insights.jsx** are intentionally simple placeholders — swap in real data
  and settings whenever you're ready.
