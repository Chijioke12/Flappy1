
/*
 * Flappy Bird for KaiOS - Written in C
 * Targets: 
 *   1. Desktop (SDL2) for testing: gcc flappy.c -lSDL2 -lSDL2_image -lSDL2_mixer -lm
 *   2. KaiOS (WASM) via Emscripten: emcc flappy.c -s USE_SDL=2 -s USE_SDL_IMAGE=2 -s SDL2_IMAGE_FORMATS='["png"]' -s USE_SDL_MIXER=2 -s USE_SDL_MIXER_FORMATS='["wav"]' -o flappy.js
 *
 * KaiOS screen: 240x320, keys: ArrowUp/Enter = flap, SoftLeft = restart
 * Uses your Python-generated assets in assets/ folder
 */
#include <SDL2/SDL.h>
#include <SDL2/SDL_image.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <time.h>
#include <math.h>

typedef struct {
    Uint8 *buffer;
    Uint32 length;
} SoundEffect;

#define MAX_PLAYING_SOUNDS 8

typedef struct {
    SoundEffect snd;
    Uint32 play_cursor;
    bool active;
} PlayingSound;

PlayingSound playing_sounds[MAX_PLAYING_SOUNDS];
SDL_AudioDeviceID audio_device = 0;

void audio_callback(void *userdata, Uint8 *stream, int len) {
    SDL_memset(stream, 0, len);
    for (int i = 0; i < MAX_PLAYING_SOUNDS; i++) {
        if (!playing_sounds[i].active) continue;
        Uint32 remaining = playing_sounds[i].snd.length - playing_sounds[i].play_cursor;
        Uint32 bytes_to_write = (Uint32)len < remaining ? (Uint32)len : remaining;
        SDL_MixAudioFormat(stream, playing_sounds[i].snd.buffer + playing_sounds[i].play_cursor, AUDIO_S16LSB, bytes_to_write, SDL_MIX_MAXVOLUME);
        playing_sounds[i].play_cursor += bytes_to_write;
        if (playing_sounds[i].play_cursor >= playing_sounds[i].snd.length) {
            playing_sounds[i].active = false;
        }
    }
}

SoundEffect load_sound(const char* path, SDL_AudioSpec *target_spec) {
    SoundEffect snd = {NULL, 0};
    SDL_AudioSpec wav_spec;
    Uint8 *wav_buffer;
    Uint32 wav_length;
    
    if (SDL_LoadWAV(path, &wav_spec, &wav_buffer, &wav_length) == NULL) {
        printf("Failed to load WAV %s: %s\n", path, SDL_GetError());
        return snd;
    }
    
    SDL_AudioCVT cvt;
    if (SDL_BuildAudioCVT(&cvt, wav_spec.format, wav_spec.channels, wav_spec.freq,
                          target_spec->format, target_spec->channels, target_spec->freq) > 0) {
        cvt.len = wav_length;
        cvt.buf = (Uint8 *)SDL_malloc(cvt.len * cvt.len_mult);
        SDL_memcpy(cvt.buf, wav_buffer, wav_length);
        
        if (SDL_ConvertAudio(&cvt) == 0) {
            snd.buffer = cvt.buf;
            snd.length = cvt.len_cvt;
        } else {
            printf("Failed to convert audio for %s\n", path);
            SDL_free(cvt.buf);
        }
        SDL_FreeWAV(wav_buffer);
    } else {
        snd.buffer = wav_buffer;
        snd.length = wav_length;
    }
    return snd;
}

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#define SCREEN_W 240
#define SCREEN_H 320
#define BIRD_X 50
#define BIRD_W 34
#define BIRD_H 24
#define PIPE_W 52
#define PIPE_GAP 85
#define PIPE_SPEED 1.8f
#define GRAVITY 0.28f
#define FLAP_POWER -5.2f
#define BASE_H 28
#define PIPE_SPAWN_INTERVAL 1500 // ms
#define MAX_PIPES 4

typedef enum { STATE_MENU, STATE_PLAYING, STATE_GAMEOVER } GameState;

typedef struct {
    float x;
    float gap_y;
    bool scored;
    bool active;
} Pipe;

