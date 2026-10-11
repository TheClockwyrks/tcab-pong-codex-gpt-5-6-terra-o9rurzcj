import { describe, expect, it } from "vitest";
import { type CaromDebugApi, type CaromState, game } from "./game";

const init = () => {
  const input = { register: () => undefined, layout: () => null };
  const audio = { define: () => undefined, load: async () => undefined };
  const diagnostics = { register: () => undefined };
  return game.initialize({ input, audio, diagnostics } as never) as [
    CaromState,
    CaromDebugApi,
  ];
};

describe("Carom simulation", () => {
  it("parks a ball and serves toward its receiver", () => {
    const [state, debug] = init();
    let next = debug.setScreen(state, "countdown");
    next = debug.setBallServeSign(next, 1);
    next = debug.setBallHoldTimer(next, 0);
    const api = {
      input: {
        value: () => 0,
        pressed: () => false,
        pointer: () => ({ x: 0, y: 0 }),
        pointerReleased: () => false,
      },
      audio: {
        muted: () => false,
        setMuted: () => undefined,
        play: () => undefined,
      },
    };
    next = game.update(next, api as never, 0.01);
    expect(next.screen).toBe("playing");
    expect(next.ball?.vx).toBeLessThan(0);
    expect(next.ball?.held).toBe(false);
  });

  it("debug poses do not mutate their input and derive speed", () => {
    const [state, debug] = init();
    const next = debug.setBallVelocity(state, 3, 4);
    expect(state.ball?.vx).toBe(0);
    expect(
      (debug.snapshot(next) as { ball: { speed: number } }).ball.speed,
    ).toBe(5);
  });

  it("removes the world and restores it on reset", () => {
    const [state, debug] = init();
    const empty = debug.clearWorld(state);
    expect(debug.snapshot(empty)).toMatchObject({ ball: null, obstacles: [] });
    expect(debug.reset(empty)).toMatchObject({
      screen: "title",
      obstacles: [{ index: 0 }, { index: 1 }],
    });
  });
});
