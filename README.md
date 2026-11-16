# FLOODWORKS

![make.fun best-game-01](https://make.fun/badge/best-game-01.svg)
![Rank](https://make.fun/badge/best-game-01/syahruldyh/best-game-01/rank.svg)
![Reward](https://make.fun/badge/best-game-01/syahruldyh/best-game-01/reward.svg)

**Six storms are coming. One canal. Three districts. You hold the gates.**

## What it is

FLOODWORKS is an emergency canal-control game. You are the keeper of a city's flood gates on the worst night of the year. Storm water pours down three channels, and every unit of water has to go somewhere: into the North Basin, into the East Tank, or down the shared spillway drain. The districts behind the levees — Old Mill, Market Row, Lowfield — survive only as long as you keep the water moving somewhere else.

This is not a tower defense and there is no shooting. The verb is routing: one click opens a gate, and the whole river changes its mind.

## How to play

- **Click gates G1–G6** to open or shut them. Open gates route water into reservoirs; shut gates hold it back in the channels.
- **Route water into reservoirs** (North Basin, East Tank) to score big — reservoir diverts pay a **10x combo**. The spillway drain is always safe, but only pays **4x**. Greed is how you win big; the drain is how you survive.
- **Six storms, growing harder.** Storm 1 is a drizzle. Storm 6 is THE DELUGE. Between storms, spend your earnings in the intermission:
  - **Reinforce Levee** — a district takes more water before it floods.
  - **Emergency Pump (E)** — empties a reservoir instantly, mid-storm.
  - **Dredge Channel** — a channel carries more water per second.
- **Repair crews** drain 15% flood from each surviving district after every storm you clear — a breather, not a bailout.

## Win / Lose

- **WIN:** all three districts are still standing after the sixth storm. Your score is your rank — big reservoir combos are what separate a save from a legend.
- **LOSE:** any district floods to 100%. The river does not negotiate.

## Controls

| Input | Action |
|---|---|
| Mouse click | Open/shut a gate, buy an upgrade card |
| Space | Start the next storm |
| E | Emergency pump |
| P | Pause / resume |
| R | Restart the run |

## Tech notes

- Plain 2D canvas, no engine, no dependencies. Runs from static files — open `game/index.html` and play.
- No network, no build step. All art is drawn in code; all sound is synthesized live with WebAudio (clicks, gurgles, alarms, storm stingers).
- Source is split by job: `config.js` (layout, storms, gates, upgrades), `sim.js` (routing, storms, scoring, win/loss), `render.js` (HUD, map, panels), `input.js`, `audio.js`, `shots.js` (screenshot staging), `main.js` (boot + game loop).
- Built for the make.fun best-game-01 bounty: [make.fun/bounty/best-game-01](https://make.fun/bounty/best-game-01)

## License

MIT — see `LICENSE`.
