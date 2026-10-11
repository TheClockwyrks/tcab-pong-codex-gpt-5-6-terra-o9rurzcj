import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import {
  ACTIONS,
  AI_DEADZONE,
  AI_HOME_DEADZONE,
  AI_HOME_Y,
  AI_REACT,
  AI_SPEED,
  BALL_R,
  BINDINGS,
  CAROM_DEBUG_VERSION,
  CUES,
  FIELD_CX,
  FIELD_CY,
  FIELD_H,
  FIELD_W,
  HOLD_TIME,
  MATCHOVER_ITEMS,
  MAX_BOUNCE_ANGLE,
  MAX_SUBSTEP,
  OBSTACLE_CENTERS,
  P1_X0,
  P1_X1,
  P2_X0,
  P2_X1,
  PADDLE_HALF,
  PADDLE_H,
  PADDLE_MAX_CY,
  PADDLE_MIN_CY,
  PADDLE_SPEED,
  PAUSE_ITEMS,
  SERVE_ANGLE,
  SERVE_SPEED,
  SPEED_CAP,
  SPEED_MULT,
  SPIN_CLAMP,
  SPIN_FROM_PADDLE,
  SPIN_HALFLIFE,
  TITLE_ITEMS,
  TITLE_TEXT,
  TRAIL_TIME,
  WIN_LEAD,
  WIN_SCORE,
} from "./constants";

