// components/games/SerpentinaGame.tsx
//
// Snake clásico en grid. Construido desde cero (sin juego de referencia).

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const W = 800;
const H = 600;
const CELL = 40; // 800/40 = 20 columnas, 600/40 = 15 filas

const FRUITS_SRC = "/games/serpentina/fruits.png";

const COLS = 20;
const ROWS = 15;
const FRUITS_PER_LEVEL = 5;
const BASE_TICK_MS = 190;
const TICK_DECREASE_PER_LEVEL = 12;
const MIN_TICK_MS = 80;

// Subconjunto curado del atlas (references/source-assets/snake-assets/sprites.js)
const FRUIT_ATLAS = {
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  banana: { x: 34, y: 136, w: 110, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
} as const; // recortes dentro de public/games/serpentina/fruits.png

const FRUIT_KINDS = Object.keys(FRUIT_ATLAS) as FruitKind[];

type FruitKind = keyof typeof FRUIT_ATLAS;
type Cell = { col: number; row: number };
type Direction = "up" | "down" | "left" | "right";

type SnakeState = {
  body: Cell[]; // body[0] = cabeza, resto en orden hacia la cola
  direction: Direction;
  pendingDirection: Direction; // último input válido, aplicado en el próximo tick
  fruit: { cell: Cell; kind: FruitKind };
  score: number;
  level: number;
  fruitsEatenThisLevel: number;
  status: "playing" | "paused" | "over";
};

const DIRECTION_DELTA: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function cellsEqual(a: Cell, b: Cell) {
  return a.col === b.col && a.row === b.row;
}

function randomFruitKind(): FruitKind {
  return FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
}

function spawnFruit(body: Cell[]): { cell: Cell; kind: FruitKind } {
  const occupied = new Set(body.map((c) => `${c.col},${c.row}`));
  const free: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!occupied.has(`${col},${row}`)) free.push({ col, row });
    }
  }
  const cell = free[Math.floor(Math.random() * free.length)];
  return { cell, kind: randomFruitKind() };
}

function createInitialSnake(): SnakeState {
  const startRow = Math.floor(ROWS / 2);
  const startCol = Math.floor(COLS / 2);
  const body: Cell[] = [
    { col: startCol, row: startRow },
    { col: startCol - 1, row: startRow },
    { col: startCol - 2, row: startRow },
  ];
  return {
    body,
    direction: "right",
    pendingDirection: "right",
    fruit: spawnFruit(body),
    score: 0,
    level: 1,
    fruitsEatenThisLevel: 0,
    status: "playing",
  };
}

// ms que dura cada celda de movimiento en el nivel dado (más nivel = más rápido)
function getTickMs(level: number): number {
  return Math.max(
    MIN_TICK_MS,
    BASE_TICK_MS - (level - 1) * TICK_DECREASE_PER_LEVEL,
  );
}

// Ignora el input si intenta invertir 180° sobre la dirección ya confirmada.
function setPendingDirection(state: SnakeState, next: Direction): SnakeState {
  if (next === OPPOSITE_DIRECTION[state.direction]) return state;
  return { ...state, pendingDirection: next };
}

// Avanza el grid un tick: mueve la cabeza, detecta colisiones, come fruta y
// sube de nivel. Devuelve un nuevo SnakeState (no muta el que recibe).
function tickSnake(state: SnakeState): SnakeState {
  if (state.status !== "playing") return state;

  const direction = state.pendingDirection;
  const head = state.body[0];
  const delta = DIRECTION_DELTA[direction];
  const newHead: Cell = { col: head.col + delta.dc, row: head.row + delta.dr };

  const hitsWall =
    newHead.col < 0 ||
    newHead.col >= COLS ||
    newHead.row < 0 ||
    newHead.row >= ROWS;
  if (hitsWall) return { ...state, direction, status: "over" };

  const eats = cellsEqual(newHead, state.fruit.cell);
  const bodyWithoutTail = eats ? state.body : state.body.slice(0, -1);
  const hitsSelf = bodyWithoutTail.some((segment) =>
    cellsEqual(segment, newHead),
  );
  if (hitsSelf) return { ...state, direction, status: "over" };

  const newBody = [newHead, ...bodyWithoutTail];

  if (!eats) {
    return { ...state, body: newBody, direction };
  }

  const fruitsEatenThisLevel = state.fruitsEatenThisLevel + 1;
  const levelsUp = fruitsEatenThisLevel >= FRUITS_PER_LEVEL;

  return {
    ...state,
    body: newBody,
    direction,
    score: state.score + 10,
    level: levelsUp ? state.level + 1 : state.level,
    fruitsEatenThisLevel: levelsUp ? 0 : fruitsEatenThisLevel,
    fruit: spawnFruit(newBody),
  };
}

export type SerpentinaGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type SerpentinaGameProps = {
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onLengthChange: (length: number) => void; // body.length, dispara solo si cambia
  onGameOver: (finalScore: number) => void;
};

