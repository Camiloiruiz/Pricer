/**
 * services/scraper.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sertch Daily Price Scraper – Playwright headless crawler
 *
 * Targets:
 *   • Loblaws.ca     — JSON-LD structured data extraction
 *   • Walmart.ca     — REST API intercept via route handler
 *
 * Anti-blocking:
 *   • Randomized User-Agent from UA pool
 *   • Randomized viewport (mobile / tablet)
 *   • Human-paced delays (100–800 ms between interactions)
 *   • Stealth mode via page.addInitScript (no webdriver fingerprint)
 *   • Request header spoofing
 *
 * Run:   npx ts-node --esm services/scraper.ts
 * CI:    triggered by .github/workflows/scrape.yml (daily 05:00 EST)
 */

import { chromium, Browser, Page, Route } from "playwright";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SVC_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const USER_AGENTS: string[] = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
];

const VIEWPORTS = [
  { width: 390,  height: 844 },   // iPhone 14
  { width: 412,  height: 915 },   // Pixel 7
  { width: 768,  height: 1024 },  // iPad
];

const SCRAPE_TARGETS: ScrapeTarget[] = [
  {
    chain:    "loblaws",
    name:     "Loblaws",
    baseUrl:  "https://www.loblaws.ca",
    searchFn: scrapeLoblaws,
    queries:  ["milk", "eggs", "bread", "butter", "chicken", "cheese", "yogurt", "orange juice"],
  },
  {
    chain:    "walmart",
    name:     "Walmart Canada",
    baseUrl:  "https://www.walmart.ca",
    searchFn: scrapeWalmart,
    queries:  ["milk", "eggs", "bread", "butter", "chicken breast", "cheese", "yogurt"],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScrapeTarget {
  chain:    string;
  name:     string;
  baseUrl:  string;
  searchFn: (page: Page, query: string, storeId: string) => Promise<ScrapedPrice[]>;
  queries:  string[];
}

interface ScrapedPrice {
  productName:  string;
  brand:        string | null;
  upc:          string | null;
  unit:         string | null;
  priceCents:   number;
  salePriceCents: number | null;
  imageUrl:     string | null;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(min: number, max: number): Promise<void> {
  return new Promise((res) => setTimeout(res, min + Math.random() * (max - min)));
}

function parsePriceCents(raw: string | number | null): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

// ── Stealth init script ───────────────────────────────────────────────────────

const STEALTH_SCRIPT = `
  // Hide webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  // Spoof plugins length
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
  // Spoof languages
  Object.defineProperty(navigator, 'languages', { get: () => ['en-CA', 'en', 'fr-CA'] });
  // Remove automation-related chrome properties
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
  delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
`;

// ── Browser factory ───────────────────────────────────────────────────────────

async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    headless:  true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1280,800",
    ],
  });
}

async function createPage(browser: Browser): Promise<Page> {
  const ua       = pickRandom(USER_AGENTS);
  const viewport = pickRandom(VIEWPORTS);

  const context = await browser.newContext({
    userAgent:        ua,
    viewport,
    locale:           "en-CA",
    timezoneId:       "America/Toronto",
    extraHTTPHeaders: {
      "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Sec-Fetch-Dest":  "document",
      "Sec-Fetch-Mode":  "navigate",
      "Sec-Fetch-Site":  "none",
      "Sec-Fetch-User":  "?1",
    },
  });

  const page = await context.newPage();
  await page.addInitScript(STEALTH_SCRIPT);

  // Block images/fonts to speed up scraping
  await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}", (route: Route) => route.abort());

  return page;
}

// ── Loblaws scraper ───────────────────────────────────────────────────────────

