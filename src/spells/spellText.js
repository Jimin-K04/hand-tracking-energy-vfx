// src/spells/spellText.js

export function setSpellText(spellText, kind) {
  if (!spellText) return;

  spellText.replaceChildren();

  const sub = document.createElement('div');
  sub.className = 'spell-sub';

  const main = document.createElement('div');
  main.className = 'spell-main';

  spellText.classList.remove('blue');
  spellText.classList.remove('purple');

  if (kind === 'blue') {
    sub.textContent = '術式順転';
    main.textContent = '「蒼」';
    spellText.classList.add('blue');
  } else if (kind === 'purple') {
    sub.textContent = '虚式';
    main.textContent = '「茈」';
    spellText.classList.add('purple');
  } else {
    sub.textContent = '術式反転';
    main.textContent = '「赫」';
  }

  spellText.appendChild(sub);
  spellText.appendChild(main);
}

export function showSpellText(spellText, kind) {
  if (!spellText) return;

  setSpellText(spellText, kind);

  spellText.classList.add('show');
  spellText.classList.remove('hidden');
}

export function hideSpellText(spellText) {
  if (!spellText) return;

  spellText.classList.remove('show');
  spellText.classList.add('hidden');
}