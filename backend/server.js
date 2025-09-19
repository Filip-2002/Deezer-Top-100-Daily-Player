import express from "express";
import cors from "cors";

const app = express();
app.use(cors());

app.use((req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store",
  });
  next();
});

app.get("/", (_req, res) => res.send("OK"));

app.get("/trending", async (req, res) => {
  try {
    const source = String(req.query.source || "chart").toLowerCase();
    const limitParam = parseInt(req.query.limit ?? "100", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 100, 1), 100);

    let data = { data: [] };
    let upstream = "";

    if (source === "playlist") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing playlist id" });
      upstream = `https://api.deezer.com/playlist/${id}`;
      const r = await fetch(upstream, { cache: "no-store" });
      if (!r.ok) return res.status(r.status).send(await r.text());
      const j = await r.json();
      data.data = (j?.tracks?.data || []).slice(0, limit);
    } else {
      const country = String(req.query.country ?? "0");
      upstream = `https://api.deezer.com/chart/${country}/tracks?limit=${limit}`;
      const r = await fetch(upstream, { cache: "no-store" });
      if (!r.ok) return res.status(r.status).send(await r.text());
      data = await r.json();
    }

    res.set("x-source-url", upstream);
    res.json(data);
  } catch (err) {
    console.error("Trending proxy error:", err);
    res.status(500).json({ error: "Failed to fetch Deezer data" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend running at http://localhost:${PORT}`));
