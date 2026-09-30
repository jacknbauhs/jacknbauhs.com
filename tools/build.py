#!/usr/bin/env python3
"""Builds jacknbauhs.com: data/*.json + content/*.md + templates/ -> _site/ (plain HTML, CSS, JS).

    python tools/build.py                      # -> _site/
    python tools/build.py --base /jacknbauhs.com   # for a preview served under a path (no custom domain yet)
    python tools/build.py --board http://localhost:8000   # read the board's JSON from somewhere else (tests)

No framework. The workflow in .github/workflows/pages.yml runs this on every push and deploys _site/.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
from pathlib import Path

import markdown
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parent.parent


def load(name: str):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "_site"))
    ap.add_argument("--base", default="", help="path prefix when the site is served under a folder, e.g. /jacknbauhs.com")
    ap.add_argument("--board", default=None, help="override the board URL the pages read JSON from")
    args = ap.parse_args()

    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    base = args.base.rstrip("/")

    site = load("site.json")
    if args.board:
        site["board"] = args.board.rstrip("/")
    links = load("links.json")
    shows = load("shows.json")
    film = load("film.json")
    redirects = load("redirects.json")["map"]
    images = load("images.json")
    build_date = dt.date.today().isoformat()

    img_dir = ROOT / "assets" / "img"
    def has(name: str) -> bool:
        return bool(name) and (img_dir / name).exists()
    for p in film["projects"]:
        p["has_poster"] = has(p.get("poster", ""))
    img = {"about": has("about.jpg"), "polo": has("polo-g.jpg"), "reel": has("reel.jpg")}
    stills = [s for s in ("contact-1.jpg", "contact-2.jpg", "contact-3.jpg") if has(s)]

    env = Environment(loader=FileSystemLoader(str(ROOT / "templates")), autoescape=select_autoescape(["html"]))
    common = {
        "site": site, "links": links, "shows": shows, "film": film, "img": img, "stills": stills,
        "base": base, "build_date": build_date, "year": dt.date.today().year,
        "site_js": json.dumps({"board": site["board"], "base": base}),
    }

    def page(template: str, path: str, key: str, title: str, description: str, **extra):
        ctx = dict(common, page={"path": path, "key": key, "title": title, "description": description}, **extra)
        html = env.get_template(template).render(**ctx)
        dest = out / path.strip("/") / "index.html" if path != "/" else out / "index.html"
        if path.endswith(".html"):
            dest = out / path.strip("/")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(html, encoding="utf-8")
        return path

    pages = []
    pages.append(page("home.html", "/", "home", site["title"], site["description"]))
    pages.append(page("astronaut-time.html", "/astronaut-time/", "astronaut-time", "Astronaut Time | Pokémon market media, built on real data",
                      "The shows, the schedule, the numbers from Mission Control, and where Astronaut Time lives. Open or Sealed, Market Radar, The Sell Side, The File."))
    pages.append(page("film.html", "/film/", "film", "Film & Directing | Jack Bauhs",
                      "Seven projects and twenty-one films: documentary, narrative, commercial series and VR, directed and cut by Jack Bauhs."))
    projects = film["projects"]
    for i, p in enumerate(projects):
        prev = projects[i - 1] if i > 0 else None
        nxt = projects[i + 1] if i + 1 < len(projects) else None
        pages.append(page("project.html", f"/film/{p['slug']}/", "film", f"{p['title']} | Film & Directing | Jack Bauhs", p["line"], p=p, prev=prev, next=nxt))
    pages.append(page("sales.html", "/sales/", "sales", "Sales & Strategy | Jack Bauhs",
                      "Enterprise technology sales at Docusign, and Mission Control, the market engine behind Astronaut Time."))
    about_html = markdown.markdown((ROOT / "content" / "about.md").read_text(encoding="utf-8"))
    pages.append(page("about.html", "/about/", "about", "About | Jack Bauhs", "Chicago-born director, sales strategist, and founder of Astronaut Time.", about_html=about_html))
    pages.append(page("contact.html", "/contact/", "contact", "Contact | Jack Bauhs", "Film, sales, Astronaut Time, or the board. One inbox."))
    page("404.html", "/404.html", "404", "Not found | Jack Bauhs", "Nothing here.")

    # Redirect stubs at the old Squarespace paths.
    tpl = env.get_template("redirect.html")
    for old, new in redirects.items():
        dest = out / old.strip("/") / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(tpl.render(site=site, base=base, to=new), encoding="utf-8")

    # Assets, fonts, images.
    shutil.copytree(ROOT / "assets", out / "assets", ignore=shutil.ignore_patterns("*.md"))
    (out / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{site['url']}{p}</loc><lastmod>{build_date}</lastmod></url>\n" for p in pages)
        + "</urlset>\n", encoding="utf-8")
    (out / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {site['url']}/sitemap.xml\n", encoding="utf-8")
    (out / ".nojekyll").write_text("", encoding="utf-8")
    cname = ROOT / "CNAME"
    if cname.exists():
        shutil.copyfile(cname, out / "CNAME")
    missing = [n for n in images["files"] if not has(n)]
    print(f"built {len(pages)} pages + {len(redirects)} redirects into {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}")
    if missing:
        print(f"images not in assets/img yet (placeholders used): {', '.join(missing)}")


if __name__ == "__main__":
    main()
