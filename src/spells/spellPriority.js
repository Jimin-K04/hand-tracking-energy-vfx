// src/spells/spellPriority.js

export function getPrioritySpell({
  isRedActive,
  redGestureFrames,
  reversalRedEffect,
  redSpellAnchor,

  blueSpellState,
  forwardBlueEffect,
  blueSpellAnchor,
}) {
  const redFlash = reversalRedEffect.getBurstFlashStrength?.() ?? 0;
  const blueFlash = forwardBlueEffect.getBurstFlashStrength?.() ?? 0;

  const redVisible =
    isRedActive ||
    redGestureFrames > 0 ||
    redFlash > 0.01 ||
    reversalRedEffect.isSpellNameVisible?.();

  const blueVisible =
    blueSpellState.active ||
    ['READY', 'CHARGING', 'COMPLETE', 'COLLAPSE', 'COOLDOWN'].includes(
      blueSpellState.state
    ) ||
    blueFlash > 0.01 ||
    (forwardBlueEffect.getCosmosAbsorption?.() ?? 0) > 0.02 ||
    forwardBlueEffect.isSpellNameVisible?.();

  if (redVisible) {
    return {
      key: 'red',
      effect: reversalRedEffect,
      anchor: redSpellAnchor,
      statusKo: '술식반전 혁',
      statusKanji: '術式反転「赫」',
    };
  }

  if (blueVisible) {
    return {
      key: 'blue',
      effect: forwardBlueEffect,
      anchor: blueSpellAnchor,
      statusKo: '술식순전 창',
      statusKanji: '術式順転「蒼」',
    };
  }

  return null;
}