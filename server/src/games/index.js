// games/index.js — registry of playable games. GameManager looks games up here,
// keeping the engine reusable across Texas History units.

import sourceSleuth from './sourceSleuth.js';

export const GAMES = {
  [sourceSleuth.id]: sourceSleuth,
};

export function getGame(id) {
  return GAMES[id] || null;
}
