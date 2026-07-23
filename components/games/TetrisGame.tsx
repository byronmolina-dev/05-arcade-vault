"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TETRIS_SKINS, type SkinId } from "@/lib/games/skins";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const PANEL_X = COLS * BLOCK + 20; // 320
const PANEL_PADDING = 40;
const NEXT_BLOCK = 30;

type Piece = { type: number; shape: number[][]; x: number; y: number };

export type TetrisGameHandle = {
  pause(): void;
  resume(): void;
  reset(): void;
};

export type TetrisGameProps = {
  onScoreChange: (score: number) => void;
  onLinesChange: (lines: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId;
};

const TetrisGame = forwardRef<TetrisGameHandle, TetrisGameProps>(
  function TetrisGame(props, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const propsRef = useRef(props);
    const controlsRef = useRef<TetrisGameHandle>({
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

      let board: number[][] = [];
      let current: Piece;
      let next: Piece;
      let score = 0;
      let lines = 0;
      let level = 1;
      let paused = false;
      let gameOver = false;
      let dropInterval = 1000;
      let dropAccum = 0;
      let lastTime: number | null = null;
      let animationId: number;
      let lastReportedScore = -1;
      let lastReportedLines = -1;
      let lastReportedLevel = -1;

      function reportState() {
        if (score !== lastReportedScore) {
          lastReportedScore = score;
          propsRef.current.onScoreChange(score);
        }
        if (lines !== lastReportedLines) {
          lastReportedLines = lines;
          propsRef.current.onLinesChange(lines);
        }
        if (level !== lastReportedLevel) {
          lastReportedLevel = level;
          propsRef.current.onLevelChange(level);
        }
      }

      function createBoard(): number[][] {
        return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
      }

      function randomPiece(): Piece {
        const type = Math.floor(Math.random() * 8) + 1;
        const shape = PIECES[type]!.map((row) => [...row]);
        return {
          type,
          shape,
          x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
          y: 0,
        };
      }

      function collide(shape: number[][], ox: number, oy: number) {
        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const nx = ox + c;
            const ny = oy + r;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
          }
        }
        return false;
      }

      function rotateCW(shape: number[][]) {
        const rows = shape.length;
        const cols = shape[0].length;
        const result = Array.from({ length: cols }, () =>
          new Array(rows).fill(0),
        );
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
        return result;
      }

      function tryRotate() {
        const rotated = rotateCW(current.shape);
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
          if (!collide(rotated, current.x + kick, current.y)) {
            current.shape = rotated;
            current.x += kick;
            return;
          }
        }
      }

      function merge() {
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
              board[current.y + r][current.x + c] = current.shape[r][c];
      }

      function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (board[r].every((v) => v !== 0)) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(0));
            cleared++;
            r++;
          }
        }
        if (cleared) {
          lines += cleared;
          score += (LINE_SCORES[cleared] || 0) * level;
          level = Math.floor(lines / 10) + 1;
          dropInterval = Math.max(100, 1000 - (level - 1) * 90);
        }
      }

      function ghostY() {
        let gy = current.y;
        while (!collide(current.shape, current.x, gy + 1)) gy++;
        return gy;
      }

      function hardDrop() {
        const gy = ghostY();
        score += (gy - current.y) * 2;
        current.y = gy;
        lockPiece();
      }

      function softDrop() {
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
          score += 1;
        } else {
          lockPiece();
        }
      }

      function endGame() {
        gameOver = true;
        reportState();
        propsRef.current.onGameOver(score);
      }

      function spawn() {
        current = next;
        next = randomPiece();
        if (collide(current.shape, current.x, current.y)) {
          endGame();
        }
      }

      function lockPiece() {
        merge();
        clearLines();
        spawn();
      }

      function getPalette() {
        return TETRIS_SKINS[propsRef.current.skin ?? "clasico"];
      }

      function drawBlock(
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        colorIndex: number,
        size: number,
        alpha?: number,
      ) {
        if (!colorIndex) return;
        const palette = getPalette();
        const color = palette.pieces[colorIndex];
        context.globalAlpha = alpha ?? 1;
        context.fillStyle = color!;
        context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        context.fillStyle = palette.blockHighlight;
        context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
        context.globalAlpha = 1;
      }

      function drawGrid() {
        ctx!.strokeStyle = getPalette().grid;
        ctx!.lineWidth = 0.5;
        for (let c = 1; c < COLS; c++) {
          ctx!.beginPath();
          ctx!.moveTo(c * BLOCK, 0);
          ctx!.lineTo(c * BLOCK, ROWS * BLOCK);
          ctx!.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
          ctx!.beginPath();
          ctx!.moveTo(0, r * BLOCK);
          ctx!.lineTo(COLS * BLOCK, r * BLOCK);
          ctx!.stroke();
        }
      }

      function drawPanelStat(label: string, value: string, y: number) {
        const palette = getPalette();
        ctx!.textAlign = "left";
        ctx!.fillStyle = palette.hudLabel;
        ctx!.font = "13px monospace";
        ctx!.fillText(label, PANEL_X + PANEL_PADDING, y);
        ctx!.fillStyle = palette.hud;
        ctx!.font = "bold 28px monospace";
        ctx!.fillText(value, PANEL_X + PANEL_PADDING, y + 32);
      }

      function drawPanel() {
        const palette = getPalette();
        ctx!.strokeStyle = palette.panelLine;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(PANEL_X, 0);
        ctx!.lineTo(PANEL_X, canvas!.height);
        ctx!.stroke();

        drawPanelStat("SCORE", score.toLocaleString(), 70);
        drawPanelStat("LINES", String(lines), 160);
        drawPanelStat("LEVEL", String(level), 250);

        ctx!.textAlign = "left";
        ctx!.fillStyle = palette.hudLabel;
        ctx!.font = "13px monospace";
        ctx!.fillText("NEXT", PANEL_X + PANEL_PADDING, 330);

        const boxX = PANEL_X + PANEL_PADDING;
        const boxY = 350;
        const boxSize = NEXT_BLOCK * 4;
        ctx!.strokeStyle = palette.panelLine;
        ctx!.strokeRect(boxX, boxY, boxSize, boxSize);

        const shape = next.shape;
        const offX = Math.floor((4 - shape[0].length) / 2);
        const offY = Math.floor((4 - shape.length) / 2);
        ctx!.save();
        ctx!.translate(boxX, boxY);
        for (let r = 0; r < shape.length; r++)
          for (let c = 0; c < shape[r].length; c++)
            drawBlock(ctx!, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
        ctx!.restore();
      }

      function draw() {
        const palette = getPalette();
        ctx!.fillStyle = palette.bg;
        ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

        drawGrid();

        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++)
            drawBlock(ctx!, c, r, board[r][c], BLOCK);

        const gy = ghostY();
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            if (current.shape[r][c])
              drawBlock(
                ctx!,
                current.x + c,
                gy + r,
                current.shape[r][c],
                BLOCK,
                0.2,
              );

        // Glow real solo en la pieza activa (no en toda la grilla) para no
        // penalizar el framerate. Se activa unicamente en la skin `neon`.
        if (palette.glow) {
          ctx!.shadowColor = (palette.pieces[current.type] as string) ?? "#000";
          ctx!.shadowBlur = 12;
        }
        for (let r = 0; r < current.shape.length; r++)
          for (let c = 0; c < current.shape[r].length; c++)
            drawBlock(
              ctx!,
              current.x + c,
              current.y + r,
              current.shape[r][c],
              BLOCK,
            );
        ctx!.shadowBlur = 0;
        ctx!.shadowColor = "transparent";

        drawPanel();
      }

      function init() {
        board = createBoard();
        score = 0;
        lines = 0;
        level = 1;
        paused = false;
        gameOver = false;
        dropInterval = 1000;
        dropAccum = 0;
        next = randomPiece();
        spawn();
      }

      function loop(ts: number) {
        const dt = lastTime === null ? 0 : ts - lastTime;
        lastTime = ts;
        if (!paused && !gameOver) {
          dropAccum += dt;
          if (dropAccum >= dropInterval) {
            dropAccum = 0;
            if (!collide(current.shape, current.x, current.y + 1)) {
              current.y++;
            } else {
              lockPiece();
            }
          }
        }
        draw();
        reportState();
        animationId = requestAnimationFrame(loop);
      }

      const gameKeys = new Set([
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "KeyX",
      ]);

      const onKeyDown = (e: KeyboardEvent) => {
        if (gameKeys.has(e.code)) e.preventDefault();
        if (paused || gameOver) return;
        switch (e.code) {
          case "ArrowLeft":
            if (!collide(current.shape, current.x - 1, current.y)) current.x--;
            break;
          case "ArrowRight":
            if (!collide(current.shape, current.x + 1, current.y)) current.x++;
            break;
          case "ArrowDown":
            softDrop();
            break;
          case "ArrowUp":
          case "KeyX":
            tryRotate();
            break;
          case "Space":
            hardDrop();
            break;
        }
      };

      controlsRef.current = {
        pause() {
          paused = true;
        },
        resume() {
          paused = false;
        },
        reset() {
          paused = false;
          init();
          lastReportedScore = -1;
          lastReportedLines = -1;
          lastReportedLevel = -1;
          reportState();
        },
      };

      window.addEventListener("keydown", onKeyDown);

      init();
      reportState();
      animationId = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener("keydown", onKeyDown);
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    );
  },
);

TetrisGame.displayName = "TetrisGame";

export default TetrisGame;
