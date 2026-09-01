// Places every machine on the floor plan.
import * as THREE from 'three';
import { CabinetFactory } from './cabinets.js';
import { MidwayFactory } from './midway.js';
import { neonText } from './neon.js';

export function buildLayout(scene, batcher, screens) {
  const cab = new CabinetFactory(scene, batcher, screens);
  const mid = new MidwayFactory(scene, batcher, screens);
  const R = Math.PI;

  // ---- lobby ----
  mid.kiosk(-8.2, 7.2, R); mid.kiosk(-6.9, 7.2, R);
  mid.hostStand(4.2, 5.2, 0.35);

  // ---- left side: claws, uprights, skee-ball, hoops ----
  // claw island facing the aisle and lobby
  const claws = [[-5.2, -3.4, 0], [-6.4, -3.4, 0], [-7.6, -3.4, 0], [-5.2, -5.2, R], [-6.4, -5.2, R], [-7.6, -5.2, R]];
  claws.forEach(([x, z, r], i) => mid.claw(x, z, r, i));
  // upright rows (back to back) at z -10/-12 and -18/-20
  const rowGames = ['galaxy', 'breaker', 'brawl', 'raiders', 'breaker', 'galaxy'];
  const rowGames2 = ['brawl', 'raiders', 'galaxy', 'breaker', 'brawl', 'raiders'];
  for (let i = 0; i < 6; i++) {
    cab.place(rowGames[i], -12.6 + i * 0.74, -9.6, 0);
    cab.place(rowGames2[i], -12.6 + i * 0.74, -10.5, R);
  }
  for (let i = 0; i < 6; i++) {
    cab.place(rowGames2[(i + 2) % 6], -12.6 + i * 0.74, -17.6, 0);
    cab.place(rowGames[(i + 3) % 6], -12.6 + i * 0.74, -18.5, R);
  }
  // rhythm & dance island
  cab.place('beat', -5.5, -13.5, Math.PI / 2);
  cab.place('beat', -5.5, -15.3, Math.PI / 2);
  cab.place('dance', -6.2, -20.5, Math.PI / 2);
  // pinball row along the aisle
  for (let i = 0; i < 4; i++) cab.place(i % 2 ? 'dragon' : 'cosmic', -4.6, -24.5 - i * 0.9, Math.PI / 2);
  // skee-ball lanes along the left wall (players face the wall)
  mid.bankHeader(-23.5, -9.4, Math.PI / 2, 'SKEE-BALL', '#26e5ff', 6.5);
  for (let i = 0; i < 6; i++) mid.skeeball(-25.2, -7.0 - i * 1.15, -Math.PI / 2);
  // hoops along the left wall further back
  mid.bankHeader(-23.8, -19.6, Math.PI / 2, 'HOOP FEVER', '#ff5a3a', 8);
  for (let i = 0; i < 6; i++) mid.hoops(-26.2, -16.6 - i * 1.25, -Math.PI / 2);
  // air hockey and pushers at the back-left
  mid.airHockey(-22, -28, 0); mid.airHockey(-22, -31.2, 0); mid.airHockey(-22, -34.4, 0);
  mid.pusher(-14, -27, Math.PI / 2, 0); mid.pusher(-14, -28.3, Math.PI / 2, 1);
  mid.pusher(-14, -33, Math.PI / 2, 2);
  // uprights along the back-left
  for (let i = 0; i < 8; i++) cab.place(rowGames[i % 6], -20.5 + i * 0.74, -41.4, 0);

  // ---- right side: racers, uprights, deluxe, wheel, VR-ish deluxe ----
  mid.bankHeader(8.7, -4.2, 0, 'TURBO DRIFT GP', '#ffd23f', 8.2);
  for (let i = 0; i < 6; i++) cab.place(i < 3 ? 'turbo' : 'nitro', 5.6 + i * 1.25, -5.0, 0);
  for (let i = 0; i < 6; i++) {
    cab.place(rowGames2[i], 5.4 + i * 0.74, -11.4, 0);
    cab.place(rowGames[i], 5.4 + i * 0.74, -12.3, R);
  }
  cab.place('zombie', 6.0, -17.5, 0); cab.place('zombie', 8.2, -17.5, 0);
  cab.place('zombie', 6.0, -19.6, R); cab.place('zombie', 8.2, -19.6, R);
  for (let i = 0; i < 4; i++) cab.place(rowGames[(i + 1) % 6], 11.2, -15.5 - i * 0.78, -Math.PI / 2);
  mid.wheel(7.5, -26, 0); mid.wheel(11.5, -26, 0);
  mid.pusher(15.5, -26, 0, 3);
  // right wall: uprights and pinball
  for (let i = 0; i < 6; i++) cab.place(rowGames2[i], 27.2, -14 - i * 0.75, -Math.PI / 2);
  for (let i = 0; i < 4; i++) cab.place(i % 2 ? 'cosmic' : 'dragon', 27.2, -22 - i * 0.9, -Math.PI / 2);
  cab.place('dance', 22, -22, Math.PI / 2);
  cab.place('beat', 22, -25.5, Math.PI / 2);
  mid.airHockey(19, -33, Math.PI / 2); mid.airHockey(23, -33, Math.PI / 2);
  for (let i = 0; i < 8; i++) cab.place(rowGames2[i % 6], 13 + i * 0.74, -41.4, 0);
  // photo booth-like deluxe near the back-right
  cab.place('zombie', 24, -38.5, R * 0.75);

  // ---- back: Winner's Circle ----
  mid.prizeCounter(0, -38.6, -42);
  for (let i = 0; i < 4; i++) cab.place(rowGames[(i + 4) % 6], -10.5 + i * 0.74, -41.4, 0);
  for (let i = 0; i < 4; i++) cab.place(rowGames2[(i + 1) % 6], 9.5 + i * 0.74, -41.4, 0);

  // ---- bar ----
  mid.bar(scene);

  // decorative "VR ZONE" neon on the right wall
  const vr = neonText('VR ZONE', { color: '#8a3dff', height: 0.6, intensity: 2.4, backing: true });
  vr.position.set(27.6, 3.6, -12); vr.rotation.y = -Math.PI / 2; scene.add(vr);
  const play = neonText('PLAY', { color: '#ff3cac', height: 1.4, intensity: 2.4, backing: true });
  play.position.set(-27.6, 3.6, -28); play.rotation.y = Math.PI / 2; scene.add(play);

  return { cab, mid };
}
