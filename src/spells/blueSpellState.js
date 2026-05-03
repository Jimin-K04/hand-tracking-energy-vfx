// src/spells/blueSpellState.js

export class BlueSpellState {
  constructor(effect) {
    this.effect = effect;

    this.state = 'IDLE';
    this.charge = 0;
    this.active = false;

    this.lastPalmAngle = null;
    this.collapseStart = 0;
    this.cooldownUntil = 0;
  }

  reset() {
    this.state = 'IDLE';
    this.charge = 0;
    this.active = false;
    this.lastPalmAngle = null;
    this.collapseStart = 0;
    this.cooldownUntil = 0;

    this.effect.setActive(false);
    this.effect.setCharge(0);
    this.effect.setCollapseActive(false);
  }

  update(spellResult, now) {
    let palmTwisted = false;
    const palmAngle = spellResult.bluePalmAngle;

    if (this.lastPalmAngle !== null) {
      let delta = palmAngle - this.lastPalmAngle;

      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;

      palmTwisted = Math.abs(delta) > 0.14;
    }

    this.lastPalmAngle = palmAngle;

    if (this.state === 'COOLDOWN' && now >= this.cooldownUntil) {
      this.state = 'IDLE';
    }

    switch (this.state) {
      case 'IDLE': {
        this.charge = 0;

        if (spellResult.isBluePalmOpen) {
          this.state = 'READY';
          this.charge = 0.05;
        }
        break;
      }

      case 'READY': {
        this.charge = Math.max(0.05, spellResult.blueCompression * 0.35);

        if (!spellResult.isBluePalmOpen && spellResult.blueCompression < 0.04) {
          this.state = 'IDLE';
          this.charge = 0;
        } else if (spellResult.blueCompression > 0.08) {
          this.state = 'CHARGING';
        }
        break;
      }

      case 'CHARGING': {
        this.charge = Math.max(0.06, spellResult.blueCompression);

        if (spellResult.blueCompression < 0.04 && !spellResult.isBluePalmOpen) {
          this.state = 'IDLE';
          this.charge = 0;
        } else if (spellResult.isBlueFist) {
          this.state = 'COMPLETE';
          this.charge = 1;
        }
        break;
      }

      case 'COMPLETE': {
        this.charge = 1;

        if (!spellResult.isBlueFist && spellResult.blueCompression < 0.68) {
          this.state = 'CHARGING';
          this.charge = spellResult.blueCompression;
        } else if (palmTwisted) {
          this.state = 'COLLAPSE';
          this.collapseStart = now;
        }
        break;
      }

      case 'COLLAPSE': {
        this.charge = 1;

        if (now - this.collapseStart > 1200) {
          this.state = 'COOLDOWN';
          this.cooldownUntil = now + 300;
        }
        break;
      }

      case 'COOLDOWN': {
        this.charge = Math.max(0, this.charge - 0.08);
        break;
      }
    }

    const effectActive = [
      'READY',
      'CHARGING',
      'COMPLETE',
      'COLLAPSE',
    ].includes(this.state);

    this.active = effectActive;

    this.effect.setActive(effectActive);
    this.effect.setCharge(effectActive ? this.charge : 0);
    this.effect.setCollapseActive(this.state === 'COLLAPSE');
  }
}