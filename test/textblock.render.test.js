import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import TextBlock from '../src/components/renderers/TextBlock.svelte';

describe('TextBlock render', () => {
  let app;
  afterEach(() => { if (app) unmount(app); app = null; });

  it('injects sanitized content.html as visible text', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const block = {
      id: 4929062, kind: 'text', title: 'q',
      html: '<p>“Any fact becomes important when it’s connected to another.” </p>\n\n<p>― Umberto Eco, <em>Foucault’s Pendulum</em></p>',
    };
    app = mount(TextBlock, { target, props: { block } });
    console.log('RENDERED innerHTML:', target.innerHTML);
    console.log('textContent:', JSON.stringify(target.textContent));
    expect(target.querySelectorAll('p').length).toBe(2);
    expect(target.textContent).toContain('Umberto Eco');
  });

  it('empty html renders an empty wrapper (no crash)', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    app = mount(TextBlock, { target, props: { block: { id: 1, kind: 'text', title: 'x', html: '' } } });
    expect(target.querySelector('.at-text')).toBeTruthy();
  });
});
