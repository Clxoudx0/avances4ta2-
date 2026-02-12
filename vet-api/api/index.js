const express = require("express");
const cors = require("cors");

const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 Cliente Supabase (solo backend usa la service role)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Ruta base
app.get("/", (req, res) => {
  res.json({ ok: true, message: "API funcionando en Vercel 🚀" });
});

// Probar conexión con Supabase
app.get("/supabase-ok", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1,
    });

    if (error) return res.status(500).json({ message: error.message });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: String(e) });
  }
});

// Registro
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.json({
    ok: true,
    user: { id: data.user.id, email: data.user.email },
  });
});

// Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ message: "Credenciales inválidas" });
  }

  return res.json({
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
});

// 🔥 IMPORTANTE para Vercel
module.exports = app;
