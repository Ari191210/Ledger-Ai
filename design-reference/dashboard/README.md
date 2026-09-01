# Dashboard reference images

Drop your reference images in this folder. Any format, any names.

Tell me when they are here and I will apply them to the dashboard that now
exists at `/dashboard`.

## What is already built

The structure is in place and working, so the images are applied to something
real rather than used to invent one from scratch:

- **Today is a card, not a room.** It shows how many items are open and has
  one control that opens `/today`. That was the instruction: Today should be
  chosen, not walked into.
- **A record strip:** occurrences, papers, sessions, live patterns.
- **Go to:** record, diagnosis, tools.
- Swan palette, real 375px layout with no horizontal overflow, guarded by
  `AuthGuard`, first-run walkthrough on `?first=1`.

## What I need to know from the images

Whatever they show, but especially:

1. **What belongs on this screen** that is not there yet.
2. **What should be biggest.** Right now "Your ledger" is the heading and the
   Today card is the only emphasised block.
3. **Whether the record strip should stay four figures**, or become something
   else entirely.

## One constraint worth knowing before you choose

A student who has just finished onboarding has **no papers, no sessions, no
mistakes**. Every figure is zero on day one.

`/home` was rejected three times partly because it looked empty, so whatever
the images show has to be correct in that state too. If a design depends on
having data to look right, it will look wrong to every new student on the day
they sign up, which is the only day that decides whether they come back.

## Material still available

Not deleted, currently unmounted, and usable if the images point that way:

- `components/dashboard/` — masthead, personal-edition, recommended-action,
  by-the-numbers, coverage, academic-markets
- `lib/home/` — the composition, layout and importance engine
- `lib/ledger-score.ts`, `lib/ledger-score-v2.ts`, `lib/score-projection.ts`
