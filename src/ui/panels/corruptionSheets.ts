// Posters and Nephews sheets.
import { CORRUPTION, NEPHEWS, NEPHEW_MAX_LEVEL } from '../../config/balance';
import { STRINGS, fmt } from '../../config/strings';
import { NEPHEW_IDS, activeCampaigns, nephewEffect, nephewHireCost, nephewSkim, nephewTrainCost, nephewUnlocked, posterCost, totalSkim } from '../../sim/corruption';
import type { GameState } from '../../state/types';
import type { SheetRow, SheetView } from './sheet';

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

export function postersView(state: GameState): SheetView {
  const now = state.lastSimTime;
  const live = state.posters.filter((t) => t > now);
  const freshest = live.length ? Math.max(...live) : 0;
  const cost = posterCost(state);
  return {
    title: STRINGS.posters.title,
    intro: STRINGS.posters.intro,
    status: fmt(STRINGS.posters.active, { n: activeCampaigns(state) }),
    rows: [
      {
        id: 'campaign',
        title: STRINGS.posters.buy,
        lines: freshest ? [fmt(STRINGS.posters.fades, { mins: Math.ceil((freshest - now) / 60000) })] : [`${CORRUPTION.posterLength / 60} min, +${CORRUPTION.posterInfluence} ${STRINGS.hud.influence}`],
        buttons: [{ id: 'poster', label: STRINGS.posters.buy, cost, error: state.taka < cost ? 'notEnoughTaka' : null, action: { type: 'poster' } }],
      },
    ],
  };
}

export function nephewsView(state: GameState): SheetView {
  const rows: SheetRow[] = NEPHEW_IDS.map((id) => {
    const n = state.nephews[id];
    const unlocked = nephewUnlocked(state, id);
    const shownLevel = n.level;
    const effect = n.hired ? nephewEffect(state, id) : NEPHEWS[id].effect + NEPHEWS[id].effectPerLevel * shownLevel;
    const does = fmt(STRINGS.nephews.does[id], { pct: pct(effect), hours: effect });
    const skim = n.hired ? nephewSkim(state, id) : Math.max(0, NEPHEWS[id].skim - NEPHEWS[id].skimPerLevel * shownLevel);
    const lines = unlocked ? [does, fmt(STRINGS.nephews.skim, { pct: pct(skim) }), fmt(STRINGS.nephews.level, { n: n.level, max: NEPHEW_MAX_LEVEL })] : [fmt(STRINGS.nephews.locked, { when: STRINGS.nephews.unlock[id] })];
    const buttons: SheetRow['buttons'] = [];
    if (unlocked && !n.hired) {
      const cost = nephewHireCost(state);
      buttons.push({ id: `hire-${id}`, label: STRINGS.nephews.hire, cost, error: state.taka < cost ? 'notEnoughTaka' : null, action: { type: 'hire', id } });
    }
    if (n.hired) {
      const cost = nephewTrainCost(state, id);
      buttons.push(
        n.level >= NEPHEW_MAX_LEVEL
          ? { id: `train-${id}`, label: STRINGS.nephews.maxed, error: 'nephewMaxed', action: { type: 'trainNephew', id } }
          : { id: `train-${id}`, label: STRINGS.nephews.upgrade, cost, error: state.taka < cost ? 'notEnoughTaka' : null, action: { type: 'trainNephew', id } },
      );
      buttons.push({ id: `fire-${id}`, label: STRINGS.nephews.fire, error: null, action: { type: 'fire', id }, quiet: true });
    }
    return { id, title: STRINGS.nephews.names[id] + (n.hired ? ` (${STRINGS.nephews.hired})` : ''), lines, buttons, dim: !unlocked };
  });
  return {
    title: STRINGS.nephews.title,
    intro: STRINGS.nephews.intro,
    status: fmt(STRINGS.nephews.totalSkim, { pct: pct(totalSkim(state)) }),
    rows,
  };
}
