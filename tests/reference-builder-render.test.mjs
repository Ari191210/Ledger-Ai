// Regression fence for the Reference Builder rendering path (M0-12, R.5).
//
// The tool used to render a string through `dangerouslySetInnerHTML`, which is
// a raw-HTML sink: anything reaching it — model output today, or a string a
// future edit routes through the same block — executes as markup. The fix
// removes the sink and renders every string as a React text child.
//
// There is no sanitiser to unit-test, because the fix is the *absence* of a
// sink rather than the neutralisation of one. So this suite asserts the two
// facts the safety of the page now rests on:
//
//   1. no raw-HTML sink exists anywhere in the page's rendering path
//      (`app/tools/reference-builder/page.tsx` and the AI-content renderer it
//      uses, `components/ai-output.tsx`), and the page's static copy is plain
//      text with no markup or HTML entities;
//   2. strings rendered as React children — which is how the page now renders
//      both its own copy and every AI-generated field — are escaped, so
//      script tags, event-handler attributes and `javascript:` URLs arrive as
//      inert text.
//
// Same node:test / no-framework convention as the other suites.
//
//   node --test tests/
//   node --test tests/reference-builder-render.test.mjs
//
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PAGE = path.join(root, 'app', 'tools', 'reference-builder', 'page.tsx');
const AI_OUTPUT = path.join(root, 'components', 'ai-output.tsx');

// Payloads representative of what a compromised or prompt-injected model could
// emit into any field this tool renders.
const PAYLOADS = [
  '<script>window.__xss = 1</script>',
  '<img src=x onerror="window.__xss=1">',
  '<a href="javascript:window.__xss=1">click</a>',
  '<iframe src="javascript:window.__xss=1"></iframe>',
  '"><svg onload=window.__xss=1>',
  '<object data="data:text/html;base64,PHNjcmlwdD48L3NjcmlwdD4="></object>',
];

describe('reference-builder: no raw-HTML sink in the rendering path', () => {
  for (const [label, file] of [['page', PAGE], ['AI output renderer', AI_OUTPUT]]) {
    test(`${label} contains no raw-HTML sink`, () => {
      const src = fs.readFileSync(file, 'utf8');
      // Comments in this repo may *name* the sink; only real usage matters, so
      // strip line and block comments before asserting.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      assert.ok(!/dangerouslySetInnerHTML/.test(code), `${file}: dangerouslySetInnerHTML reintroduced`);
      assert.ok(!/__html/.test(code), `${file}: __html reintroduced`);
      assert.ok(!/\.innerHTML\s*=/.test(code), `${file}: innerHTML assignment reintroduced`);
      assert.ok(!/insertAdjacentHTML/.test(code), `${file}: insertAdjacentHTML reintroduced`);
    });
  }

  test('static "Good to know" copy is plain text, not markup', () => {
    const src = fs.readFileSync(PAGE, 'utf8');
    const block = src.match(/GOOD_TO_KNOW[^=]*=\s*\[([\s\S]*?)\];/);
    assert.ok(block, 'GOOD_TO_KNOW copy block not found');
    // No tags and no HTML entities — the copy must not depend on being parsed
    // as HTML, because it never will be again.
    assert.ok(!/<[a-zA-Z/]/.test(block[1]), 'copy contains an HTML tag');
    assert.ok(!/&[a-zA-Z]+;|&#\d+;/.test(block[1]), 'copy contains an HTML entity');
  });
});

describe('reference-builder: model output renders as inert text', () => {
  for (const payload of PAYLOADS) {
    test(`escaped as a text child: ${payload.slice(0, 34)}`, () => {
      // Exactly how the page renders every string it shows — its own copy, the
      // formula/units/tips fields, and the mind-map and concept labels.
      const html = renderToStaticMarkup(
        React.createElement('div', { style: { fontSize: 12 } }, payload),
      );
      // Everything between the wrapper's own tags is the payload. If no angle
      // bracket survives there, nothing in it can be a tag, an attribute or a
      // URL — the payload is a string of characters, not markup.
      const inner = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</div>'));
      assert.ok(!inner.includes('<'), 'unescaped "<" survived — payload can open a tag');
      assert.ok(!inner.includes('>'), 'unescaped ">" survived — payload can close a tag');
      assert.ok(!/<script|<img|<iframe|<object|<embed|<svg/i.test(html), 'tag survived as markup');
      assert.ok(!/href\s*=\s*["']?javascript:/i.test(html), 'javascript: URL became an attribute');
      // The payload is still visible to the student — as characters.
      assert.ok(inner.includes('&lt;'), 'angle bracket not escaped');
    });
  }

  test('an attribute-position string cannot break out', () => {
    const html = renderToStaticMarkup(
      React.createElement('div', { title: '"><script>window.__xss=1</script>' }, 'x'),
    );
    assert.ok(!/<script/i.test(html), 'attribute escaped out of its quotes');
  });
});
