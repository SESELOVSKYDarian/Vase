# Locución con más ánimo: Daniela (Piper) rápida y expresiva, con tono propio por frase.
import json, subprocess, sys, wave, re
import numpy as np
import tts
P, FF = sys.argv[1], sys.argv[2]
G = json.load(open(f"{P}/assets/vo/guion.json"))
SR = 48000
def load(path):
    with wave.open(path) as w: return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
def trim(x):
    hop = int(SR * 0.005); env = np.array([np.sqrt(np.mean(x[i:i+hop]**2)) for i in range(0, len(x), hop)])
    on = np.where(env > env.max() * 0.04)[0]
    a = max(0, on[0] * hop - int(SR * 0.015)); b = min(len(x), (on[-1] + 1) * hop + int(SR * 0.04))
    return x[a:b]
t = 0.15
track = np.zeros(SR * 90, dtype=np.float32)
phrases = []
for i, g in enumerate(G):
    tts.synth(g.get("say", g["t"]), "f.wav", length_scale=float(__import__("os").environ.get("LEN", "1.0")), noise=0.8, noise_w=1.0)
    ratio = 2 ** (g["st"] / 12)
    subprocess.run([FF, "-v", "error", "-y", "-i", "f.wav", "-af", f"asetrate={22050*ratio:.0f},aresample={SR},atempo={1/ratio:.5f}", "-ac", "1", "g.wav"], check=True)
    x = trim(load("g.wav"))
    s0 = int(t * SR); track[s0:s0+len(x)] += x
    d = len(x) / SR
    words = [w for w in re.findall(r"[\wáéíóúñü]+", g["t"], flags=re.I)]
    chars = [max(2, len(w)) for w in words]; tot = sum(chars) + 0.6 * len(words)
    wt, acc = [], t + 0.02
    for w, c in zip(words, chars):
        dur = (c + 0.6) / tot * (d - 0.05)
        wt.append({"w": w, "s": round(acc, 3), "e": round(acc + dur, 3)}); acc += dur
    phrases.append({"i": i, "text": g["t"], "s": round(t, 3), "e": round(t + d, 3), "words": wt})
    print(f"{i:2d} {t:6.2f}-{t+d:6.2f}s  {g['t']}")
    t += d + g["gap"]
total = t
track = track[: int(SR * (total + 0.2))]
track = track / np.abs(track).max() * 0.95
with wave.open(f"{P}/assets/vo/voz.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((track * 32767).astype(np.int16).tobytes())
json.dump({"duration": round(total, 2), "phrases": phrases}, open(f"{P}/assets/vo/timing.json", "w"), ensure_ascii=False, indent=1)
print("duración total", round(total, 2))
