# Natural narration with Kokoro (open-weight neural TTS, runs locally, no API key).
#   uv run --with kokoro-onnx --with soundfile python video/tts.py out.wav "text"
# Model files: ~/.cache/kokoro/kokoro-v1.0.onnx and voices-v1.0.bin (see video/README.md).
import os
import sys

import soundfile as sf
from kokoro_onnx import Kokoro

home = os.path.expanduser(os.environ.get('KOKORO_DIR', '~/.cache/kokoro'))
k = Kokoro(f'{home}/kokoro-v1.0.onnx', f'{home}/voices-v1.0.bin')
samples, rate = k.create(
    sys.argv[2],
    voice=os.environ.get('KOKORO_VOICE', 'af_heart'),
    speed=float(os.environ.get('KOKORO_SPEED', '1.0')),
    lang='en-us',
)
sf.write(sys.argv[1], samples, rate)