SDL_Window *window = NULL;
SDL_Renderer *renderer = NULL;
SDL_Texture *tex_bird[3];
SDL_Texture *tex_pipe_top, *tex_pipe_bottom, *tex_bg_day, *tex_base;
SoundEffect snd_wing, snd_point, snd_hit, snd_die;

GameState state = STATE_MENU;
float bird_y = 150;
float bird_vel = 0;
int bird_frame = 0;
Uint32 last_frame_time = 0;
Uint32 last_pipe_spawn = 0;
float base_scroll = 0;
int score = 0;
int best_score = 0;
Pipe pipes[MAX_PIPES];
int pipe_index = 0;

SDL_Texture* load_texture(const char* path) {
    SDL_Surface *surf = IMG_Load(path);
    if (!surf) {
        printf("Failed to load %s: %s\n", path, IMG_GetError());
        return NULL;
    }
    SDL_Texture *tex = SDL_CreateTextureFromSurface(renderer, surf);
    SDL_FreeSurface(surf);
    return tex;
}

void reset_game() {
    bird_y = SCREEN_H / 2 - 50;
    bird_vel = 0;
    score = 0;
    base_scroll = 0;
    last_pipe_spawn = SDL_GetTicks();
    for (int i=0;i<MAX_PIPES;i++) pipes[i].active = false;
    pipe_index = 0;
}

void spawn_pipe() {
    // find inactive pipe
    for (int i=0;i<MAX_PIPES;i++) {
        if (!pipes[i].active) {
            pipes[i].x = SCREEN_W + 10;
            // random gap_y between 60 and SCREEN_H - BASE_H - PIPE_GAP - 60
            int min_gap = 50;
            int max_gap = SCREEN_H - BASE_H - PIPE_GAP - 50;
            pipes[i].gap_y = min_gap + rand() % (max_gap - min_gap);
            pipes[i].scored = false;
            pipes[i].active = true;
            break;
        }
    }
}

void play_sound(SoundEffect snd) {
    if (!snd.buffer || snd.length == 0 || audio_device == 0) return;
    SDL_LockAudioDevice(audio_device);
    int slot = -1;
    for (int i = 0; i < MAX_PLAYING_SOUNDS; i++) {
        if (!playing_sounds[i].active) {
            slot = i;
            break;
        }
    }
    if (slot == -1) slot = 0;
    playing_sounds[slot].snd = snd;
    playing_sounds[slot].play_cursor = 0;
    playing_sounds[slot].active = true;
    SDL_UnlockAudioDevice(audio_device);
}

bool check_collision(float bx, float by, Pipe *p) {
    // bird rect
    SDL_Rect bird_rect = {(int)bx, (int)by, BIRD_W-6, BIRD_H-4};
    SDL_Rect top_rect = {(int)p->x, 0, PIPE_W, (int)p->gap_y};
    SDL_Rect bottom_rect = {(int)p->x, (int)(p->gap_y + PIPE_GAP), PIPE_W, SCREEN_H};
    return SDL_HasIntersection(&bird_rect, &top_rect) || SDL_HasIntersection(&bird_rect, &bottom_rect);
}

void handle_input() {
    SDL_Event e;
    while (SDL_PollEvent(&e)) {
        if (e.type == SDL_QUIT) {
#ifdef __EMSCRIPTEN__
            emscripten_cancel_main_loop();
#endif
            exit(0);
        }
        if (e.type == SDL_KEYDOWN) {
            // KaiOS keys: Up, Enter, SoftLeft (F1), SoftRight (F2)
            // Desktop: Space, Up, W
            if (e.key.keysym.sym == SDLK_UP || e.key.keysym.sym == SDLK_SPACE || 
                e.key.keysym.sym == SDLK_w || e.key.keysym.sym == SDLK_RETURN ||
                e.key.keysym.sym == SDLK_KP_ENTER) {
                if (state == STATE_MENU) {
                    state = STATE_PLAYING;
                    reset_game();
                } else if (state == STATE_PLAYING) {
                    bird_vel = FLAP_POWER;
                    play_sound(snd_wing);
                } else if (state == STATE_GAMEOVER) {
                    state = STATE_MENU;
                }
            }
            if (e.key.keysym.sym == SDLK_F1 || e.key.keysym.sym == SDLK_ESCAPE) { // SoftLeft = restart
                if (state == STATE_GAMEOVER) {
                    state = STATE_MENU;
                }
            }
        }
        if (e.type == SDL_MOUSEBUTTONDOWN) {
            if (state == STATE_MENU) { state = STATE_PLAYING; reset_game(); }
            else if (state == STATE_PLAYING) { bird_vel = FLAP_POWER; play_sound(snd_wing); }
            else { state = STATE_MENU; }
        }
    }
}

