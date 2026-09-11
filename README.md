# Football Today

A single-page football scoreboard. Open `index.html` — that's the whole app.

Shows the day's matches, live scores and league tables for:

- Premier League, La Liga, Serie A, Bundesliga, Ligue 1
- UEFA Champions League
- Persian Gulf Pro League (Iran)

## Data sources

| Competition | Source |
|---|---|
| Top 5 leagues + Champions League | ESPN public scoreboard feed |
| Persian Gulf Pro League | football360.ir, via a small Cloudflare Worker that adds CORS headers |
| Iran fallback | TheSportsDB, used automatically when football360 is unreachable |

No API key. No daily request limit. Everything is fetched in the browser.

## Features

- Live minute for matches in progress
- Goal scorers, including penalties and own goals (European leagues)
- Winner highlighted on each result
- League tables with relegation zone shaded and a last-5 form column
- Day-by-day navigation through the whole season
- Light and dark theme, follows the system setting
- Times shown in each viewer's own time zone

## Notes

- Goal scorers are not available for the Iranian league; that feed does not publish them.
- The Iranian sources are intermittently reachable, so the page falls back automatically.
