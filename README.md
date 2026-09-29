# Ansha's Donut Planner

A phone-friendly planner for the donut-making feature in **Pokémon Legends: Z-A – Mega Dimension**.
Enter the berries you own (by screenshot or by name), set a star target for each donut you want to make,
and get recipes that fit inside your inventory.

Live page: https://claude.ai/artifact/SENhHjfJistusMXNZPtnTF

Source: `donut-planner/index.html` (single self-contained page, no build step).

## What it does

- **Screenshot reading.** In the claude.ai viewer the page can send your inventory screenshots to Claude and
  read berry names and quantities from them (viewer consent is asked on the first use). Outside that viewer the
  upload control hides itself and you add berries by name.
- **Editable inventory.** Every detected or added berry shows up in a list with a quantity stepper, so misreads
  are a one-tap fix. The list is remembered in your browser.
- **Per-donut targets.** Choose how many donuts to make, tap a star target for each one, and optionally pick a
  flavor to make dominant (Sweet for shiny/alpha odds, Spicy for attack, Sour for items, Bitter for defense,
  Fresh for catching/encounters).
- **Inventory-safe recipes.** Recipes for all donuts together never use more of a berry than you have.
  "Save berries" hits each target with the least flavor spent; "Strongest" then fills leftover slots.
- **Clear shortfalls.** When a target can't be reached, the card shows the best donut you can make and exactly
  which berries to add or swap to get there. "Made it" removes a recipe's berries from the inventory.

## Game mechanics implemented

| Rule | Value | Source |
|---|---|---|
| Flavor Score | Sum of all five flavor values across the berries used | Game8, Rotom Labs |
| Star thresholds | ★120 · ★★240 · ★★★350 · ★★★★700 · ★★★★★960 | Game8, Bulbapedia, Rotom Labs code |
| Multiplier | ×1.1 / ×1.2 / ×1.3 / ×1.4 / ×1.5 for 1–5 stars, applied to Level Boost and Donut Energy (floored) | Game8, Rotom Labs code |
| Berry slots | 3 at first, one more per butter upgrade, 8 max; repeats allowed | Serebii, Game8 |
| Donut type | Highest flavor; tie = Rainbow | Lusamine gist, Rotom Labs |
| Flavor Power budget | Per-flavor thresholds 120/160/200/300/360/420/525/700/760 → 1–9 points; Rainbow +1 | Lusamine gist (disassembly) |
| Berry table | 66 berries (33 regular, 33 Hyper); Serebii and PKHeX-derived Rotom Labs data agree on every value | Serebii, Rotom Labs |

Sources:

- Game8 – How to Raise Flavor Score: https://game8.co/games/Pokemon-Legends-Z-A/archives/573580
- Game8 – How to Raise Donut Energy: https://game8.co/games/Pokemon-Legends-Z-A/archives/573672
- Serebii – Ansha's Donuts (berry table): https://www.serebii.net/legendsz-a/anshasdonuts.shtml
- Lusamine – technical explanation of donut generation (disassembly): https://gist.github.com/Lusamine/1bf62b88ff63d705b22394a20f87ddca
- Rotom Labs – donut mechanics write-up and calculator: https://rotomlabs.net/guide/legends-z-a-donut-mechanics
- Bulbapedia – Donut: https://bulbapedia.bulbagarden.net/wiki/Donut

## Assumptions (not verified)

- A donut can be made with fewer than 3 berries. No source states a minimum; the planner allows 1+.
- One guide (amiibodoctor) claims stars are the rounded-down average of the berries' own stars. That contradicts
  the Flavor Score thresholds documented by Game8, Bulbapedia, and the calculator code, so the thresholds are used.