void game_update() {
    Uint32 now = SDL_GetTicks();
    
    // bird animation
    if (now - last_frame_time > 120) {
        bird_frame = (bird_frame + 1) % 3;
        last_frame_time = now;
    }

    if (state != STATE_PLAYING) return;

    // bird physics
    bird_vel += GRAVITY;
    bird_y += bird_vel;

    // base scroll
    base_scroll -= PIPE_SPEED;
    if (base_scroll <= -SCREEN_W) base_scroll = 0;

    // spawn pipes
    if (now - last_pipe_spawn > PIPE_SPAWN_INTERVAL) {
        spawn_pipe();
        last_pipe_spawn = now;
    }

    // update pipes
    for (int i=0;i<MAX_PIPES;i++) {
        if (!pipes[i].active) continue;
        pipes[i].x -= PIPE_SPEED;

        if (pipes[i].x < -PIPE_W) {
            pipes[i].active = false;
        }

        // score
        if (!pipes[i].scored && pipes[i].x + PIPE_W < BIRD_X) {
            score++;
            pipes[i].scored = true;
            play_sound(snd_point);
            if (score > best_score) best_score = score;
        }

        // collision
        if (check_collision(BIRD_X, bird_y, &pipes[i])) {
            play_sound(snd_hit);
            play_sound(snd_die);
            state = STATE_GAMEOVER;
            return;
        }
    }

    // ground / ceiling collision
    if (bird_y + BIRD_H >= SCREEN_H - BASE_H || bird_y <= 0) {
        play_sound(snd_hit);
        state = STATE_GAMEOVER;
    }
}

