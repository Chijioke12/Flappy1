
"""
FLAPPY BIRD COMPLETE ASSET GENERATOR
Pure Python - no external images or sounds needed
Requirements: pip install Pillow numpy

Generates:
  graphics/ - bird_up/mid/down.png, bird_spritesheet.png, bird_flap.gif
              pipe_top/bottom.png, base.png, background_day/night.png, preview_scene.png
  sounds/   - wing.wav, point.wav, hit.wav, die.wav, swoosh.wav
"""
from PIL import Image, ImageDraw
import numpy as np
import wave, os
from pathlib import Path

# ================= CONFIG =================
OUT_DIR = Path("flappy_assets")
GRAPHICS_DIR = OUT_DIR
SOUNDS_DIR = OUT_DIR / "sounds"
SR = 44100  # audio sample rate

# ================= GRAPHICS HELPERS =================
def vertical_gradient(w, h, top_color, bottom_color):
    img = Image.new("RGBA", (w, h), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / (h-1)
        r = int(top_color[0]*(1-t) + bottom_color[0]*t)
        g = int(top_color[1]*(1-t) + bottom_color[1]*t)
        b = int(top_color[2]*(1-t) + bottom_color[2]*t)
        draw.line([(0,y),(w,y)], fill=(r,g,b,255))
    return img

def draw_bird(wing_state="mid", size=128):
    """wing_state: up, mid, down - 3 animation frames"""
    img = Image.new("RGBA", (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    YELLOW = (255, 219, 0, 255)
    YELLOW_DARK = (230, 172, 0, 255)
    YELLOW_LIGHT = (255, 240, 120, 255)
    OUTLINE = (0,0,0,255)
    WHITE = (255,255,255,255)
    BEAK = (255, 124, 0, 255)
    BLUSH = (255, 105, 180, 180)

    # tail (behind)
    draw.polygon([(22, 66), (8, 58), (8, 76)], fill=YELLOW_DARK, outline=OUTLINE, width=3)
    # body
    draw.ellipse((24, 28, 104, 96), fill=YELLOW, outline=OUTLINE, width=4)
    draw.ellipse((30, 34, 70, 62), fill=YELLOW_LIGHT) # highlight
    draw.ellipse((32, 58, 90, 94), fill=WHITE, outline=OUTLINE, width=2) # belly

    # wing - 3 positions
    if wing_state == "up":
        points = [(18, 38), (58, 30), (60, 50), (22, 58)]
        detail = [(28, 46), (52, 42)]
    elif wing_state == "mid":
        points = [(22, 50), (64, 48), (62, 74), (24, 76)]
        detail = [(32, 60), (54, 60)]
    else: # down
        points = [(26, 64), (68, 68), (60, 90), (28, 86)]
        detail = [(34, 74), (56, 76)]

    draw.polygon(points, fill=YELLOW_DARK, outline=OUTLINE, width=3)
    draw.line(detail, fill=OUTLINE, width=2)

    # beak
    draw.polygon([(86, 54), (118, 64), (86, 74)], fill=BEAK, outline=OUTLINE, width=3)
    draw.line([(86,64),(104,64)], fill=OUTLINE, width=2)

    # eye
    draw.ellipse((60, 32, 94, 66), fill=WHITE, outline=OUTLINE, width=3)
    pupil_y = 40 if wing_state=="up" else 44
    draw.ellipse((70, pupil_y, 88, pupil_y+18), fill=OUTLINE)
    draw.ellipse((74, 44, 82, 52), fill=WHITE) # highlight
    draw.ellipse((52, 64, 64, 72), fill=BLUSH) # cheek

    return img

def draw_pipe_bottom(width=104, height=640, cap_h=42):
    cap_w = width + 16
    over = (cap_w - width)//2
    img = Image.new("RGBA", (cap_w, height), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    GREEN = (115, 191, 46, 255)
    GREEN_DARK = (76, 140, 30, 255)
    GREEN_LIGHT = (168, 233, 79, 255)
    OUTLINE = (0,0,0,255)
    GREEN_SHADOW = (58, 95, 11, 255)

    # body
    draw.rectangle([over, cap_h, over+width, height], fill=GREEN, outline=OUTLINE, width=4)
    draw.rectangle([over+4, cap_h, over+18, height], fill=GREEN_LIGHT)
    draw.rectangle([over+width-14, cap_h, over+width-4, height], fill=GREEN_DARK)
    for x in [over+28, over+48, over+68]:
        draw.line([(x, cap_h),(x, height)], fill=GREEN_SHADOW, width=2)
    # cap
    draw.rectangle([0, 0, cap_w, cap_h], fill=GREEN, outline=OUTLINE, width=4)
    draw.rectangle([4, 4, 18, cap_h-4], fill=GREEN_LIGHT)
    draw.rectangle([cap_w-14, 4, cap_w-4, cap_h-4], fill=GREEN_DARK)
    return img

def draw_pipe_top(width=104, height=640, cap_h=42):
    return draw_pipe_bottom(width, height, cap_h).transpose(Image.FLIP_TOP_BOTTOM)

def draw_base(width=448, height=112):
    img = Image.new("RGBA", (width, height), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    GROUND = (222, 216, 149, 255)
    GROUND_DARK = (193, 186, 120, 255)
    GRASS_LIGHT = (126, 211, 33, 255)
    GRASS_DARK = (85, 170, 20, 255)
    OUTLINE = (0,0,0,255)
    draw.rectangle([0, 20, width, height], fill=GROUND, outline=OUTLINE, width=4)
    for x in range(0, width, 32):
        for y in range(36, height, 24):
            draw.ellipse([x+8, y, x+16, y+6], fill=GROUND_DARK)
    draw.rectangle([0,0,width,24], fill=GRASS_LIGHT, outline=OUTLINE, width=4)
    for x in range(0, width, 16):
        draw.polygon([(x,24), (x+4,12), (x+8,24)], fill=GRASS_DARK, outline=OUTLINE, width=1)
        draw.polygon([(x+8,24), (x+12,14), (x+16,24)], fill=GRASS_LIGHT, outline=OUTLINE, width=1)
    return img

def draw_background_day(w=288, h=512):
    img = vertical_gradient(w, h, (112,197,206), (222,239,255))
    draw = ImageDraw.Draw(img)
    for cx, cy, cw, ch in [(40,80,90,40),(180,100,100,45),(60,180,80,35),(200,200,70,30)]:
        draw.ellipse([cx, cy, cx+cw, cy+ch], fill=(255,255,255,200))
        draw.ellipse([cx-15, cy+10, cx+cw-20, cy+ch+10], fill=(255,255,255,200))
    return img

def draw_background_night(w=288, h=512):
    import random
    random.seed(0)
    img = vertical_gradient(w, h, (11,11,46), (58,58,106))
    draw = ImageDraw.Draw(img)
    for _ in range(40):
        x, y = random.randint(0,w), random.randint(0, int(h*0.6))
        draw.ellipse([x,y,x+2,y+2], fill=(255,255,200,200))
    draw.ellipse([200,50,240,90], fill=(255,255,200,230))
    return img

def generate_graphics():
    GRAPHICS_DIR.mkdir(parents=True, exist_ok=True)
    SOUNDS_DIR.mkdir(parents=True, exist_ok=True)

    frames = {s: draw_bird(s, 128) for s in ["up","mid","down"]}
    for k,v in frames.items():
        v.save(GRAPHICS_DIR / f"bird_{k}.png")

    sheet = Image.new("RGBA", (128*3, 128), (0,0,0,0))
    for i, s in enumerate(["up","mid","down"]):
        sheet.paste(frames[s], (i*128,0), frames[s])
    sheet.save(GRAPHICS_DIR / "bird_spritesheet.png")

    gif_frames = [frames["up"], frames["mid"], frames["down"], frames["mid"]]
    gif_small = [f.resize((96,96), Image.LANCZOS) for f in gif_frames]
    gif_small[0].save(GRAPHICS_DIR / "bird_flap.gif", save_all=True, append_images=gif_small[1:], duration=120, loop=0, disposal=2)

    draw_pipe_bottom().save(GRAPHICS_DIR / "pipe_bottom.png")
    draw_pipe_top().save(GRAPHICS_DIR / "pipe_top.png")
    draw_base().save(GRAPHICS_DIR / "base.png")
    draw_background_day().save(GRAPHICS_DIR / "background_day.png")
    draw_background_night().save(GRAPHICS_DIR / "background_night.png")
    print(f"Graphics saved to {GRAPHICS_DIR}")

# ================= SOUNDS HELPERS =================
def save_wav(path, audio, sr=SR):
    audio = np.clip(audio, -1, 1)
    audio_int16 = (audio * 32767).astype(np.int16)
    with wave.open(str(path), 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(audio_int16.tobytes())

def envelope_adsr(n, a=0.01, d=0.05, s=0.7, r=0.1, sr=SR):
    a_n, d_n, r_n = int(a*sr), int(d*sr), int(r*sr)
    s_n = max(0, n - a_n - d_n - r_n)
    env = np.zeros(n)
    if a_n>0: env[:a_n] = np.linspace(0,1,a_n)
    if d_n>0: env[a_n:a_n+d_n] = np.linspace(1,s,d_n)
    env[a_n+d_n:a_n+d_n+s_n] = s
    if r_n>0: env[a_n+d_n+s_n:] = np.linspace(s,0,r_n)
    return env

def make_wing():
    dur=0.12
    t=np.linspace(0,dur,int(SR*dur),False)
    freq=np.linspace(250,750,len(t))
    phase=2*np.pi*np.cumsum(freq)/SR
    wave=np.sin(phase)
    env=np.exp(-t*18)*(1-np.exp(-t*80))
    return wave*env*0.8

def make_point():
    t1=np.linspace(0,0.08,int(SR*0.08),False)
    t2=np.linspace(0,0.18,int(SR*0.18),False)
    tone1=np.sin(2*np.pi*800*t1)*np.exp(-t1*6)
    tone2=np.sin(2*np.pi*1200*t2)*envelope_adsr(len(t2),a=0.005,d=0.02,s=0.6,r=0.08)
    tone2+=0.3*np.sin(2*np.pi*2400*t2)*envelope_adsr(len(t2),a=0.005,d=0.02,s=0.4,r=0.08)
    return np.concatenate([tone1, np.zeros(int(SR*0.02)), tone2])*0.6

def make_hit():
    dur=0.25
    t=np.linspace(0,dur,int(SR*dur),False)
    base=np.sin(2*np.pi*120*t)*np.exp(-t*12)+0.4*np.sin(2*np.pi*60*t)*np.exp(-t*8)
    noise=np.random.uniform(-1,1,len(t))*np.exp(-t*30)*0.5
    audio=np.tanh((base+noise)*1.5)
    return audio*0.8

def make_die():
    dur=0.7
    t=np.linspace(0,dur,int(SR*dur),False)
    freq=600*(80/600)**(t/dur)
    phase=2*np.pi*np.cumsum(freq)/SR
    audio=np.sin(phase)+0.3*np.sign(np.sin(phase))
    audio*=envelope_adsr(len(t),a=0.01,d=0.1,s=0.5,r=0.25)*np.exp(-t*0.5)
    return audio*0.7

def make_swoosh():
    dur=0.3
    t=np.linspace(0,dur,int(SR*dur),False)
    noise=np.random.uniform(-1,1,len(t))
    f=np.linspace(900,200,len(t))
    carrier=np.sin(2*np.pi*np.cumsum(f)/SR)
    audio=noise*0.4+carrier*0.6
    env=np.sin(np.pi*np.linspace(0,1,len(t)))**0.8
    return audio*env*0.6

def generate_sounds():
    SOUNDS_DIR.mkdir(parents=True, exist_ok=True)
    for name, func in [("wing.wav",make_wing),("point.wav",make_point),("hit.wav",make_hit),("die.wav",make_die),("swoosh.wav",make_swoosh)]:
        save_wav(SOUNDS_DIR/name, func())
    print(f"Sounds saved to {SOUNDS_DIR}")

if __name__ == "__main__":
    generate_graphics()
    generate_sounds()
    print("All Flappy assets generated!")
