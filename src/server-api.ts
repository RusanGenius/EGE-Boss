import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json({ limit: '50mb' }));

// Supabase sync API endpoints
app.post("/api/sync/generate", async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(400).json({
        error: "config_missing",
        message: "Параметры SUPABASE_URL и SUPABASE_ANON_KEY не настроены в Secrets."
      });
    }

    const { state } = req.body || {};
    if (!state) {
      return res.status(400).json({ error: "missing_state", message: "Отсутствуют данные для синхронизации." });
    }

    // 1. Clean up older than 14 days (2 weeks)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${supabaseUrl}/rest/v1/sync_codes?created_at=lt.${fourteenDaysAgo}`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`
      }
    }).catch(err => console.error("Clean up older sync codes failed:", err));

    // 2. Generate a unique 6-digit numeric code
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }

    // 3. Insert/Upsert into Supabase
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/sync_codes`, {
      method: "POST",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        code,
        data: state,
        created_at: new Date().toISOString()
      })
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error("Supabase insert error:", errorText);
      if (errorText.includes("relation") && (errorText.includes("does not exist") || errorText.includes("not found"))) {
        return res.status(500).json({
          error: "table_not_found",
          message: "Таблица sync_codes не найдена в Supabase. Пожалуйста, выполните SQL-запрос в SQL Editor вашей панели управления Supabase:\n\ncreate table if not exists public.sync_codes (\n  code text primary key,\n  data jsonb not null,\n  created_at timestamp with time zone default timezone('utc'::text, now()) not null\n);"
        });
      }
      return res.status(500).json({ error: "supabase_error", message: "Ошибка сохранения данных в Supabase.", details: errorText });
    }

    res.json({ code });
  } catch (error: any) {
    console.error("Generate sync code server error:", error);
    res.status(500).json({ error: "server_error", message: error.message });
  }
});

app.get("/api/sync/load", async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(400).json({
        error: "config_missing",
        message: "Параметры SUPABASE_URL и SUPABASE_ANON_KEY не настроены в Secrets."
      });
    }

    const code = String(req.query.code || "").replace(/\s/g, ""); // strip spaces
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return res.status(400).json({ error: "invalid_code", message: "Код должен состоять из 6 цифр." });
    }

    const selectResponse = await fetch(`${supabaseUrl}/rest/v1/sync_codes?code=eq.${code}`, {
      method: "GET",
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`
      }
    });

    if (!selectResponse.ok) {
      const errorText = await selectResponse.text();
      console.error("Supabase select error:", errorText);
      if (errorText.includes("relation") && (errorText.includes("does not exist") || errorText.includes("not found"))) {
        return res.status(500).json({
          error: "table_not_found",
          message: "Таблица sync_codes не найдена в Supabase. Пожалуйста, выполните SQL-запрос в SQL Editor вашей панели управления Supabase:\n\ncreate table if not exists public.sync_codes (\n  code text primary key,\n  data jsonb not null,\n  created_at timestamp with time zone default timezone('utc'::text, now()) not null\n);"
        });
      }
      return res.status(500).json({ error: "supabase_error", message: "Ошибка извлечения данных из Supabase." });
    }

    const rows = await selectResponse.json();
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "not_found", message: "Код не найден или срок его действия истёк (2 недели)." });
    }

    res.json({ state: rows[0].data });
  } catch (error: any) {
    console.error("Load sync code server error:", error);
    res.status(500).json({ error: "server_error", message: error.message });
  }
});

export default app;
