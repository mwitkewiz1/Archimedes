# Archimedes

Pump and ohm calculator, fractional measurement for fusion techniques. On the phone, offline. By [MW]Sense.

- **Fractions**: a tape-measure calculator. Type `5'1" − 3 1/4" − 3/32"` on its own keypad and get
  57 17/32", the feet-and-inches version, and the nearest mark on your tape.
- **Cut & fuse**: for pipe that gets sawn and butt-fused. Pick the job (cut one end, trim both ends,
  or cut a piece out and fuse it back), type the lengths, and get a drawing plus numbered steps:
  where to mark, which side of the line to saw on, and what you'll end up with.

Coming: electrical (reading wiring diagrams; amps, volts, wire size, phases), then pumps.

## Running it locally

```sh
cd app && python -m http.server 8010   # http://localhost:8010
node --test "tests/*.test.mjs"         # math tests
```