const SerpentinaGame = forwardRef<SerpentinaGameHandle, SerpentinaGameProps>(
  function SerpentinaGame(props, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const propsRef = useRef(props);
    const controlsRef = useRef<SerpentinaGameHandle>({
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

      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      let fruitsImage: HTMLImageElement | null = null;
      let imageLoaded = false;

      function loadFruits(onLoad: () => void) {
        const img = new Image();
        img.onload = () => {
          fruitsImage = img;
          imageLoaded = true;
          onLoad();
        };
        img.src = FRUITS_SRC;
      }

      let snake = createInitialSnake();
      let paused = false;
      let frozen = false;
      let tickAccumulator = 0;
      let lastReportedScore = -1;
      let lastReportedLevel = -1;
      let lastReportedLength = -1;

      function reportState() {
        if (snake.score !== lastReportedScore) {
          lastReportedScore = snake.score;
          propsRef.current.onScoreChange(snake.score);
        }
        if (snake.level !== lastReportedLevel) {
          lastReportedLevel = snake.level;
          propsRef.current.onLevelChange(snake.level);
        }
        if (snake.body.length !== lastReportedLength) {
          lastReportedLength = snake.body.length;
          propsRef.current.onLengthChange(snake.body.length);
        }
      }

      function drawGrid() {
        ctx!.fillStyle = "#04140d";
        ctx!.fillRect(0, 0, W, H);
        ctx!.strokeStyle = "rgba(0, 255, 140, 0.08)";
        ctx!.lineWidth = 1;
        for (let col = 0; col <= COLS; col++) {
          ctx!.beginPath();
          ctx!.moveTo(col * CELL, 0);
          ctx!.lineTo(col * CELL, H);
          ctx!.stroke();
        }
        for (let row = 0; row <= ROWS; row++) {
          ctx!.beginPath();
          ctx!.moveTo(0, row * CELL);
          ctx!.lineTo(W, row * CELL);
          ctx!.stroke();
        }
      }

      function drawSnake() {
        snake.body.forEach((segment, index) => {
          const x = segment.col * CELL;
          const y = segment.row * CELL;
          ctx!.fillStyle = index === 0 ? "#7CFFB2" : "#22C55E";
          ctx!.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        });
      }

      function drawFruit() {
        if (!imageLoaded || !fruitsImage) return;
        const frame = FRUIT_ATLAS[snake.fruit.kind];
        const x = snake.fruit.cell.col * CELL;
        const y = snake.fruit.cell.row * CELL;
        const scale = Math.min(CELL / frame.w, CELL / frame.h) * 0.85;
        const dw = frame.w * scale;
        const dh = frame.h * scale;
        ctx!.drawImage(
          fruitsImage,
          frame.x,
          frame.y,
          frame.w,
          frame.h,
          x + (CELL - dw) / 2,
          y + (CELL - dh) / 2,
          dw,
          dh,
        );
      }

      function drawHUD() {
        ctx!.fillStyle = "#fff";
        ctx!.font = "bold 18px monospace";
        ctx!.textAlign = "left";
        ctx!.textBaseline = "top";
        ctx!.fillText(`Score: ${snake.score}`, 10, 10);
        ctx!.textAlign = "center";
        ctx!.fillText(`Nivel: ${snake.level}`, W / 2, 10);
      }

      function draw() {
        drawGrid();
        drawFruit();
        drawSnake();
        drawHUD();
      }

      function update(dt: number) {
        if (frozen || paused) return;

        tickAccumulator += dt * 1000;
        const tickMs = getTickMs(snake.level);
        while (tickAccumulator >= tickMs && !frozen) {
          snake = tickSnake(snake);
          tickAccumulator -= tickMs;
          if (snake.status === "over") {
            frozen = true;
            reportState();
            propsRef.current.onGameOver(snake.score);
          }
        }

        reportState();
      }

      let lastTime: number | null = null;
      let animationId: number;

      function loop(ts: number) {
        const dt =
          lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
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
          tickAccumulator = 0;
          snake = createInitialSnake();
          lastReportedScore = -1;
          lastReportedLevel = -1;
          lastReportedLength = -1;
          reportState();
        },
      };

      function onKeyDown(e: KeyboardEvent) {
        const direction: Direction | null =
          e.code === "ArrowUp"
            ? "up"
            : e.code === "ArrowDown"
              ? "down"
              : e.code === "ArrowLeft"
                ? "left"
                : e.code === "ArrowRight"
                  ? "right"
                  : null;
        if (!direction) return;
        e.preventDefault();
        snake = setPendingDirection(snake, direction);
      }

      window.addEventListener("keydown", onKeyDown);

      loadFruits(() => {
        reportState();
        animationId = requestAnimationFrame(loop);
      });

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener("keydown", onKeyDown);
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
  },
);

SerpentinaGame.displayName = "SerpentinaGame";

export default SerpentinaGame;