async function scrapeLoblaws(page: Page, query: string, _storeId: string): Promise<ScrapedPrice[]> {
  const results: ScrapedPrice[] = [];

  await page.goto(
    `https://www.loblaws.ca/search?search-bar=${encodeURIComponent(query)}`,
    { waitUntil: "networkidle", timeout: 20_000 }
  );

  await sleep(500, 1200);

  // Extract product cards from DOM
  const cards = await page.evaluate(() => {
    const items: Array<{
      name: string; brand: string; price: string; salePrice: string;
      unit: string; upc: string; img: string;
    }> = [];

    // Loblaws uses data-track attributes on product tiles
    document.querySelectorAll("[data-track='product-click']").forEach((el) => {
      const name      = el.querySelector("[class*='ProductName']")?.textContent?.trim() ?? "";
      const brand     = el.querySelector("[class*='ProductBrand']")?.textContent?.trim() ?? "";
      const price     = el.querySelector("[class*='selling-price']")?.textContent?.trim() ?? "";
      const salePrice = el.querySelector("[class*='was-price']")?.textContent?.trim() ?? "";
      const unit      = el.querySelector("[class*='unit']")?.textContent?.trim() ?? "";
      const upc       = (el as HTMLElement).dataset.upc ?? "";
      const img       = el.querySelector("img")?.src ?? "";

      if (name && price) {
        items.push({ name, brand, price, salePrice, unit, upc, img });
      }
    });

    return items;
  });

  for (const card of cards.slice(0, 15)) {
    const priceCents = parsePriceCents(card.price);
    if (!priceCents) continue;

    results.push({
      productName:    card.name,
      brand:          card.brand || null,
      upc:            card.upc || null,
      unit:           card.unit || null,
      priceCents,
      salePriceCents: parsePriceCents(card.salePrice),
      imageUrl:       card.img || null,
    });

    await sleep(50, 150);
  }

  return results;
}

// ── Walmart Canada scraper ────────────────────────────────────────────────────

async function scrapeWalmart(page: Page, query: string, _storeId: string): Promise<ScrapedPrice[]> {
  const results: ScrapedPrice[] = [];
  const interceptedPrices: ScrapedPrice[] = [];

  // Intercept Walmart's internal browse API
  await page.route("**/api/graphql**", async (route: Route) => {
    const response = await route.fetch();
    try {
      const json = await response.json();
      // Parse GraphQL search results
      const items =
        json?.data?.search?.searchResult?.itemStacks?.[0]?.items ??
        json?.data?.productSearch?.searchResult?.itemStacks?.[0]?.items ?? [];

      for (const item of items.slice(0, 20)) {
        const priceCents = parsePriceCents(item?.priceInfo?.currentPrice?.price);
        if (!priceCents) continue;
        interceptedPrices.push({
          productName:    item.name ?? "",
          brand:          item.brand ?? null,
          upc:            item.upc ?? null,
          unit:           item.weightIncrement ? `${item.weightIncrement}${item.weightUnit}` : null,
          priceCents,
          salePriceCents: parsePriceCents(item?.priceInfo?.wasPrice?.price),
          imageUrl:       item?.imageInfo?.thumbnailUrl ?? null,
        });
      }
    } catch {
      // Non-JSON response – ignore
    }
    await route.fulfill({ response });
  });

  await page.goto(
    `https://www.walmart.ca/search?q=${encodeURIComponent(query)}`,
    { waitUntil: "networkidle", timeout: 25_000 }
  );

  await sleep(800, 1800);

  // Prefer intercepted API data; fall back to DOM scraping
  if (interceptedPrices.length > 0) {
    results.push(...interceptedPrices);
  } else {
    // DOM fallback
    const cards = await page.evaluate(() => {
      const items: Array<{ name: string; price: string; img: string }> = [];
      document.querySelectorAll("[data-automation='product-title']").forEach((el) => {
        const container = el.closest("[data-automation='product']");
        if (!container) return;
        const name  = el.textContent?.trim() ?? "";
        const price = container.querySelector("[data-automation='product-price']")?.textContent?.trim() ?? "";
        const img   = container.querySelector("img")?.src ?? "";
        if (name && price) items.push({ name, price, img });
      });
      return items;
    });

    for (const card of cards.slice(0, 15)) {
      const priceCents = parsePriceCents(card.price);
      if (!priceCents) continue;
      results.push({
        productName: card.name, brand: null, upc: null, unit: null,
        priceCents, salePriceCents: null, imageUrl: card.img || null,
      });
    }
  }

  return results;
}