export const BACKGROUND = "#08111d";
export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly simTime: number;
  readonly muted: boolean;
}
type Pose<T extends unknown[] = []> = (
  s: DeepReadonly<CaromState>,
  ...args: T
) => CaromState;
export interface CaromDebugApi {
  readonly version: number;
  clearWorld: Pose;
  spawnBall: Pose;
  spawnObstacle: Pose<[number]>;
  reset: Pose;
  reconcile: Pose;
  setScreen: Pose<[Screen]>;
  setMode: Pose<[Mode]>;
  setMenuIndex: Pose<[number]>;
  setTitleIndex: Pose<[number]>;
  setResumeScreen: Pose<["countdown" | "playing"]>;
  setScore: Pose<[number, number]>;
  setWinner: Pose<[Side | null]>;
  setReceiver: Pose<[Side]>;
  setPaddleCy: Pose<[Side, number]>;
  setPaddleVy: Pose<[Side, number]>;
  setPaddleDriven: Pose<[Side, boolean]>;
  setBallPosition: Pose<[number, number]>;
  setBallVelocity: Pose<[number, number]>;
  setBallSpin: Pose<[number]>;
  setBallHeld: Pose<[boolean]>;
  setBallHoldTimer: Pose<[number]>;
  setBallServeSign: Pose<[1 | -1]>;
  drawBallServeSign: Pose;
  setAiTracking: Pose<[boolean]>;
  setAiMovement: Pose<[boolean]>;
  setMuted: Pose<[boolean]>;
  snapshot(s: DeepReadonly<CaromState>): unknown;
  menuItemRect(
    s: DeepReadonly<CaromState>,
    index: number,
  ): { x: number; y: number; w: number; h: number } | null;
}
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const serveSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const parked = (): BallState => ({
  x: FIELD_CX,
  y: FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: HOLD_TIME,
  serveSign: serveSign(),
  trail: [],
});
const obstacle = (index: number): ObstacleState => {
  const p = OBSTACLE_CENTERS[index];
  if (!p) throw new Error("Carom: invalid obstacle index");
  return { index, cx: p.x, cy: p.y };
};
const titleState = (muted = false): CaromState => ({
  screen: "title",
  mode: "solo",
  menuIndex: 0,
  titleIndex: 0,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  paddles: {
    left: { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
    right: { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
  },
  ai: { tracking: true, movement: true },
  receiver: "left",
  ball: parked(),
  obstacles: [obstacle(0), obstacle(1)],
  simTime: 0,
  muted,
});
const clone = (s: DeepReadonly<CaromState>): CaromState => ({
  ...s,
  score: { ...s.score },
  paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
  ai: { ...s.ai },
  ball: s.ball
    ? { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) }
    : null,
  obstacles: s.obstacles.map((o) => ({ ...o })),
});
const needBall = (s: DeepReadonly<CaromState>) => {
  if (!s.ball) throw new Error("Carom: no ball on field");
  return s.ball;
};
const menuItems = (screen: Screen): readonly string[] | null =>
  screen === "title"
    ? TITLE_ITEMS
    : screen === "paused"
      ? PAUSE_ITEMS
      : screen === "matchover"
        ? MATCHOVER_ITEMS
        : screen === "howto"
          ? ["BACK"]
          : null;
const menuRect = (screen: Screen, index: number) => {
  const items = menuItems(screen);
  return items && index >= 0 && index < items.length
    ? { x: 430, y: 390 + index * 58, w: 420, h: 46 }
    : null;
};
const paddleMove = (p: PaddleState, vy: number, dt: number): PaddleState => {
  const cy = clamp(p.cy + vy * dt, PADDLE_MIN_CY, PADDLE_MAX_CY);
  return { ...p, cy, vy: dt && cy !== p.cy + vy * dt ? (cy - p.cy) / dt : vy };
};
const setPaddle = (
  s: DeepReadonly<CaromState>,
  side: Side,
  paddle: PaddleState,
): CaromState => ({ ...clone(s), paddles: { ...s.paddles, [side]: paddle } });
function startMatch(s: DeepReadonly<CaromState>, mode = s.mode): CaromState {
  const n = clone(s);
  return {
    ...n,
    mode,
    screen: "countdown",
    resumeScreen: "playing",
    menuIndex: 0,
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    ball: parked(),
    paddles: {
      left: { ...n.paddles.left, cy: FIELD_CY, vy: 0 },
      right: { ...n.paddles.right, cy: FIELD_CY, vy: 0 },
    },
  };
}
function returnTitle(s: DeepReadonly<CaromState>): CaromState {
  return {
    ...titleState(s.muted),
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
    simTime: s.simTime,
  };
}
function confirm(s: DeepReadonly<CaromState>): CaromState {
  if (s.screen === "title") {
    const titleIndex = s.menuIndex;
    return titleIndex === 0
      ? { ...startMatch(s, "solo"), titleIndex }
      : titleIndex === 1
        ? { ...startMatch(s, "versus"), titleIndex }
        : { ...clone(s), screen: "howto", menuIndex: 0, titleIndex };
  }
  if (s.screen === "howto") return returnTitle(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...clone(s), screen: s.resumeScreen }
      : s.menuIndex === 1
        ? startMatch(s)
        : returnTitle(s);
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? startMatch(s) : returnTitle(s);
  return clone(s);
}
type Face = "left" | "right" | "top" | "bottom";
function rectHit(
  b: BallState,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): [BallState, Face | null] {
  if (!(
    b.x > x0 - BALL_R &&
    b.x < x1 + BALL_R &&
    b.y > y0 - BALL_R &&
    b.y < y1 + BALL_R
  ))
    return [b, null];
  const d: readonly [Face, number][] = [
    ["left", b.x - (x0 - BALL_R)],
    ["right", x1 + BALL_R - b.x],
    ["top", b.y - (y0 - BALL_R)],
    ["bottom", y1 + BALL_R - b.y],
  ];
  const face = d.reduce((a, v) => (v[1] < a[1] ? v : a))[0];
  const n = { ...b };
  if (face === "left") {
    n.x = x0 - BALL_R;
    if (n.vx > 0) n.vx = -n.vx;
  } else if (face === "right") {
    n.x = x1 + BALL_R;
    if (n.vx < 0) n.vx = -n.vx;
  } else if (face === "top") {
    n.y = y0 - BALL_R;
    if (n.vy > 0) n.vy = -n.vy;
  } else {
    n.y = y1 + BALL_R;
    if (n.vy < 0) n.vy = -n.vy;
  }
  return [n, face];
}
function stepPhysics(s: CaromState, dt: number, api: UpdateApi): CaromState {
  if (!s.ball) return s;
  let b = { ...s.ball };
  const steps = Math.max(
    1,
    Math.ceil((Math.hypot(b.vx, b.vy) * dt) / MAX_SUBSTEP),
  );
  for (let i = 0; i < steps; i++) {
    const h = dt / steps,
      speed = Math.hypot(b.vx, b.vy);
    if (speed) {
      const a = (b.spin / speed) * h,
        vx = b.vx * Math.cos(a) - b.vy * Math.sin(a),
        vy = b.vx * Math.sin(a) + b.vy * Math.cos(a);
      b.vx = vx;
      b.vy = vy;
    }
    b.spin *= Math.pow(0.5, h / SPIN_HALFLIFE);
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.y - BALL_R < 0 && b.vy < 0) {
      b.y = BALL_R;
      b.vy = -b.vy;
      api.audio.play(CUES.wallBounce);
    } else if (b.y + BALL_R > FIELD_H && b.vy > 0) {
      b.y = FIELD_H - BALL_R;
      b.vy = -b.vy;
      api.audio.play(CUES.wallBounce);
    }
    for (const [side, x0, x1, p] of [
      ["left", P1_X0, P1_X1, s.paddles.left],
      ["right", P2_X0, P2_X1, s.paddles.right],
    ] as const) {
      const [hit, face] = rectHit(
        b,
        x0,
        x1,
        p.cy - PADDLE_HALF,
        p.cy + PADDLE_HALF,
      );
      b = hit;
      if (face === "left" || face === "right") {
        const theta =
            clamp((b.y - p.cy) / PADDLE_HALF, -1, 1) * MAX_BOUNCE_ANGLE,
          v = Math.min(Math.hypot(b.vx, b.vy) * SPEED_MULT, SPEED_CAP),
          dir = side === "left" ? 1 : -1;
        b.vx = dir * v * Math.cos(theta);
        b.vy = v * Math.sin(theta);
        b.spin = clamp(
          b.spin + p.vy * SPIN_FROM_PADDLE,
          -SPIN_CLAMP,
          SPIN_CLAMP,
        );
        b.x = side === "left" ? P1_X1 + BALL_R : P2_X0 - BALL_R;
        api.audio.play(CUES.paddleHit);
      } else if (face) api.audio.play(CUES.wallBounce);
    }
    for (const o of s.obstacles) {
      const [hit, face] = rectHit(
        b,
        o.cx - 10,
        o.cx + 10,
        o.cy - 70,
        o.cy + 70,
      );
      b = hit;
      if (face) api.audio.play(CUES.obstacleBounce);
    }
  }
  if (b.x - BALL_R > FIELD_W || b.x + BALL_R < 0) {
    const scorer: Side = b.x - BALL_R > FIELD_W ? "left" : "right",
      score = {
        p1: s.score.p1 + (scorer === "left" ? 1 : 0),
        p2: s.score.p2 + (scorer === "right" ? 1 : 0),
      },
      won =
        (score.p1 >= WIN_SCORE && score.p1 - score.p2 >= WIN_LEAD) ||
        (score.p2 >= WIN_SCORE && score.p2 - score.p1 >= WIN_LEAD);
    api.audio.play(CUES.score);
    return {
      ...s,
      score,
      winner: won ? scorer : null,
      screen: won ? "matchover" : "countdown",
      menuIndex: won ? 0 : s.menuIndex,
      receiver: scorer === "left" ? "right" : "left",
      ball: won ? b : parked(),
    };
  }
  return { ...s, ball: b };
}
function paddles(s: CaromState, api: UpdateApi, dt: number): CaromState {
  const a = (up: string, down: string) =>
      api.input.value(down) - api.input.value(up),
    left = s.paddles.left,
    right = s.paddles.right;
  const lv = left.driven
    ? left.drivenVy
    : (s.mode === "solo"
        ? a("p1-up", "p1-down") + a("p2-up", "p2-down")
        : a("p1-up", "p1-down")) * PADDLE_SPEED;
  let rv = right.driven
    ? right.drivenVy
    : s.mode === "versus"
      ? a("p2-up", "p2-down") * PADDLE_SPEED
      : 0;
  if (!right.driven && s.mode === "solo" && s.ai.movement) {
    const tracking =
        s.screen === "playing" && s.ball && s.ball.vx > 0 && s.ai.tracking,
      target = tracking ? s.ball!.y - s.ball!.vy * AI_REACT : AI_HOME_Y,
      deadzone = tracking ? AI_DEADZONE : AI_HOME_DEADZONE,
      diff = target - right.cy;
    rv =
      Math.abs(diff) <= deadzone
        ? 0
        : Math.sign(diff) *
          Math.min(AI_SPEED, dt ? Math.abs(diff) / dt : AI_SPEED);
  }
  return {
    ...clone(s),
    paddles: {
      left: paddleMove(left, lv, dt),
      right: paddleMove(right, rv, dt),
    },
  };
}
const debug: CaromDebugApi = {
  version: CAROM_DEBUG_VERSION,
  clearWorld: (s) => ({ ...clone(s), ball: null, obstacles: [] }),
  spawnBall: (s) => ({ ...clone(s), ball: parked() }),
  spawnObstacle: (s, i) => ({
    ...clone(s),
    obstacles: [...s.obstacles.filter((o) => o.index !== i), obstacle(i)].sort(
      (a, b) => a.index - b.index,
    ),
  }),
  reset: (s) => titleState(s.muted),
  reconcile: (s) => clone(s),
  setScreen: (s, v) => ({ ...clone(s), screen: v }),
  setMode: (s, v) => ({ ...clone(s), mode: v }),
  setMenuIndex: (s, v) => ({ ...clone(s), menuIndex: v }),
  setTitleIndex: (s, v) => ({ ...clone(s), titleIndex: v }),
  setResumeScreen: (s, v) => ({ ...clone(s), resumeScreen: v }),
  setScore: (s, p1, p2) => ({ ...clone(s), score: { p1, p2 } }),
  setWinner: (s, v) => ({ ...clone(s), winner: v }),
  setReceiver: (s, v) => ({ ...clone(s), receiver: v }),
  setPaddleCy: (s, side, cy) => setPaddle(s, side, { ...s.paddles[side], cy }),
  setPaddleVy: (s, side, drivenVy) =>
    setPaddle(s, side, { ...s.paddles[side], drivenVy }),
  setPaddleDriven: (s, side, driven) =>
    setPaddle(s, side, { ...s.paddles[side], driven }),
  setBallPosition: (s, x, y) => ({
    ...clone(s),
    ball: { ...needBall(s), x, y },
  }),
  setBallVelocity: (s, vx, vy) => ({
    ...clone(s),
    ball: { ...needBall(s), vx, vy },
  }),
  setBallSpin: (s, spin) => ({ ...clone(s), ball: { ...needBall(s), spin } }),
  setBallHeld: (s, held) => ({ ...clone(s), ball: { ...needBall(s), held } }),
  setBallHoldTimer: (s, holdTimer) => ({
    ...clone(s),
    ball: { ...needBall(s), holdTimer },
  }),
  setBallServeSign: (s, serveSign) => ({
    ...clone(s),
    ball: { ...needBall(s), serveSign },
  }),
  drawBallServeSign: (s) => ({
    ...clone(s),
    ball: { ...needBall(s), serveSign: serveSign() },
  }),
  setAiTracking: (s, tracking) => ({ ...clone(s), ai: { ...s.ai, tracking } }),
  setAiMovement: (s, movement) => ({ ...clone(s), ai: { ...s.ai, movement } }),
  setMuted: (s, muted) => ({ ...clone(s), muted }),
  snapshot: (s) => ({
    version: CAROM_DEBUG_VERSION,
    ...clone(s),
    ball: s.ball
      ? {
          ...s.ball,
          speed: Math.hypot(s.ball.vx, s.ball.vy),
          trail: s.ball.trail.map((p) => ({ ...p })),
        }
      : null,
  }),
  menuItemRect: (s, i) => menuRect(s.screen, i),
};

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>) {
    ACTIONS.forEach((a) => api.input.register(a, { keys: [...BINDINGS[a]] }));
    api.audio.define(CUES.paddleHit, {
      wave: "square",
      freq: 520,
      freqTo: 780,
      durationMs: 45,
      gain: 0.11,
    });
    api.audio.define(CUES.wallBounce, {
      wave: "triangle",
      freq: 240,
      freqTo: 180,
      durationMs: 60,
      gain: 0.1,
    });
    api.audio.define(CUES.obstacleBounce, {
      wave: "sawtooth",
      freq: 330,
      freqTo: 220,
      durationMs: 70,
      gain: 0.08,
    });
    api.audio.define(CUES.score, {
      wave: "sine",
      freq: 440,
      freqTo: 880,
      durationMs: 180,
      gain: 0.15,
    });
    const d = (
      name: string,
      source: (s: DeepReadonly<CaromState>) => string | number,
    ) => api.diagnostics.register(name, source);
    d("screen", (s) => s.screen);
    d("mode", (s) => s.mode);
    d("score", (s) => `${s.score.p1}-${s.score.p2}`);
    d("ball position", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
    );
    d("ball velocity", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
    );
    d("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : "none",
    );
    d("ball spin", (s) => (s.ball ? s.ball.spin : "none"));
    d(
      "left paddle",
      (s) =>
        `${s.paddles.left.cy.toFixed(1)} / ${s.paddles.left.vy.toFixed(1)}`,
    );
    d(
      "right paddle",
      (s) =>
        `${s.paddles.right.cy.toFixed(1)} / ${s.paddles.right.vy.toFixed(1)}`,
    );
    return [titleState(), debug];
  },
  update(state, api, dt) {
    let s = clone(state);
    const press = (a: string) => api.input.pressed(a);
    if (press("mute")) {
      s = { ...s, muted: !s.muted };
      api.audio.setMuted(s.muted);
    } else if (api.audio.muted() !== s.muted) api.audio.setMuted(s.muted);
    const up = press("p1-up") || press("p2-up"),
      down = press("p1-down") || press("p2-down"),
      yes = press("confirm"),
      back = press("back"),
      pause = press("pause");
    if (menuItems(s.screen)) {
      if (s.screen === "paused" && (pause || back))
        s = { ...s, screen: s.resumeScreen };
      else if (
        (s.screen === "howto" && (yes || back)) ||
        (s.screen === "matchover" && back)
      )
        s = returnTitle(s);
      else if (up || down) {
        const count = menuItems(s.screen)!.length;
        s = { ...s, menuIndex: (s.menuIndex + (up ? -1 : 1) + count) % count };
      } else if (yes) s = confirm(s);
      const p = api.input.pointer(),
        hit =
          menuItems(s.screen)?.findIndex((_, i) => {
            const r = menuRect(s.screen, i)!;
            return (
              p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
            );
          }) ?? -1;
      if (hit >= 0) {
        s = { ...s, menuIndex: hit };
        if (api.input.pointerReleased()) s = confirm(s);
      }
    } else if ((s.screen === "countdown" || s.screen === "playing") && pause)
      s = { ...s, resumeScreen: s.screen, screen: "paused", menuIndex: 0 };
    if (s.screen === "countdown" || s.screen === "playing") {
      s = paddles(s, api, dt);
      if (s.ball) {
        if (s.screen === "countdown") {
          const holdTimer = s.ball.holdTimer - dt;
          if (holdTimer <= 0) {
            const dir = s.receiver === "left" ? -1 : 1;
            s = {
              ...s,
              screen: "playing",
              ball: {
                ...s.ball,
                held: false,
                holdTimer: 0,
                vx: dir * SERVE_SPEED * Math.cos(SERVE_ANGLE),
                vy: s.ball.serveSign * SERVE_SPEED * Math.sin(SERVE_ANGLE),
                trail: [],
              },
            };
          } else s = { ...s, ball: { ...s.ball, holdTimer } };
        } else s = stepPhysics(s, dt, api);
        if (s.ball) {
          const t = s.simTime + dt;
          s = {
            ...s,
            ball: {
              ...s.ball,
              trail: [...s.ball.trail, { x: s.ball.x, y: s.ball.y, t }].filter(
                (v) => t - v.t <= TRAIL_TIME,
              ),
            },
          };
        }
      }
    }
    return { ...s, simTime: s.simTime + dt, muted: api.audio.muted() };
  },
  render(state, api: RenderApi) {
    const c = api.ctx,
      bar = (x: number, y: number, w: number, h: number, color: string) => {
        c.fillStyle = color;
        c.beginPath();
        c.roundRect(x, y, w, h, 8);
        c.fill();
      };
    c.fillStyle = BACKGROUND;
    c.fillRect(0, 0, FIELD_W, FIELD_H);
    c.strokeStyle = "#28445b";
    c.lineWidth = 3;
    c.setLineDash([12, 16]);
    c.beginPath();
    c.moveTo(FIELD_CX, 45);
    c.lineTo(FIELD_CX, FIELD_H - 45);
    c.stroke();
    c.setLineDash([]);
    state.obstacles.forEach((o) =>
      bar(o.cx - 10, o.cy - 70, 20, 140, "#f5b84b"),
    );
    bar(
      P1_X0,
      state.paddles.left.cy - PADDLE_HALF,
      P1_X1 - P1_X0,
      PADDLE_H,
      "#45d9ff",
    );
    bar(
      P2_X0,
      state.paddles.right.cy - PADDLE_HALF,
      P2_X1 - P2_X0,
      PADDLE_H,
      "#ff5d9e",
    );
    if (state.ball) {
      c.strokeStyle = "rgba(239,250,255,.42)";
      c.lineWidth = BALL_R;
      c.lineCap = "round";
      c.beginPath();
      state.ball.trail.forEach((p, i) =>
        i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y),
      );
      c.stroke();
      c.fillStyle = "#f5fbff";
      c.beginPath();
      c.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
      c.fill();
    }
    c.textAlign = "center";
    c.fillStyle = "#dcecff";
    if (["playing", "countdown", "paused"].includes(state.screen)) {
      c.font = "700 40px system-ui";
      c.fillText(String(state.score.p1), 500, 72);
      c.fillText(String(state.score.p2), 780, 72);
      c.font = "600 15px system-ui";
      c.fillStyle = "#8ca9bd";
      c.fillText(
        state.mode === "solo" ? "SOLO // SPIN DUEL" : "VERSUS // LOCAL DUEL",
        FIELD_CX,
        104,
      );
    }
    if (!["playing", "countdown"].includes(state.screen)) {
      c.fillStyle = "rgba(5,12,20,.62)";
      c.fillRect(0, 0, FIELD_W, FIELD_H);
      c.fillStyle = "#eaf6ff";
      c.font = "800 72px system-ui";
      c.fillText(
        state.screen === "title"
          ? TITLE_TEXT
          : state.screen === "howto"
            ? "HOW TO PLAY"
            : state.screen === "paused"
              ? "PAUSED"
              : `${state.winner === "left" ? "LEFT" : "RIGHT"} WINS`,
        FIELD_CX,
        210,
      );
      if (state.screen === "howto") {
        c.font = "500 22px system-ui";
        c.fillStyle = "#b8d0e5";
        c.fillText("W/S move left • Arrow keys move right", FIELD_CX, 285);
        c.fillText(
          "Move as you strike to bend the ball with spin.",
          FIELD_CX,
          320,
        );
        c.fillText(
          "Bank shots around the amber obstacles to outplay your rival.",
          FIELD_CX,
          350,
        );
      }
      menuItems(state.screen)?.forEach((item, i) => {
        const r = menuRect(state.screen, i)!;
        c.fillStyle = i === state.menuIndex ? "#45d9ff" : "#29485f";
        c.fillRect(r.x, r.y, r.w, r.h);
        c.fillStyle = i === state.menuIndex ? "#051019" : "#dcecff";
        c.font = "700 20px system-ui";
        c.fillText(item, FIELD_CX, r.y + 30);
      });
    }
    c.textAlign = "left";
    c.font = "14px system-ui";
    c.fillStyle = "#8ca9bd";
    c.fillText(
      "W/S LEFT PADDLE     ↑/↓ RIGHT PADDLE     P PAUSE     M MUTE",
      36,
      696,
    );
  },
};
