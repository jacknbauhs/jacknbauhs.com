# jacknbauhs.com

The house site: Jack Bauhs, Astronaut Time, and the front door to Mission Control. Plain HTML, CSS and JavaScript on GitHub Pages, same design system as [board.jacknbauhs.com](https://board.jacknbauhs.com). The live parts (the ticker, the four tiles, the hero constellation, verdicts, latest videos) read the board's JSON straight from Mission Control's nightly feed; nothing is typed in by hand.

## Change the words without touching code

Open the file on GitHub.com, click the pencil, edit, commit. The site rebuilds and deploys in about a minute.

| File | What's in it |
| --- | --- |
| `content/about.md` | The bio (plain paragraphs) |
| `data/film.json` | The seven film projects: title, year, line, poster, Vimeo ids + hashes, credits. Add an entry, get a page. |
| `data/shows.json` | The Astronaut Time shows, the flagship's four lines, the partners paragraph |
| `data/links.json` | Email, channels, where to buy, personal socials, the Formspree form id |
| `data/site.json` | Title, description, the header tabs, the fineprint |
| `data/images.json` | Every image the site uses and where it came from |
| `data/redirects.json` | Old Squarespace paths to new pages |

Latest videos live in the **board repo** (`data/videos.json` there, posters under `assets/posters/`), so the board and the site show the same row. Open or Sealed verdicts too (`data/verdicts.json` in the board repo).

## How it deploys

`.github/workflows/pages.yml` runs on every push to `main`: fetches any image in `data/images.json` that isn't in `assets/img/` yet and commits it, builds the pages with `tools/build.py`, and deploys to GitHub Pages. Pages source must be **GitHub Actions** (Settings, Pages, Build and deployment). Until a `CNAME` file exists in the repo, the site builds for the preview path (`jacknbauhs.github.io/jacknbauhs.com/`); with a `CNAME` file it builds for the custom domain.

Run it locally: `pip install jinja2 markdown pillow`, then `python tools/build.py` and open `_site/index.html` (the live parts need a server: `python -m http.server -d _site`).

## Cutover checklist (moving www from Squarespace)

1. Check in Squarespace's domain panel that the domain stays manageable without the site plan, and where Google Workspace is billed.
2. Add a file named `CNAME` at the repo root containing `www.jacknbauhs.com`, commit.
3. Settings, Pages: custom domain `www.jacknbauhs.com`, then Enforce HTTPS once the check passes.
4. Squarespace DNS: `www` CNAME to `jacknbauhs.github.io`; apex `@` A records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Leave every MX, DKIM, SPF and the `board` CNAME alone.
5. In the board repo, point the header tabs at the new paths (`/astronaut-time/`, `/film/`, `/sales/`, `/about/`, `/contact/`).
6. Turn off Squarespace auto-renew before Oct 28. Keep the domain registration.

## Rules

Dark only. Geist for words, Geist Mono for every number, Unbounded for the wordmark. Signal colors mean data states, never decoration. Every number carries its source and its date. Nothing on the site recommends a buy. No PriceCharting, PokeData, Collectrics, TCG Quant or PokeNotify data, ever.
