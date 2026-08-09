// src/routes/FormatHelpScreen.tsx
// The entry-format reference, reachable from Settings at /help.
//
// It lives in the app rather than in a shared doc because the moment you need
// it is the moment you're staring at the composer with a packet in your hand —
// and because a format that changes and a document that doesn't is worse than
// no document. Everything here is verified against lib/foodQuery.ts.
//
// Deliberately short. The examples do the teaching; the rules underneath are
// there for the two or three cases the examples don't cover.

import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { eyebrow } from '@/components/ui/styles';

/** One "type this → get this" pair. Stacked rather than two columns: a full
 *  entry line is ~30 characters and would wrap badly beside its result on a
 *  narrow phone. */
function Example({ type, gives }: { type: string; gives: string }) {
  return (
    <li className="space-y-1">
      <code className="block font-mono text-[12.5px] leading-snug text-text">{type}</code>
      <p className="text-[12.5px] leading-snug text-muted">{gives}</p>
    </li>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 lg:p-5">
      <p className={eyebrow}>{label}</p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export function FormatHelpScreen() {
  return (
    <div className="px-4 pb-10 pt-3 lg:px-6 lg:pt-4">
      <Link
        to="/settings"
        className="-ml-1 inline-flex items-center gap-0.5 text-[13px] text-muted [@media(hover:hover)]:hover:text-text"
      >
        <ChevronLeft size={15} aria-hidden />
        Settings
      </Link>

      <h1 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.025em]">
        Entry format
      </h1>
      <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-muted">
        Type what you ate into the box on the day screen. Anything below works.
      </p>

      <div className="mt-5 space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0 lg:[&>*]:min-w-0">
        <Section label="Just the food">
          <ul className="space-y-3">
            <Example type="banana" gives="One typical medium banana." />
            <Example type="banana 120g" gives="Scaled to exactly 120g." />
            <Example type="2 eggs" gives="Two eggs, standard weight." />
            <Example type="chicken breast 8oz" gives="Ounces, pounds, kg and litres all convert." />
          </ul>
        </Section>

        <Section label="With the label's numbers">
          <ul className="space-y-3">
            <Example
              type="salmon 183g 25p 15c 10f"
              gives="Those macros are your total for the whole 183g."
            />
            <Example
              type="chicken 200g 31p 0c 4f /100g"
              gives="Facts are per 100g → doubled for your 200g."
            />
            <Example
              type="salmon 183g 25p 15c 10f 114g"
              gives="Ate 183g, facts describe 114g → 40g protein. A second weight is always what the numbers describe."
            />
            <Example
              type="protein bar per bar 210cal 20p 22c 7f x3"
              gives="Facts are for one bar; you had three."
            />
          </ul>
        </Section>

        <Section label="The rules">
          <ol className="list-none space-y-2.5 text-[13px] leading-relaxed text-muted">
            <li>
              <span className="text-text">First weight</span> = what you ate. The name can go
              before or after it.
            </li>
            <li>
              <span className="text-text">Second weight</span> = what the numbers describe. Or
              spell it: <code className="font-mono text-text">per 114g</code>,{' '}
              <code className="font-mono text-text">/100g</code>.
            </li>
            <li>
              <code className="font-mono text-text">per serving</code> — also per bar, pot, slice,
              scoop — means the facts are for one. The count says how many.
            </li>
            <li>Neither of those, and the numbers are your total.</li>
            <li>
              <code className="font-mono text-text">x2</code> or{' '}
              <code className="font-mono text-text">2x</code> at the end multiplies everything.{' '}
              <code className="font-mono text-text">x1.5</code> works too.
            </li>
            <li>
              Macros: <code className="font-mono text-text">31p 0c 4f</code>, or{' '}
              <code className="font-mono text-text">31g protein</code>, or{' '}
              <code className="font-mono text-text">protein 31</code>. Calories:{' '}
              <code className="font-mono text-text">380cal</code> or{' '}
              <code className="font-mono text-text">calories 380</code>.
            </li>
            <li>Give all four numbers — anything you leave out logs as zero.</li>
          </ol>
        </Section>

        <Section label="Two things that trip it up">
          <ul className="space-y-3 text-[13px] leading-relaxed text-muted">
            <li>
              Put weights <span className="text-text">before</span> nutrition words.{' '}
              <code className="font-mono">31g protein 200g chicken</code> reads the 31g as the
              amount. Every other ordering is fine.
            </li>
            <li>
              Don&apos;t repeat a letter. <code className="font-mono">25p 15f 10f</code> keeps the
              first fat and drops the second — you&apos;ll see the leftover stuck in the food&apos;s
              name.
            </li>
          </ul>
          <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
            The result is always shown before anything is saved, so a misread is visible — and
            anything logged can be undone.
          </p>
        </Section>
      </div>
    </div>
  );
}
