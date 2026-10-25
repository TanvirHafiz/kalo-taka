// Posters and Nephews sheets.
import { CORRUPTION, NEPHEWS, NEPHEW_MAX_LEVEL } from '../../config/balance';
import { DESTINATIONS, PRESTIGE } from '../../config/events';
import { FLEE, STRINGS, fmt } from '../../config/strings';
import { canFlee, destinationUnlocked, starOffer } from '../../sim/prestige';
import { NEPHEW_IDS, activeCampaigns, journalistCost, ledgerOf, nephewEffect, nephewHireCost, nephewSkim, nephewTrainCost, nephewUnlocked, posterCost, totalSkim } from '../../sim/corruption';
import { totalIncome } from '../../sim/economy';
import type { GameState } from '../../state/types';
import { formatRate, formatTaka } from '../../util/money';
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
      {
        id: 'journalists',
        title: STRINGS.posters.journalists,
        lines: [`${STRINGS.hud.media}: ${Math.round(state.heat.media)}`, fmt(STRINGS.posters.journalistsNote, { n: CORRUPTION.journalistMedia })],
        buttons: [{ id: 'pay-journalists', label: STRINGS.posters.journalists, cost: journalistCost(state), error: state.taka < journalistCost(state) ? 'notEnoughTaka' : state.heat.media <= 0 ? 'alreadyDone' : null, action: { type: 'payJournalists' } }],
      },
    ],
  };
}

export function nephewsView(state: GameState): SheetView {
  const ledger = ledgerOf(state);
  // income before the family's cut, so each nephew's share can be shown in Taka
  const share = totalSkim(state);
  const gross = share < 1 ? totalIncome(state, false) / (1 - share) : 0;
  const rows: SheetRow[] = NEPHEW_IDS.map((id) => {
    const n = state.nephews[id];
    const unlocked = n.hired || nephewUnlocked(state, id);
    const shownLevel = n.level;
    const effect = n.hired ? nephewEffect(state, id) : NEPHEWS[id].effect + NEPHEWS[id].effectPerLevel * shownLevel;
    const does = fmt(STRINGS.nephews.does[id], { pct: pct(effect), hours: effect });
    const skim = n.hired ? nephewSkim(state, id) : Math.max(0, NEPHEWS[id].skim - NEPHEWS[id].skimPerLevel * shownLevel);
    const skimLine = n.hired
      ? fmt(STRINGS.nephews.skimLedger, { pct: pct(skim), rate: formatRate(gross * skim), total: formatTaka(ledger.skimmed[id] ?? 0) })
      : fmt(STRINGS.nephews.skim, { pct: pct(skim) });
    const lines = unlocked ? [does, skimLine, fmt(STRINGS.nephews.level, { n: n.level, max: NEPHEW_MAX_LEVEL })] : [fmt(STRINGS.nephews.locked, { when: STRINGS.nephews.unlock[id] })];
    if (id === 'rony' && (n.hired || ledger.ronyBags > 0)) {
      lines.splice(1, 0, fmt(STRINGS.nephews.ronyLedger, { amount: formatTaka(ledger.ronyCollected), bags: ledger.ronyBags === 1 ? STRINGS.nephews.bags.one : fmt(STRINGS.nephews.bags.many, { n: ledger.ronyBags }), kept: formatTaka(ledger.ronyKept) }));
    }
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
    status: fmt(STRINGS.nephews.totalSkim, {
      pct: pct(share),
      rate: formatRate(gross * share),
      total: formatTaka(Object.values(ledger.skimmed).reduce((a, b) => a + (b ?? 0), 0)),
    }),
    rows,
  };
}

const PERK_AT = [PRESTIGE.perkPlotsAt, PRESTIGE.perkCashAt, PRESTIGE.perkEarlyUnlockAt, PRESTIGE.perkShortInquiryAt, PRESTIGE.perkFreeDotolaAt];

export function fleeView(state: GameState): SheetView {
  const offer = starOffer(state);
  const total = state.stars + offer;
  const rows: SheetRow[] = DESTINATIONS.map((d) => {
    const text = FLEE.destinations[d.id];
    const open = destinationUnlocked(d.id, total);
    return {
      id: `dest-${d.id}`,
      title: text.name,
      lines: open ? [text.perk] : [text.perk, fmt(FLEE.lockedAt, { n: d.atStars })],
      buttons: [{ id: `flee-${d.id}`, label: FLEE.confirm, error: canFlee(state, d.id), action: { type: 'flee', destination: d.id } }],
      dim: !open,
    };
  });
  rows.push({
    id: 'perks',
    title: FLEE.perksTitle,
    lines: FLEE.perks.map((p, i) => `${total >= PERK_AT[i]! ? '\u2713' : '\u2022'} ${PERK_AT[i]}: ${p}`),
    buttons: [],
  });
  return {
    title: FLEE.title,
    intro: `${FLEE.intro} ${FLEE.keeps}`,
    status: `${fmt(FLEE.offer, { n: offer })} \u00b7 ${fmt(FLEE.total, { n: total, pct: `${Math.round(total * PRESTIGE.incomePerStar * 100)}%` })}`,
    rows,
  };
}
