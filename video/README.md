# Demo video

`npm run video` produces `video/out/owed-demo.mp4` (1080p, under 3 minutes) from `shots.ts`:
narration per shot, a Playwright recording of the real app paced to it, and ffmpeg to stitch them.

1. Run the app as a **production build** so Next's dev overlay is not in shot:
   `npm run build && npm start` (with `ANTHROPIC_API_KEY`, PayPal sandbox keys, and ideally
   `AG_STUDIO_LICENSE_KEY` so there is no watermark). Seed the sandbox first with `npm run seed`.
2. Pick a voice:
   - `VOICE=files` – your own voice (recommended). Record each line in `shots.ts` as
     `video/voice/<shot-id>.wav` (title, dashboard, clients, brief, chase, approve, build, how, close).
   - `VOICE=elevenlabs ELEVENLABS_API_KEY=...` (optional `ELEVENLABS_VOICE_ID`).
   - `VOICE=say` – macOS text-to-speech, fine for a rough cut.
3. `VIDEO_BASE_URL=http://localhost:3000 VOICE=files npm run video`

Steps can be re-run on their own: `--step=voice`, `--step=record`, `--step=build`; `VIDEO_SHOTS=title,close`
limits a run to some shots. Agent shots (`chase`, `build`) are sped up to fit their line, at most 8×.

Upload the result to YouTube as **Public** and paste the link into the Devpost form. No music is added, so
there is nothing third-party to clear.
