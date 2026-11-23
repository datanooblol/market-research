# Journal (mock, no backend)

Mobile-first chronological journal built from the design canvas:
https://claude.ai/artifact/Se3cF714xTEpyX3sB8soz8

- Next.js 15 (App Router) + TypeScript, no backend.
- Entries are stored in the browser's **localStorage**, so each phone/browser has its own data.
- Every entry is stamped `yyyy-mm-dd hh:mm:ss` the moment you tap **New entry** or the mic.

## Screens

| Route | What it does |
| --- | --- |
| `/` | Timeline grouped by day, New entry, gold mic, "Add sample entries" when empty |
| `/entry/[id]` | Write / edit with autosave, Dictate, #tags, ••• actions (copy, delete) |
| `/record` | Live dictation (Safari speech recognition) → review → save as a voice entry |
| `/record?append=<id>` | Dictate and append to an existing entry |
| `/search` | Full-text search (all words must match) + filters: date range, typed/voice, tag; ••• → Open/Edit/Copy/Delete with Undo |
| `/summary/[date]` | **Mock** day summary made on the device (no AI yet); can be saved as an entry |

## Dictation on iPhone Safari

Uses the Web Speech API (`webkitSpeechRecognition`, Safari on iOS 14.5+). Code: `lib/useSpeech.ts`.

Requirements:
- The page must be served over **HTTPS** (Amplify gives you this). Plain `http://192.168.x.x:3000` will not get mic access.
- iPhone **Settings › General › Keyboard › Enable Dictation** must be on (Safari's recognition uses it).
- Allow the microphone when Safari asks.
- Choose **EN** or **TH** in the top right of the record screen.

Behaviour:
- Safari ends recognition after silence or roughly a minute; the app restarts it automatically and keeps one transcript.
- Grey words are interim results; they are kept if you stop mid-sentence.
- If live dictation isn't available, **Type instead** opens the editor so you can use the keyboard's mic.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000 (desktop browser testing)
npm run build && npm start
```

## Deploy to AWS Amplify Hosting

1. Push this folder to a Git repo (GitHub, GitLab, Bitbucket or CodeCommit).
2. In the AWS console: **Amplify › Create new app › Deploy from Git**, pick the repo and branch.
   If the app is in a subfolder of the repo, tick **"My app is a monorepo"** and set the root to that folder.
3. Amplify detects Next.js and uses `amplify.yml` from this folder (Node 20, `npm ci`, `npm run build`, output `.next`).
4. Deploy, then open the `https://<branch>.<id>.amplifyapp.com` URL on your iPhone in Safari.

Tip: in Safari, Share › **Add to Home Screen** makes it open full screen like an app.
