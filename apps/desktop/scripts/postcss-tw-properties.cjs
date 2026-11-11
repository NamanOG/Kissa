/**
 * Tailwind v3 writes its ~50 `--tw-*` defaults onto every element and pseudo-element
 * (`*, ::before, ::after { --tw-translate-x: 0; ... }` and the same for `::backdrop`). That makes
 * every style recalculation re-apply them all, and a change to any variable on <html> (a song's
 * album colours) restyles the whole page at about twice the cost (measured 2026-11-11: ~75 ms
 * with the rule, ~30 ms without it, 560 elements).
 *
 * This moves them into `@property` registrations that do not inherit, with the same initial values,
 * as Tailwind v4 does. The rule reset them on every element, so they never inherited anyway: every
 * computed value is unchanged.
 */
const DEFAULT_SELECTORS = [
  ['*', '::after', '::before'],
  ['::backdrop']
]

function isDefaultsRule(rule) {
  const sel = rule.selectors.map((s) => s.trim()).sort()
  return DEFAULT_SELECTORS.some((d) => d.length === sel.length && d.every((s, i) => s === sel[i]))
}

/** @type {import('postcss').PluginCreator<void>} */
const twDefaultsToProperties = () => ({
  postcssPlugin: 'kissa-tw-defaults-to-properties',
  OnceExit(root, { AtRule, Declaration }) {
    const defaults = new Map()
    root.walkRules((rule) => {
      if (rule.parent?.type !== 'root' || !isDefaultsRule(rule)) return
      rule.walkDecls(/^--tw-/, (decl) => {
        if (!defaults.has(decl.prop)) defaults.set(decl.prop, decl.value.trim())
        decl.remove()
      })
      if (!rule.nodes?.length) rule.remove()
    })
    if (defaults.size === 0) return
    // After any @charset / @import, which must stay first.
    let anchor = null
    root.each((node) => {
      if (node.type === 'atrule' && (node.name === 'charset' || node.name === 'import')) anchor = node
    })
    const rules = [...defaults].map(([prop, value]) => {
      const at = new AtRule({ name: 'property', params: prop, raws: { between: ' ', semicolon: true } })
      at.append(new Declaration({ prop: 'syntax', value: "'*'" }))
      at.append(new Declaration({ prop: 'inherits', value: 'false' }))
      at.append(new Declaration({ prop: 'initial-value', value }))
      return at
    })
    if (anchor) anchor.after(rules)
    else root.prepend(rules)
  }
})
twDefaultsToProperties.postcss = true

module.exports = twDefaultsToProperties
