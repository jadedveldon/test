# Being found: search engines and AI search

How the site helps search engines (Google, Bing) and AI search (ChatGPT search, Perplexity, Claude, Gemini) find,
read and quote it. Everything here is made from the same content as the pages, so it stays up to date by itself.

## What the site gives them

| File or tag | What it is | Made by |
| --- | --- | --- |
| `/sitemap.xml` | every public page, with its priority | `src/pages/sitemap.xml.ts` |
| `/robots.txt` | who may read what (below) | `src/pages/robots.txt.ts` |
| `/llms.txt` | a plain guide to the site for AI tools: what Sarvakali offers, the care policy, every page with a line | `src/pages/llms.txt.ts` |
| `<link rel="canonical">` | each public page's one address | `Base.astro` |
| structured data (JSON-LD) | facts written for machines: Sarvakali as an organisation, each pillar as a service with its catalogue (no prices), each article, each text of the library (its language, transliteration, meaning and source), each guided practice as steps, and the trail at the top of inner pages | `src/seo/ld.ts`, passed to `Base.astro` as `ld` |
| link-preview cards | a picture for every page, for chats and social apps | `tools/make-og.cjs` |

The list of public pages is in `src/seo/pages.ts`. Private pages (a booking, an invoice, My space, the Studio, the
editor) are never listed and ask not to be indexed.

## Who may read the site (the owner's decision, 2026-11-27)

- **Search engines and AI search are welcome**: Googlebot, Bingbot, OpenAI's OAI-SearchBot and ChatGPT-User,
  Anthropic's Claude-SearchBot and Claude-User, PerplexityBot, and Google-Extended (it also lets Gemini's own app use
  the site when it answers someone).
- **Crawlers that only gather text to train AI models are turned away**: GPTBot, ClaudeBot, Common Crawl (CCBot),
  Meta's, Apple's training crawler, and others listed in `robots.txt.ts`. Training gives the site no link, no visit and
  no credit.
- These rules are honoured by the major companies; they cannot force a crawler that ignores them.

## To do at launch (needs the real domain)

1. Set the domain in Site settings (the `url`). Every address in the sitemap, robots.txt, llms.txt, the canonical tags
   and the link cards follows from it.
2. Run `node tools/make-og.cjs` so the link cards are made for the real site.
3. Add the site to **Google Search Console** and **Bing Webmaster Tools** (Bing also feeds ChatGPT's search), and
   submit `https://<domain>/sitemap.xml` in each.
4. Turn on **IndexNow** in Bing Webmaster Tools (or Cloudflare), so new pages are picked up within hours.
5. If Sarvakali has a place people can visit, create a **Google Business Profile**.
6. Give the same name and one-line description everywhere the site is listed (Instagram, YouTube, directories).

## Measuring it

Insights → Overview → **Kinds of source** groups visits into AI assistants, search engines, social apps, other sites
and direct. "AI assistants" counts visits from ChatGPT, Perplexity, Claude, Gemini, Copilot and others
(`sourceKind` in `src/obs/core/events.ts`).

## Writing for it

- Answer first: a page (and each mantra) opens with what it is and what it means, in plain words. AI tools quote pages
  that answer plainly and name their sources.
- Never promise a cure or an outcome, in a page or in an advertisement (India's 1954 Act on magic remedies).

## Checks

`tools/qa/rules.cjs`, "search engines and AI search": the sitemap lists the public pages and none of the private
ones; robots.txt turns training crawlers away and lets everyone else in; llms.txt exists; every public page has a
canonical address; structured data is valid.
