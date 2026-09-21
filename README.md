# Tatkal Rush

A speedrun parody of Tatkal ticket booking on the fictional **RailJhatka** portal.
You get 10 minutes (or a 3 minute Express run). Relatives, bosses and cyber cafe
customers message you with booking requests. Book as many as you can, as well as you can.

Vanilla HTML/CSS/JS, no build step. Works on desktop and mobile, installable as a PWA.

## Run

```bash
python3 scripts/serve.py 8187
```

## The loop

1. **Chat**: the customer's message holds every detail: route, class, a train condition
   (arrive before, depart after, fastest, cheapest), passengers, preferences, feuds, couples, add-ons.
2. **Train / flight**: availability drains live. Only AVL is bookable. One option is right.
3. **Passengers**: names are misspelled celebrity puns, so muscle memory is the enemy.
   Paste is disabled. Under-5s travel free on trains and must not be booked.
4. **Seat map**: 3 tier, 2 tier, chair car and aircraft layouts. Ladies and senior quota
   berths, exit row rules, XL legroom rows. Other "users" steal seats while you think.
5. **Review**: untick the pre-ticked add-ons (unless asked for), solve one of ten captchas.
6. **Payment**: four gateways with drifting success rates, UPI approval timer, OTP buried
   in spam notifications, a wallet whose balance you have to actually read.
7. **Server load**: queues, session expiry, 502 Bad Gaadi, ads, forced 5 star ratings, robot checks, a Continue button that runs away, and Terms you must scroll.

Every fourth customer wants a flight instead of a train. Every fifth is a VIP (double points, short patience).

## The shape of a run

- **Waiting room**: customers queue with tokens and you choose who to call. Waiting customers lose patience too (at 0.42x speed) and leave for -8. The room is always topped up to two, three from Act 2.
- **Quick jobs**: about a third of arrivals are 10 to 20 second tasks (PNR lookalike search, spot the misprint, berth swap within the family, cancel the right passenger). 20 to 25 points, -5 if wrong.
- **Three acts**, each announced on a platform board with a chime: Tatkal Window (100% to 70% of the clock), Server Meltdown (more popups, faster seat stealing, weaker gateways), Premium Tatkal (harder customers, every booking 1.25x).
- **The baraat**: in Full Rush a six passenger finale arrives with 2:10 left. The form is pre-filled from "Excel" with two mistakes to catch, every seating rule applies, and it pays 2x. If you are serving it when the clock hits zero the chart is held: overtime until that booking ends.
- **Tatkal Fever**: three perfect tickets in a row gives 60 seconds of 2x points with no popups and no seat stealing.
- Bonus multipliers other than the perfect streak are capped at 3x combined.

## What keeps it tense

- **Patience**: each customer has a patience bar. They nag at 50% and 80%, and at 0 they leave for an agent (-15, streak lost). The bar does not drain during payment.
- **Amendments**: about half the customers message again mid-booking (age correction, changed berth preference, forgotten add-on). The stepper is clickable so you can go back and fix it.
- **Autocorrect trap**: the name field suggests the real celebrity spelling, which is always wrong here.
- **Seat rules**: charging point seats, bays next to the toilet, exit rows, XL legroom, quota berths that other users cannot take (a safe harbour for passengers who qualify).
- **Chai**: every perfect ticket earns a chai (max 3). One chai buys one jugaad per step: a train tip-off, the Master List, a 20s seat freeze, a waived captcha, or a payment sifarish.
- **Last minute**: tickets finished in the final 60 seconds pay 1.5x.
- Captchas, chaos events and gateway success rates all get worse as the run goes on.

## Scoring

| Thing | Points |
| --- | --- |
| Confirmed passenger | +10 each |
| Right train and class | +10 (wrong: -10 each) |
| Seated with family (same bay or row) | +10 each, +10 full house |
| Preference matched | +5 |
| Senior's hard need | +10 / -10 |
| Couple seated together | +15 |
| Feud kept apart | +15 / -15 |
| Add-ons exactly right | +5 (each wrong one -5) |
| ID mismatch | -5 each |
| Speed bonus | up to +25 under par |
| Perfect streak | +10% per ticket, up to 2x |
| Nobody next to the toilet (when asked) | +5 / -5 each |
| VIP customer | 2x |
| Last minute | 1.5x |
| Skip customer | -10 |
| Customer runs out of patience | -15 |

Orders are generated backwards from a planted perfect seating, so full marks are always
possible when the order opens. `node scripts/selftest.mjs` checks that over 4,200 orders.

## Leaderboard

Local by default. For a global board, run `supabase/schema.sql` in a Supabase project and put
the URL and anon key in `js/config.js`.

## Disclaimer

Parody. Not affiliated with any railway, airline, bank or celebrity. All names are made up.
