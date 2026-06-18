import test from "node:test";
import assert from "node:assert/strict";
import { fetchEodhdQuotesInBatches } from "../../src/lib/data-source/eodhd.ts";
import {
  fetchTwelveDataQuotesInBatches,
  fetchTwelveDataQuote,
} from "../../src/lib/data-source/twelve-data.ts";
import { parseYahooQuote } from "../../src/lib/data-source/yahoo.ts";

async function withMockedFetch(handler, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("parseYahooQuote uses pre-market price during pre-market state", () => {
  const quote = parseYahooQuote({
    symbol: "AAPL",
    marketState: "PRE",
    preMarketPrice: 205.5,
    preMarketChange: 2.5,
    preMarketChangePercent: 1.23,
    preMarketTime: 1771396200,
    regularMarketPrice: 200,
    regularMarketPreviousClose: 198,
  });

  assert.equal(quote?.price, 205.5);
  assert.equal(quote?.change, 2.5);
  assert.equal(quote?.changePercent, 1.23);
});

test("parseYahooQuote uses post-market price during post-market state", () => {
  const quote = parseYahooQuote({
    symbol: "MSFT",
    marketState: "POST",
    postMarketPrice: 412.75,
    postMarketChange: -1.25,
    postMarketChangePercent: -0.3,
    postMarketTime: { raw: 1771455600 },
    regularMarketPrice: 414,
  });

  assert.equal(quote?.price, 412.75);
  assert.equal(quote?.change, -1.25);
  assert.equal(quote?.changePercent, -0.3);
});

test("parseYahooQuote rejects previous-close-only Yahoo rows", () => {
  assert.equal(
    parseYahooQuote({
      symbol: "AAPL",
      marketState: "PRE",
      regularMarketPreviousClose: 198,
      previousClose: 198,
    }),
    null
  );

  assert.equal(
    parseYahooQuote({
      symbol: "AAPL",
      marketState: "PRE",
      regularMarketPrice: 198,
      regularMarketPreviousClose: 198,
    }),
    null
  );
});

test("parseYahooQuote rejects closed-state regular-only Yahoo rows", () => {
  assert.equal(
    parseYahooQuote({
      symbol: "AAPL",
      marketState: "CLOSED",
      regularMarketPrice: 198,
      regularMarketPreviousClose: 198,
    }),
    null
  );
});

test("fetchEodhdQuotesInBatches does not fall back to EOD previous close", async () => {
  const requestedUrls = [];

  await withMockedFetch(
    async (url) => {
      requestedUrls.push(String(url));
      return jsonResponse({ code: "AAPL.US", previousClose: 198 });
    },
    async () => {
      const [result] = await fetchEodhdQuotesInBatches(
        "test-key",
        [{ requestId: "1", symbol: "AAPL.US" }],
        { batchSize: 10 }
      );

      assert.equal(result.quote, null);
      assert.equal(result.error, "未返回实时价格");
    }
  );

  assert.equal(requestedUrls.length, 1);
  assert.match(requestedUrls[0], /\/api\/real-time\//);
  assert.doesNotMatch(requestedUrls[0], /\/api\/eod\//);
});

test("fetchEodhdQuotesInBatches accepts realtime batch prices", async () => {
  await withMockedFetch(
    async () =>
      jsonResponse([
        {
          code: "AAPL.US",
          close: 206.25,
          timestamp: 1771396200,
        },
      ]),
    async () => {
      const [result] = await fetchEodhdQuotesInBatches(
        "test-key",
        [{ requestId: "1", symbol: "AAPL.US" }],
        { batchSize: 10 }
      );

      assert.equal(result.quote?.price, 206.25);
      assert.equal(result.quote?.source, "realtime");
    }
  );
});

test("fetchTwelveDataQuotesInBatches rejects previous_close-only rows", async () => {
  await withMockedFetch(
    async () =>
      jsonResponse({
        symbol: "601088",
        previous_close: "30.12",
      }),
    async () => {
      const [result] = await fetchTwelveDataQuotesInBatches("test-key", [
        {
          requestId: "1",
          candidates: [{ symbol: "601088", exchange: "SSE" }],
        },
      ]);

      assert.equal(result.quote, null);
      assert.match(result.error ?? "", /previous_close/);
    }
  );
});

test("fetchTwelveDataQuote accepts current price fields", async () => {
  await withMockedFetch(
    async () =>
      jsonResponse({
        symbol: "601088",
        price: "31.56",
        previous_close: "30.12",
        timestamp: 1771396200,
      }),
    async () => {
      const quote = await fetchTwelveDataQuote("test-key", {
        symbol: "601088",
        exchange: "SSE",
      });

      assert.equal(quote?.price, 31.56);
      assert.equal(quote?.source, "realtime");
    }
  );
});
