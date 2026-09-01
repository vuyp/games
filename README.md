# D&B Arcade Simulator

A first-person, Dave & Buster's–style arcade you can walk through and play, built with [Three.js](https://threejs.org/).
You start on the sidewalk under the entrance canopy, walk through the automatic glass doors, and the whole
Million Dollar Midway, the sports bar and the Winner's Circle prize counter open up in front of you.

Everything is generated procedurally at runtime: there are no image, model or audio assets to download.

> Unofficial fan project. Not affiliated with, sponsored by, or endorsed by Dave & Buster's.

## Play it

```bash
npm install        # installs three + esbuild
npm start          # serves the repo at http://localhost:8080 (uses the jsDelivr CDN for three.js)
```

Or build the single-file version, which inlines Three.js and works offline from any static host:

```bash
npm run build      # writes dist/arcade.html (~800 KB)
npm run preview    # builds, then serves dist/ at http://localhost:8081
```

`index.html` needs to be served over HTTP (ES modules and pointer lock don't work from `file://`).
`dist/arcade.html` can simply be opened in a browser.

## Controls

| Key | Action |
| --- | --- |
| Mouse | Look |
| `W` `A` `S` `D` | Walk |
| `Shift` | Run |
| `E` or left click | Interact / play the machine you're looking at |
| `Q` | Walk away from a game or close a menu |
| `M` | Toggle the music loop |
| `F` | Flashlight |
| `F3` | FPS / draw-call counter |
| `Esc` | Release the mouse (pause) |

A desktop browser with a mouse is recommended. Pick **High** quality on a discrete GPU (bloom, soft shadows,
SMAA and a real-time reflective lobby floor), **Medium** on a laptop, **Low** on integrated graphics.

## What's inside

**The venue**

- Night-time exterior with the illuminated facade sign, canopy downlights, planters, bollards, a parking lot with
  lamp posts and parked cars, and a city skyline on the horizon.
- Glass storefront with automatic swinging doors that open as you approach.
- Lobby on polished porcelain tile with the host stand, Power Card recharge kiosks, neon slogan walls and the
  chasing-bulb **Million Dollar Midway** arch.
- The midway on classic "cosmic" arcade carpet under an exposed black ceiling with trusses, ducts and track lights.
- A sports bar with a bottle-lined back bar, taps, stools, high-tops, pendant lights, booths and a 3×2 video wall
  plus TVs showing a live "broadcast".
- The **Winner's Circle** redemption counter with shelves of prizes and a ticket eater.
- Hanging directional signs, exit signs, restrooms, posters and hours by the door.

**Machines (about 90)**

- Upright cabinets with side art, marquees, joysticks, buttons, coin doors, T-molding and Power Card readers.
- Sit-down racing bank with linked header sign, light-gun booths, rhythm and dance machines, pinball tables.
- Six Skee-Ball lanes, six basketball cages, six claw machines, two Mega Spin prize wheels, air hockey tables and
  coin pushers, all with chasing marquee bulbs.
- Every screen runs a live attract-mode animation drawn on a canvas.

**Playable games (chips in, tickets out)**

| Where | Game | How |
| --- | --- | --- |
| Uprights | Galaxy Defender / Star Raiders | arrows to move, Space to fire |
| Uprights | Neon Breaker | arrows or mouse, Space to launch |
| Uprights | Street Brawlers II | A/D move, Space punch, S block |
| Racing bank | Turbo Drift GP / Nitro Rush | arrows to steer and accelerate, 60 s time trial |
| Rhythm & dance | Beat Rush / Dance Fever | D F J K or arrows on the beat |
| Light-gun booth | Zombie Alley | mouse to aim, click to shoot, R to reload |
| Pinball | Cosmic Pinball / Dragon Fire | left/right flippers, hold Space to plunge |
| Skee-Ball | 9 balls | hold the mouse button to charge, move to aim, release |
| Hoop Fever | 45 s | look at the hoop, hold to charge, release to shoot (arc preview) |
| Prize Claw | 25 s | WASD to position, Space to drop |
| Mega Spin | one spin | tickets from the wheel segment, including a 1,000-ticket jackpot |

Redeem tickets at the Winner's Circle, recharge chips at a kiosk, or order a drink at the bar.
Your Power Card (chips, tickets, prizes, high scores) is saved in `localStorage`.

## How it's built

```
index.html            page shell, HUD markup, import map (dev)
src/main.js           renderer, post-processing, environment capture, game loop, input routing
src/textures.js       procedural canvas textures (carpet, tile, concrete, metal, wood, signs, art)
src/materials.js      shared PBR materials
src/world.js          static-geometry batcher, collision boxes, interactables, per-frame updaters
src/neon.js           neon text planes, lit box signs, chasing marquee bulbs (InstancedMesh)
src/screens.js        attract-mode canvas animations shared per game
src/cabinets.js       cabinet factory (upright, racer, light-gun, rhythm, dance, pinball)
src/midway.js         skee-ball, hoops, claws, wheel, air hockey, pushers, prize counter, kiosk, bar
src/building.js       exterior, facade, shell, ceiling rig, lobby, lighting
src/layout.js         floor plan: where every machine goes
src/player.js         pointer-lock FPS controller with sliding collision, camera rig
src/minigames.js      the seven canvas games
src/stations.js       game sessions, economy hooks, prize/kiosk menus
src/audio.js          Web Audio ambience, music loop and SFX
src/hud.js            DOM overlay
src/state.js          Power Card persistence
scripts/build.mjs     esbuild single-file bundler
```

Rendering notes:

- All static geometry is merged per material into a few dozen draw calls; only screens, bulbs and moving parts
  are separate objects.
- Reflections come from a cube map captured inside the arcade at startup and filtered with PMREM, so glossy
  cabinets and glass reflect the neon-lit room.
- ACES tone mapping, Unreal-style bloom on neon and screens, additive light pools under machines, exponential fog,
  and shadow-casting spotlights at the entrance and along the main aisle.
