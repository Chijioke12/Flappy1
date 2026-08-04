#include <SDL2/SDL.h>
#include <SDL2/SDL_image.h>
#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>
#include <time.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#define SCREEN_WIDTH 288
#define SCREEN_HEIGHT 512
#define BIRD_WIDTH 34
#define BIRD_HEIGHT 24
#define PIPE_WIDTH 52
#define PIPE_HEIGHT 320
#define PIPE_GAP 100
#define GRAVITY 0.25
#define JUMP_STRENGTH -5.0
#define PIPE_SPEED 2

typedef struct {
    float x, y;
    float velocity;
} Bird;

typedef struct {
    float x;
    int top_height;
    bool scored;
} Pipe;

SDL_Window* window = NULL;
SDL_Renderer* renderer = NULL;
SDL_Texture* bird_texture = NULL;
SDL_Texture* pipe_top_texture = NULL;
SDL_Texture* pipe_bottom_texture = NULL;
SDL_Texture* bg_texture = NULL;
SDL_Texture* base_texture = NULL;

Bird bird;
Pipe pipes[3];
int score = 0;
bool game_over = false;
bool started = false;

void init_game() {
    bird.x = 50;
    bird.y = SCREEN_HEIGHT / 2;
    bird.velocity = 0;
    
    for (int i = 0; i < 3; i++) {
        pipes[i].x = SCREEN_WIDTH + i * 200;
        pipes[i].top_height = rand() % 200 + 50;
        pipes[i].scored = false;
    }
    score = 0;
    game_over = false;
    started = false;
}

void load_textures() {
    bg_texture = IMG_LoadTexture(renderer, "assets/background_day.png");
    bird_texture = IMG_LoadTexture(renderer, "assets/bird_mid.png");
    pipe_top_texture = IMG_LoadTexture(renderer, "assets/pipe_top.png");
    pipe_bottom_texture = IMG_LoadTexture(renderer, "assets/pipe_bottom.png");
    base_texture = IMG_LoadTexture(renderer, "assets/base.png");
    
    if (!bg_texture || !bird_texture || !pipe_top_texture || !pipe_bottom_texture || !base_texture) {
        printf("Failed to load textures! Error: %s\n", IMG_GetError());
    }
}

void handle_input() {
    SDL_Event e;
    while (SDL_PollEvent(&e)) {
        if (e.type == SDL_QUIT) {
            exit(0);
        } else if (e.type == SDL_KEYDOWN || e.type == SDL_FINGERDOWN || e.type == SDL_MOUSEBUTTONDOWN) {
            if (game_over) {
                init_game();
            } else {
                bird.velocity = JUMP_STRENGTH;
                started = true;
            }
        }
    }
}

void update() {
    if (!started || game_over) return;

    bird.velocity += GRAVITY;
    bird.y += bird.velocity;

    if (bird.y < 0 || bird.y + BIRD_HEIGHT > 400) {
        game_over = true;
    }

    for (int i = 0; i < 3; i++) {
        pipes[i].x -= PIPE_SPEED;

        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes[i].x = SCREEN_WIDTH + 100;
            pipes[i].top_height = rand() % 200 + 50;
            pipes[i].scored = false;
        }

        // Collision detection
        if (bird.x + BIRD_WIDTH > pipes[i].x && bird.x < pipes[i].x + PIPE_WIDTH) {
            if (bird.y < pipes[i].top_height || bird.y + BIRD_HEIGHT > pipes[i].top_height + PIPE_GAP) {
                game_over = true;
            }
        }

        if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
            score++;
            pipes[i].scored = true;
            printf("Score: %d\n", score);
        }
    }
}

void render_game() {
    SDL_RenderClear(renderer);

    // Background
    SDL_RenderCopy(renderer, bg_texture, NULL, NULL);

    // Pipes
    for (int i = 0; i < 3; i++) {
        SDL_Rect top_rect = { (int)pipes[i].x, 0, PIPE_WIDTH, pipes[i].top_height };
        SDL_RenderCopy(renderer, pipe_top_texture, NULL, &top_rect);

        SDL_Rect bottom_rect = { (int)pipes[i].x, pipes[i].top_height + PIPE_GAP, PIPE_WIDTH, SCREEN_HEIGHT - (pipes[i].top_height + PIPE_GAP) };
        SDL_RenderCopy(renderer, pipe_bottom_texture, NULL, &bottom_rect);
    }

    // Base
    SDL_Rect base_rect = { 0, 400, SCREEN_WIDTH, 112 };
    SDL_RenderCopy(renderer, base_texture, NULL, &base_rect);

    // Bird
    SDL_Rect bird_rect = { (int)bird.x, (int)bird.y, BIRD_WIDTH, BIRD_HEIGHT };
    SDL_RenderCopyEx(renderer, bird_texture, NULL, &bird_rect, bird.velocity * 5, NULL, SDL_FLIP_NONE);

    SDL_RenderPresent(renderer);
}

void main_loop() {
    handle_input();
    update();
    render_game();
}

int main(int argc, char* argv[]) {
    srand(time(NULL));
    SDL_Init(SDL_INIT_VIDEO);
    IMG_Init(IMG_INIT_PNG);

    window = SDL_CreateWindow("Flappy Bird C", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, SCREEN_WIDTH, SCREEN_HEIGHT, 0);
    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);

    load_textures();
    init_game();

#ifdef __EMSCRIPTEN__
    emscripten_set_main_loop(main_loop, 0, 1);
#else
    while (1) {
        main_loop();
        SDL_Delay(16);
    }
#endif

    return 0;
}
