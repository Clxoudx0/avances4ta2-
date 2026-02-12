const express = require("express");
const cors = require("cors");


const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Conexión a Supabase (service role SOLO en backend)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get("/", (req, res) => {
  res.json({ ok: true, message: "API funcionando ✅ (Supabase Auth)" });
});

// ✅ Endpoint para confirmar que Supabase está bien conectado
app.get("/supabase-ok", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1,
    });
    if (error) return res.status(500).json({ ok: false, message: error.message });
    return res.json({ ok: true, usersReturned: data?.users?.length ?? 0 });
  } catch (e) {
    return res.status(500).json({ ok: false, message: String(e) });
  }
});

// ✅ REGISTER (crea usuario en la nube)
// body: { email, password }
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // para no depender de confirmación por correo
    });

    if (error) return res.status(400).json({ message: error.message });

    return res.json({
      ok: true,
      user: { id: data.user.id, email: data.user.email },
    });
  } catch (e) {
    return res.status(500).json({ message: String(e) });
  }
});

// ✅ LOGIN (valida contra Supabase Auth)
// body: { email, password }
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  try {
    // 👇 Login normal de Supabase (devuelve session con access_token)
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = data.session?.access_token;
    if (!token) {
      return res.status(500).json({ message: "No se generó token" });
    }

    return res.json({
      token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: String(e) });
  }
});

// ✅ /me (ruta protegida)
// Header: Authorization: Bearer <token_de_supabase>
app.get("/me", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Falta token" });

  try {
    // Creamos un cliente "con token del usuario" para leer el usuario actual
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data, error } = await supabaseUser.auth.getUser();

    if (error || !data?.user) {
      return res.status(401).json({ message: "Token inválido" });
    }

    return res.json({
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: String(e) });
  }
});

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API corriendo en http://0.0.0.0:${PORT}`);
});
