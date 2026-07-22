"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const W = 800;
const H = 600;

const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;

const PADDLE_W = 81;
const PADDLE_H = 14;
const PADDLE_Y = 560;

const BALL_SIZE = 16;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

const EXPLOSION_DURATION = 150;
const STARTING_LIVES = 3;

type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

type BlockLayout = { col: number; row: number; color: BlockColor };
type Level = { speed: number; blocks: BlockLayout[] };

const LEVELS: Level[] = (() => {
  const rowColors1: BlockColor[] = [
    "red",
    "yellow",
    "cyan",
    "magenta",
    "hotpink",
    "green",
  ];
  const rowColors2: BlockColor[] = [
    "gray",
    "cyan",
    "hotpink",
    "yellow",
    "magenta",
    "green",
  ];
  const rowColors4: BlockColor[] = [
    "cyan",
    "magenta",
    "green",
    "yellow",
    "hotpink",
    "red",
  ];

  const l1: BlockLayout[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: BlockLayout[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: BlockLayout[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: BlockLayout[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: BlockLayout[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};

type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
};

type Paddle = { x: number; y: number; w: number; h: number };
type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};

export type BloqueBusterGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type BloqueBusterGameProps = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

const BloqueBusterGame = forwardRef<
  BloqueBusterGameHandle,
  BloqueBusterGameProps
>(function BloqueBusterGame(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const controlsRef = useRef<BloqueBusterGameHandle>({
    pause() {},
    resume() {},
    reset() {},
  });

  useEffect(() => {
    propsRef.current = props;
  });

  useImperativeHandle(
    ref,
    () => ({
      pause: () => controlsRef.current.pause(),
      resume: () => controlsRef.current.resume(),
      reset: () => controlsRef.current.reset(),
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let paddle: Paddle;
    let ball: Ball;
    let blocks: Block[] = [];
    let explosions: Explosion[] = [];
    let score = 0;
    let lives = STARTING_LIVES;
    let currentLevel = 1;
    let paused = false;
    let frozen = false;
    let lastReportedScore = -1;
    let lastReportedLives = -1;
    let lastReportedLevel = -1;

    function reportState() {
      if (score !== lastReportedScore) {
        lastReportedScore = score;
        propsRef.current.onScoreChange(score);
      }
      if (lives !== lastReportedLives) {
        lastReportedLives = lives;
        propsRef.current.onLivesChange(lives);
      }
      if (currentLevel !== lastReportedLevel) {
        lastReportedLevel = currentLevel;
        propsRef.current.onLevelChange(currentLevel);
      }
    }

    function initPaddle() {
      paddle = { x: (W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
    }

    function initBall() {
      const speed = LEVELS[currentLevel - 1].speed;
      ball = {
        x: paddle.x + (paddle.w - BALL_SIZE) / 2,
        y: paddle.y - BALL_SIZE,
        w: BALL_SIZE,
        h: BALL_SIZE,
        vx: BASE_BALL_VX * speed,
        vy: BASE_BALL_VY * speed,
      };
    }

    function loadLevel(n: number) {
      currentLevel = n;
      const lvl = LEVELS[n - 1];
      blocks = lvl.blocks.map((b) => ({
        x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: b.color,
        alive: true,
      }));
      explosions = [];
      initBall();
    }

    function initGame() {
      score = 0;
      lives = STARTING_LIVES;
      initPaddle();
      loadLevel(1);
    }

    function collideAABB(block: Block) {
      return (
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y
      );
    }

    function endGame() {
      frozen = true;
      reportState();
      propsRef.current.onGameOver(score);
    }

    function update(dt: number) {
      if (frozen || paused) return;

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
      }
      if (ball.x + ball.w >= W) {
        ball.x = W - ball.w;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          ball.vy = -ball.vy;
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < LEVELS.length) {
              loadLevel(currentLevel + 1);
            } else {
              endGame();
            }
          }
          break;
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > H) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          endGame();
        } else {
          initBall();
        }
      }

      reportState();
    }

    function draw() {
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, W, H);
    }

    let lastTime: number | null = null;
    let animationId: number;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      update(dt);
      draw();
      animationId = requestAnimationFrame(loop);
    }

    controlsRef.current = {
      pause() {
        paused = true;
      },
      resume() {
        paused = false;
      },
      reset() {
        paused = false;
        frozen = false;
        initGame();
        lastReportedScore = -1;
        lastReportedLives = -1;
        lastReportedLevel = -1;
        reportState();
      },
    };

    initGame();
    reportState();
    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
});

BloqueBusterGame.displayName = "BloqueBusterGame";

export default BloqueBusterGame;
