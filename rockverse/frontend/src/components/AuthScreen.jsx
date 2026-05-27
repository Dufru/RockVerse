import { useState } from "react";
import { request } from "../api";

export function AuthScreen({ onAuth, onContinueAsGuest }) {
  // Login e cadastro no mesmo lugar para deixar o fluxo mais rápido.
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    favoriteBands: ""
  });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        favoriteBands: form.favoriteBands
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      };

      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const response = await request(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      localStorage.setItem("rockverse_token", response.token);
      localStorage.setItem("rockverse_user", JSON.stringify(response.user));
      onAuth(response.user);
    } catch (err) {
      setError(err.message || "Não foi possível autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-backdrop" />
      <div className="auth-box">
        <div className="brand-logo">RockVerse</div>
        <h1>Entrar no RockVerse</h1>
        <p>Acompanhe shows ao vivo gravados, descubra clássicos e comente com a comunidade.</p>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" ? (
            <input
              placeholder="Seu username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          ) : null}

          <input
            type="email"
            placeholder="Seu email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />

          {mode === "register" ? (
            <input
              placeholder="Bandas favoritas (separadas por vírgula)"
              value={form.favoriteBands}
              onChange={(event) => setForm({ ...form, favoriteBands: event.target.value })}
            />
          ) : null}

          {error ? <div className="auth-error">{error}</div> : null}

          <button type="submit" disabled={loading}>
            {loading ? "Carregando..." : mode === "login" ? "Entrar no RockVerse" : "Criar conta"}
          </button>
        </form>

        <div className="auth-actions">
          <button type="button" className="auth-action-btn" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
          </button>
          <button type="button" className="auth-action-btn" onClick={onContinueAsGuest}>
            Entrar como visitante
          </button>
        </div>
      </div>
    </div>
  );
}
