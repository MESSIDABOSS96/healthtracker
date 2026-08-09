# Building with VZN

VZN is a calorie / training / body-weight tracker. Phone-first, installed as a
PWA, used on both phone and desktop. Its look is **high air, cloud light**: a
sky-blue and white world with deep-ink text, where every neutral is blue-biased
rather than grey.

## No provider, no theme setup

Components render correctly with **no wrapper of any kind**. There is no
ThemeProvider, no context, no init call — the design language lives entirely in
CSS custom properties on `:root`, which arrive with the stylesheet. Import a
component and use it.

```jsx
import { Card, CardHeader, CardTitle, CardMeta, CardContent, Meter } from 'vzn';

<Card>
  <CardHeader className="flex-row items-baseline justify-between">
    <CardTitle>Nutrition</CardTitle>
    <CardMeta>1,840 / 2,000 kcal</CardMeta>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="flex items-baseline justify-between text-[13px]">
      <span className="text-muted">Protein</span>
      <span className="stat text-text">148 / 180 g</span>
    </div>
    <Meter value={148} max={180} color="var(--ring-food)" ariaLabel="Protein" />
  </CardContent>
</Card>
```

Dark mode is a `.dark` class on `<html>` that swaps the same token values. Style
through tokens and both themes work for free; hardcode a colour and dark mode
breaks.

## Styling idiom: Tailwind utilities mapped to tokens

Style with utility classes. The colour, radius, shadow and easing utilities are
generated from VZN's tokens, so these class names ARE the design language:

| Family | Utilities |
|---|---|
| Surfaces | `bg-bg` `bg-surface` `bg-surface-2` `bg-track` `bg-accent-wash` `bg-closed-wash` |
| Text | `text-text` `text-muted` `text-faint` `text-accent` `text-danger` `text-warn` `text-closed` `text-on-accent` |
| Edges | `border-hairline` `border-border` |
| Fills | `bg-accent-solid` (pairs with `text-on-accent`) `bg-closed` |
| Radius | `rounded-sm` `rounded-md` `rounded-lg` `rounded-full` |
| Shadow | `shadow-contact` `shadow-card` `shadow-raised` |
| Easing | `ease-out-soft` `ease-out` |
| Type | `font-display` (body text needs no class — system-ui is the default) |

Three rules that carry most of the look:

- **`--text` / `--muted` / `--faint` are a hierarchy, not shades.** `text-faint`
  is deliberately below text contrast thresholds — placeholders, axis labels and
  decoration only, never content.
- **Numbers get `.stat`.** Every numeric readout — calories, macros, weights,
  streaks — takes `className="stat"`, which switches to the display face with
  tabular figures so digits in a column line up. Numbers are this app's content;
  this is the single most VZN-specific styling rule there is.
- **Depth, not outlines.** A container is `bg-surface` + `shadow-card` + a
  `border-hairline` edge, sitting on the `bg-bg` ground. `bg-surface-2` is the
  *inset* step — input wells and segmented troughs — lighter than surface in
  light mode, darker in dark.

Solid accent fills must use `bg-accent-solid` with `text-on-accent`. Plain
`--accent` is tuned for text and strokes; white on it only reaches 4.0:1.

## A hard constraint on the utility vocabulary

VZN compiles Tailwind with `source(none)` plus explicit `@source` lines, so the
shipped stylesheet contains **only the utilities the app itself already uses**.
A class that looks obviously valid may simply not exist — `ml-1.5` and
`text-[28px]` are both absent, and applying one silently does nothing.

This cuts both ways: some tokens exist without a matching utility. `--r-xs`,
`--r-xl`, `--ease-in-out` and `--ease-spring` are all defined, but because the
app never uses them there is no `rounded-xl` or `ease-pop` class. Reach for the
raw token in an inline `style` when you need one of those.

Read `styles.css` and the `_ds_bundle.css` it imports before using an unusual
utility, and prefer these known-present ones for layout glue: `flex` `flex-1`
`flex-row` `flex-wrap` `items-center` `items-baseline` `justify-between`
`gap-1` `gap-1.5` `gap-2` `gap-2.5` `gap-3` `gap-4` `space-y-1.5` `space-y-2`
`space-y-3` `space-y-4` `space-y-5`. Base text sizes run `text-[11px]` through
`text-[17px]`, then jump to `text-[22px]` `text-[26px]` `text-[30px]`
`text-[34px]` `text-[56px]`. Anything outside that list needs an inline `style`
rather than a class that will not resolve.

## The components

- **`Button`** — `variant`: `default` (accent fill, the committing action),
  `outline`, `ghost` (dismiss), `danger`. `size`: `sm` `default` `lg` `icon`.
  Always a capsule. Every variant presses on tap.
- **`Card`** + `CardHeader` / `CardTitle` / `CardMeta` / `CardContent` — the one
  container. `CardHeader` takes `className="flex-row items-baseline
  justify-between"` when it needs a right-hand readout, which is most of the
  time. `CardMeta` is that readout and already carries `.stat`.
- **`Meter`** — the one progress fill. `value`, `max`, `color` (pass a token
  string like `var(--ring-food)`, never a literal), `size` in px (6 for
  supporting rows, 8–10 for a headline bar). Fill clamps at 100%, so tint it to
  say "over" rather than letting a full bar imply on-target.
- **`Segmented`** — the one segmented control. Controlled: `value`, `onChange`,
  `options` (`{value, label}`), `ariaLabel`. Selection is a surface-and-shadow
  swap, not a sliding thumb.

Three ring hues carry meaning consistently: `--ring-food` sage for
nutrition, `--ring-lift` slate-ink for lifting, `--ring-cardio` warm clay for
cardio. `--closed` green means "you finished this" and is deliberately NOT the
accent — blue is the brand and means "where you are".

Also exported, as class strings rather than components: `focusRing`, `press`,
`field` (input wells), `eyebrow` (the ONE place uppercase tracking is used —
a structural break, not a decoration), `label`.

## Motion

UI transitions stay under 300ms and use `ease-out-soft`. There is no `ease-in`
in the token set on purpose. Everything tappable presses. Respect
`prefers-reduced-motion` in anything you animate.
