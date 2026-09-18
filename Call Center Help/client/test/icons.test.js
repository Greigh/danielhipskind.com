/**
 * @jest-environment jsdom
 */
import { icon, hydrateIcons, initialsAvatar, priorityDot, EMOJI_TO_ICON } from '../src/js/utils/icons.js';

describe('native icons', () => {
  test('icon returns stroke svg without emoji', () => {
    const html = icon('phone');
    expect(html).toMatch(/<svg/);
    expect(html).not.toMatch(/📞/);
  });

  test('hydrateIcons fills data-icon slots', () => {
    document.body.innerHTML = '<span class="ui-icon" data-icon="settings"></span>';
    hydrateIcons(document);
    expect(document.querySelector('svg')).toBeTruthy();
  });

  test('initialsAvatar and priorityDot are non-emoji', () => {
    expect(initialsAvatar('Alice Johnson')).toMatch(/AJ/);
    expect(priorityDot('high')).toMatch(/priority-high/);
    expect(priorityDot('high')).not.toMatch(/🔴/);
  });

  test('emoji map covers common UI glyphs', () => {
    expect(EMOJI_TO_ICON['⚙️']).toBe('settings');
    expect(EMOJI_TO_ICON['📞']).toBe('phone');
  });
});