void render() {
    SDL_SetRenderDrawColor(renderer, 112, 197, 206, 255);
    SDL_RenderClear(renderer);

    // bg
    if (tex_bg_day) SDL_RenderCopy(renderer, tex_bg_day, NULL, NULL);

    // pipes
    for (int i=0;i<MAX_PIPES;i++) {
        if (!pipes[i].active) continue;
        SDL_Rect top_src = {0,0,PIPE_W, (int)pipes[i].gap_y};
        SDL_Rect top_dst = {(int)pipes[i].x, 0, PIPE_W, (int)pipes[i].gap_y};
        SDL_Rect bot_src = {0,0,PIPE_W, SCREEN_H};
        SDL_Rect bot_dst = {(int)pipes[i].x, (int)(pipes[i].gap_y+PIPE_GAP), PIPE_W, SCREEN_H - (int)(pipes[i].gap_y+PIPE_GAP) - BASE_H};

        if (tex_pipe_top) SDL_RenderCopy(renderer, tex_pipe_top, NULL, &top_dst);
        else { SDL_SetRenderDrawColor(renderer, 115, 191, 46, 255); SDL_RenderFillRect(renderer, &top_dst); }

        if (tex_pipe_bottom) SDL_RenderCopy(renderer, tex_pipe_bottom, NULL, &bot_dst);
        else { SDL_SetRenderDrawColor(renderer, 115, 191, 46, 255); SDL_RenderFillRect(renderer, &bot_dst); }
    }

    // base
    SDL_Rect base1 = {(int)base_scroll, SCREEN_H - BASE_H, SCREEN_W, BASE_H};
    SDL_Rect base2 = {(int)base_scroll + SCREEN_W, SCREEN_H - BASE_H, SCREEN_W, BASE_H};
    if (tex_base) {
        SDL_RenderCopy(renderer, tex_base, NULL, &base1);
        SDL_RenderCopy(renderer, tex_base, NULL, &base2);
    } else {
        SDL_SetRenderDrawColor(renderer, 222, 216, 149, 255);
        SDL_RenderFillRect(renderer, &base1);
        SDL_RenderFillRect(renderer, &base2);
    }

    // bird (rotate based on velocity)
    SDL_Rect bird_dst = {BIRD_X, (int)bird_y, BIRD_W, BIRD_H};
    double angle = bird_vel * 3.0; // tilt
    if (angle > 30) angle = 30;
    if (angle < -30) angle = -30;
    if (tex_bird[bird_frame]) {
        SDL_RenderCopyEx(renderer, tex_bird[bird_frame], NULL, &bird_dst, angle, NULL, SDL_FLIP_NONE);
    } else {
        SDL_SetRenderDrawColor(renderer, 255, 219, 0, 255);
        SDL_RenderFillRect(renderer, &bird_dst);
    }

    // UI - score (simple rect for now, you can render with TTF)
    if (state == STATE_MENU) {
        // Title - draw simple overlay
        SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_BLEND);
        SDL_SetRenderDrawColor(renderer, 0,0,0,120);
        SDL_Rect overlay = {0, SCREEN_H/2 - 50, SCREEN_W, 100};
        SDL_RenderFillRect(renderer, &overlay);
        SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_NONE);
        // In a real KaiOS app, use SDL_ttf to render text
        // For now, just show bird bouncing
    }

    // Game over overlay
    if (state == STATE_GAMEOVER) {
        SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_BLEND);
        SDL_SetRenderDrawColor(renderer, 0,0,0,150);
        SDL_Rect overlay = {0,0,SCREEN_W, SCREEN_H};
        SDL_RenderFillRect(renderer, &overlay);
        SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_NONE);
    }

    SDL_RenderPresent(renderer);
}

void main_loop() {
    handle_input();
    game_update();
    render();
}

int main(int argc, char* argv[]) {
    srand(time(NULL));
    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO) < 0) {
        printf("SDL_Init failed: %s\n", SDL_GetError());
        return 1;
    }
    if (!(IMG_Init(IMG_INIT_PNG) & IMG_INIT_PNG)) {
        printf("IMG_Init failed\n");
    }
    SDL_AudioSpec want, have;
    SDL_memset(&want, 0, sizeof(want));
    want.freq = 44100;
    want.format = AUDIO_S16LSB;
    want.channels = 1;
    want.samples = 1024;
    want.callback = audio_callback;
    want.userdata = NULL;

    audio_device = SDL_OpenAudioDevice(NULL, 0, &want, &have, 0);
    if (audio_device == 0) {
        printf("SDL_OpenAudioDevice failed: %s, continuing without sound\n", SDL_GetError());
    } else {
        SDL_PauseAudioDevice(audio_device, 0);
    }

    window = SDL_CreateWindow("Flappy Bird KaiOS", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, SCREEN_W, SCREEN_H, 0);
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);

    // Load assets - these are your Python-generated PNGs/WAVs
    tex_bird[0] = load_texture("assets/bird_up.png");
    tex_bird[1] = load_texture("assets/bird_mid.png");
    tex_bird[2] = load_texture("assets/bird_down.png");
    tex_pipe_top = load_texture("assets/pipe_top.png");
    tex_pipe_bottom = load_texture("assets/pipe_bottom.png");
    tex_bg_day = load_texture("assets/background_day.png");
    tex_base = load_texture("assets/base.png");

    snd_wing = load_sound("assets/sounds/wing.wav", &have);
    snd_point = load_sound("assets/sounds/point.wav", &have);
    snd_hit = load_sound("assets/sounds/hit.wav", &have);
    snd_die = load_sound("assets/sounds/die.wav", &have);

    reset_game();
    last_frame_time = SDL_GetTicks();

#ifdef __EMSCRIPTEN__
    emscripten_set_main_loop(main_loop, 60, 1);
#else
    while (1) {
        main_loop();
        SDL_Delay(1000/60);
    }
#endif

    return 0;
}
