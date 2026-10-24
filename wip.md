# wip.md — the board

Open work only. Done items are deleted (git keeps them).

## Next
- **Electric: the motor nameplate reader** [2026-10-24]
  Phases went in (Electric tab, v25): waves, rotation, lost phase, service readings, imbalance. Next: a nameplate
  reader that fills Motor amps from what the plate says (HP, V, FLA, SF, CODE, PH).

## Needs Matthew
- N1 Card rules: 8 rules in CLAUDE.md are tagged [proposed]; read them and say "N1 yes" (or what to change) → [confirmed] tags — default: none confirmed until you say [2026-10-18]

## On the floor
- Measure one joint on each pipe you fuse (Fusing tab: marks back from each end, mark to mark after) → the app's loss for that size and DR [2026-10-17]
- Try it on the phone: Fractions and Cut & fuse, on a real HDPE cut → what's wrong or slow to Claude [2026-10-17]
- Try the Electric tab: Ohm's law off a real nameplate or battery, wire size on a real run, and Symbols against a real panel's diagram → plain enough? anything missing? [2026-10-18]
- Try the Pumps tab with a real job: lift, pipe size and length → does the dot land where the pump really runs? And How they work, Which pump?, Troubleshoot and Our pumps: anything wrong, missing or out of order for the pumps you run and repair? Add curve numbers for a pump you know and check it runs where it should [2026-10-18]

- Try the Lift station: play a cycle, trip a pump, stick a float, Silence the alarm, wire a float backwards (NC) → does it run like your stations? Floats, relays or wording that don't match what you see in a real panel [2026-10-24]

- Try Motor amps on a real pump's plate: HP, volts, CODE, FLA, SF → do wire, breaker, overload and generator match what's installed? [2026-10-24]

- Try Phases: does the picture make one against three phase click? Check a real panel against What should it read, and three leg readings in Imbalance [2026-10-24]

## Open
- **Electrical module** [2026-10-17] → app/
  Ohm's law, wire size, motor amps (breaker, overload, generator), phases and diagram symbols are in (Electric tab).
  Still to come: the motor nameplate reader; resistors, diodes.
  Plain words and pictures.
- **Pumps module** [2026-10-17] → app/
  Our pumps (228 from his list), Pump curve, How they work (13 kinds), Which pump? and Troubleshoot are in
  (Pumps tab). The Pump curve lists every pump with a curve. Most listed pumps have no head numbers: anyone can
  add a pump's three curve numbers on their own phone (Our pumps, Add curve numbers); numbers he gathers from spec
  sheets could go in the shared catalog instead. The Lift station is in too. Still to come: Pump curve extras:
  fittings and hose, slurry weight, two pumps side by side or stacked, a suction-side
  cavitation check.
- **Our pumps: read flow and head the script missed** [2026-10-24] → private/catalog.py (laptop only)
  Only 12 of 228 pumps carry both flow and head; he says most descriptions have the specs. Rerun the script, list
  descriptions that mention flow or head (GPM, ft, TDH, m³/h, psi) but came out empty or odd (10 HP booster read as
  3 GPM at 446 ft), fix the parse, regenerate keeping row order.
- **Blender project-planning add-ons** [2026-10-17] → app/
  After the BlenderLab workflow is nailed down.
