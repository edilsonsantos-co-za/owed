// Builds the demo video: voice-over per shot, a scripted screen recording of the running app paced to
// that voice-over, then ffmpeg stitches each shot's footage to its narration.
//
//   npm run video                       everything (voice -> record -> build)
//   npm run video -- --step=voice|record|build
//
// Voice source (VOICE env): "files" uses your own recordings in video/voice/<shot>.wav (best),
// "elevenlabs" needs ELEVENLABS_API_KEY (+ optional ELEVENLABS_VOICE_ID), "say" uses macOS TTS (draft).
// The app must be running at VIDEO_BASE_URL (default http://localhost:3000) with an Anthropic key set.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { SHOTS as ALL_SHOTS, sleep } from './shots';

const ROOT = path.join(process.cwd(), 'video');
const OUT = path.join(ROOT, 'out');
const AUDIO = path.join(OUT, 'audio');
const CLIPS = path.join(OUT, 'clips');
const VOICE = process.env.VOICE ?? 'say';
const BASE_URL = process.env.VIDEO_BASE_URL ?? 'http://localhost:3000';
const GAP = 0.5; // seconds of breathing room after each line
// VIDEO_SHOTS=title,dashboard limits a run to some shots (handy while rehearsing).
const SHOTS = process.env.VIDEO_SHOTS ? ALL_SHOTS.filter((s) => process.env.VIDEO_SHOTS!.split(',').includes(s.id)) : ALL_SHOTS;
const step = process.argv.find((a) => a.startsWith('--step='))?.split('=')[1];

const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const duration = (file: string) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());

async function voice() {
  mkdirSync(AUDIO, { recursive: true });
  for (const shot of SHOTS) {
    const wav = path.join(AUDIO, `${shot.id}.wav`);
    if (VOICE === 'files') {
      const src = path.join(ROOT, 'voice', `${shot.id}.wav`);
      if (!existsSync(src)) throw new Error(`Missing your recording: ${src}`);
      run('ffmpeg', ['-y', '-i', src, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '1', wav]);
    } else if (VOICE === 'elevenlabs') {
      const voiceId = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: shot.narration, model_id: 'eleven_multilingual_v2' }),
      });
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
      const mp3 = path.join(AUDIO, `${shot.id}.mp3`);
      writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
      run('ffmpeg', ['-y', '-i', mp3, '-ar', '48000', '-ac', '1', wav]);
    } else {
      const aiff = path.join(AUDIO, `${shot.id}.aiff`);
      run('say', ['-v', process.env.SAY_VOICE ?? 'Samantha', '-r', '185', '-o', aiff, shot.narration]);
      run('ffmpeg', ['-y', '-i', aiff, '-ar', '48000', '-ac', '1', wav]);
    }
    console.log(`voice  ${shot.id.padEnd(10)} ${duration(wav).toFixed(1)}s`);
  }
  const total = SHOTS.reduce((a, s) => a + duration(path.join(AUDIO, `${s.id}.wav`)) + GAP, 0);
  console.log(`narration total ${total.toFixed(1)}s (limit 180s)`);
}

async function record() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  const started = Date.now();
  const marks: { id: string; start: number; end: number }[] = [];

  for (const shot of SHOTS) {
    const audio = duration(path.join(AUDIO, `${shot.id}.wav`)) + GAP;
    const start = (Date.now() - started) / 1000;
    await shot.run(page, { baseUrl: BASE_URL });
    // Non-fast shots stay on screen at least as long as their narration.
    const elapsed = (Date.now() - started) / 1000 - start;
    if (!shot.fast && elapsed < audio) await sleep((audio - elapsed) * 1000);
    marks.push({ id: shot.id, start, end: (Date.now() - started) / 1000 });
    console.log(`record ${shot.id.padEnd(10)} ${start.toFixed(1)}s → ${marks.at(-1)!.end.toFixed(1)}s`);
  }
  const video = page.video();
  await context.close();
  await browser.close();
  const file = await video!.path();
  writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify({ file, marks }, null, 2));
}

function build() {
  mkdirSync(CLIPS, { recursive: true });
  const { file, marks } = JSON.parse(readFileSync(path.join(OUT, 'marks.json'), 'utf8')) as {
    file: string;
    marks: { id: string; start: number; end: number }[];
  };
  const list: string[] = [];
  for (const mark of marks) {
    const shot = SHOTS.find((s) => s.id === mark.id)!;
    const wav = path.join(AUDIO, `${mark.id}.wav`);
    const target = duration(wav) + GAP;
    const footage = mark.end - mark.start;
    // Long agent runs are sped up to fit their line (never more than 8x, so the work stays legible).
    const speed = shot.fast && footage > target ? Math.min(8, footage / target) : 1;
    const shown = footage / speed;
    const pad = Math.max(0, target - shown);
    const clip = path.join(CLIPS, `${mark.id}.mp4`);
    run('ffmpeg', [
      '-y',
      '-ss', mark.start.toFixed(3),
      '-to', mark.end.toFixed(3),
      '-i', file,
      '-i', wav,
      '-filter_complex',
      `[0:v]setpts=(PTS-STARTPTS)/${speed.toFixed(3)},tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)},fps=30,scale=1920:1080,format=yuv420p[v];[1:a]apad=pad_dur=${GAP}[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-t', Math.max(target, shown).toFixed(3),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
      clip,
    ]);
    list.push(`file '${clip}'`);
    console.log(`clip   ${mark.id.padEnd(10)} ${Math.max(target, shown).toFixed(1)}s${speed > 1 ? ` (${speed.toFixed(1)}x)` : ''}`);
  }
  const listFile = path.join(CLIPS, 'list.txt');
  writeFileSync(listFile, list.join('\n'));
  const final = path.join(OUT, 'owed-demo.mp4');
  run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', final]);
  console.log(`\n${final}  ${duration(final).toFixed(1)}s`);
}

(async () => {
  if (!step || step === 'voice') await voice();
  if (!step || step === 'record') await record();
  if (!step || step === 'build') build();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