// ── Supabase upsert helpers ───────────────────────────────────────────────────

async function upsertProduct(
  db: SupabaseClient<Database>,
  item: ScrapedPrice,
): Promise<string | null> {
  // Try to find by UPC first
  if (item.upc) {
    const { data } = await db.from("products").select("id").eq("upc", item.upc).maybeSingle();
    if (data) return data.id;
  }

  // Upsert by name
  const { data, error } = await db
    .from("products")
    .upsert(
      {
        name:      item.productName,
        brand:     item.brand,
        upc:       item.upc,
        unit:      item.unit,
        image_url: item.imageUrl,
      },
      { onConflict: "upc", ignoreDuplicates: false }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    // Insert ignoring conflict
    const { data: ins } = await db
      .from("products")
      .insert({ name: item.productName, brand: item.brand, upc: item.upc, unit: item.unit, image_url: item.imageUrl })
      .select("id")
      .maybeSingle();
    return ins?.id ?? null;
  }

  return data?.id ?? null;
}

async function upsertPrice(
  db: SupabaseClient<Database>,
  productId: string,
  storeId: string,
  item: ScrapedPrice,
): Promise<void> {
  await db.from("prices").upsert(
    {
      product_id:       productId,
      store_id:         storeId,
      price_cents:      item.priceCents,
      sale_price_cents: item.salePriceCents ?? null,
      source:           "scraper",
      confidence_score: 1.0,  // Scraper prices get full confidence by default
      last_updated:     new Date().toISOString(),
    },
    { onConflict: "product_id,store_id" }
  );
}

// ── Store lookup ──────────────────────────────────────────────────────────────

async function getOrCreateStore(
  db: SupabaseClient<Database>,
  chain: string,
  city: string = "Shelburne",
): Promise<string | null> {
  const { data } = await db
    .from("stores")
    .select("id")
    .eq("chain", chain)
    .eq("city", city)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[Sertch Scraper] Starting …");

  if (!SUPABASE_URL || !SUPABASE_SVC_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }

  const db = createClient<Database>(SUPABASE_URL, SUPABASE_SVC_KEY, {
    auth: { persistSession: false },
  });

  const browser = await createBrowser();

  let totalUpserted = 0;
  let totalErrors   = 0;

  for (const target of SCRAPE_TARGETS) {
    const storeId = await getOrCreateStore(db, target.chain);
    if (!storeId) {
      console.warn(`[${target.chain}] No store record found — skipping.`);
      continue;
    }

    console.log(`\n[${target.chain}] Scraping ${target.queries.length} queries …`);

    for (const query of target.queries) {
      let page: Page | null = null;
      try {
        page = await createPage(browser);
        console.log(`  → "${query}"`);

        const items = await target.searchFn(page, query, storeId);
        console.log(`     found ${items.length} items`);

        for (const item of items) {
          try {
            const productId = await upsertProduct(db, item);
            if (!productId) { totalErrors++; continue; }
            await upsertPrice(db, productId, storeId, item);
            totalUpserted++;
          } catch (e) {
            console.error(`     [upsert error] ${(e as Error).message}`);
            totalErrors++;
          }
        }

        // Inter-query delay (1–3 s) to appear human
        await sleep(1000, 3000);
      } catch (err) {
        console.error(`  [${target.chain}] Query "${query}" failed:`, (err as Error).message);
        totalErrors++;
      } finally {
        await page?.context().close();
      }
    }
  }

  await browser.close();

  console.log(`\n[Sertch Scraper] Done. Upserted: ${totalUpserted}, Errors: ${totalErrors}`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[Sertch Scraper] Fatal:", err);
  process.exit(1);
});
