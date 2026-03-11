import { useEffect, useState, useCallback } from "react";

const API = "http://localhost:8000/api";

// ─── HELPERS ────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const getToken = () => localStorage.getItem("bf_token");
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

// ─── STYLES ─────────────────────────────────────────────────────────────────
const S = {
  input: { width: "100%", padding: "11px 14px", background: "#0f0f1a", border: "1px solid #2a2a40", borderRadius: "10px", color: "#e8e8f8", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  label: { display: "block", fontSize: "11px", fontWeight: "700", color: "#666", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: "7px" },
  btn: (bg = "linear-gradient(135deg,#7c3aed,#4f46e5)", color = "#fff") => ({ padding: "11px 22px", background: bg, color, border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.2s" }),
  card: { background: "#16162a", border: "1px solid #22223a", borderRadius: "16px", padding: "24px" },
};

// ─── MINI COMPONENTS ────────────────────────────────────────────────────────
function Tag({ children, color = "#7c3aed" }) {
  return <span style={{ background: color + "22", color, padding: "2px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "700" }}>{children}</span>;
}

function BudgetBar({ item }) {
  const pct = Math.min(item.percent_used, 100);
  const over = item.over_budget;
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "13px", color: "#ccc", display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color, display: "inline-block" }} />
          {item.name}
          {over && <span style={{ color: "#f43f5e", fontSize: "11px", fontWeight: "700" }}>OVER</span>}
        </span>
        <span style={{ fontSize: "12px", color: over ? "#f43f5e" : "#888" }}>
          {fmt(item.spent)} / {fmt(item.budget)}
        </span>
      </div>
      <div style={{ background: "#1e1e35", borderRadius: "99px", height: "5px" }}>
        <div style={{ width: `${pct}%`, background: over ? "#f43f5e" : item.color, height: "100%", borderRadius: "99px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ─── AUTH PAGE ───────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", salary: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setErr(""); setLoading(true);
    try {
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const res = await fetch(`${API}/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); setLoading(false); return; }
      localStorage.setItem("bf_token", data.token);
      localStorage.setItem("bf_name", data.name);
      onAuth({ name: data.name, onboarded: data.onboarded });
    } catch { setErr("Cannot reach server."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a14", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', 'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>💸</div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BudgetFlow</h1>
          <p style={{ color: "#555", fontSize: "14px", marginTop: "6px" }}>Your personal finance companion</p>
        </div>

        <div style={{ ...S.card, boxShadow: "0 20px 60px #7c3aed15" }}>
          <div style={{ display: "flex", background: "#0f0f1a", borderRadius: "10px", padding: "4px", marginBottom: "24px" }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, padding: "9px", border: "none", borderRadius: "8px", background: mode === m ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "transparent", color: mode === m ? "#fff" : "#555", fontWeight: "700", fontSize: "13px", cursor: "pointer", textTransform: "capitalize", fontFamily: "inherit" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={S.label}>Full Name</label>
              <input style={S.input} placeholder="Your name" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: "16px" }}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" placeholder="you@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div style={{ marginBottom: mode === "register" ? "16px" : "24px" }}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()} />
          </div>
          {mode === "register" && (
            <div style={{ marginBottom: "24px" }}>
              <label style={S.label}>Monthly Salary (₹)</label>
              <input style={S.input} type="number" placeholder="e.g. 50000" value={form.salary} onChange={e => set("salary", e.target.value)} />
            </div>
          )}

          {err && <div style={{ color: "#f43f5e", fontSize: "13px", marginBottom: "16px", background: "#f43f5e11", padding: "10px 14px", borderRadius: "8px" }}>⚠️ {err}</div>}

          <button onClick={submit} disabled={loading} style={{ ...S.btn(), width: "100%", padding: "13px", opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING PAGE ─────────────────────────────────────────────────────────
function OnboardingPage({ salary, onDone }) {
  const [defaults, setDefaults] = useState([]);
  const [cats, setCats] = useState([]);
  const [newCat, setNewCat] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/default-categories`).then(r => r.json()).then(d => {
      setDefaults(d.categories || []);
      setCats((d.categories || []).map(name => ({ name, budget_amount: "", budget_type: "fixed", enabled: true })));
    });
  }, []);

  const total = cats.filter(c => c.enabled).reduce((sum, c) => {
    if (!c.budget_amount) return sum;
    return sum + (c.budget_type === "percentage" ? (parseFloat(c.budget_amount) / 100) * salary : parseFloat(c.budget_amount));
  }, 0);

  const submit = async () => {
    const enabled = cats.filter(c => c.enabled && c.name.trim());
    if (!enabled.length) { setErr("Enable at least one category"); return; }
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`${API}/onboarding`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ categories: enabled })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); setLoading(false); return; }
      onDone();
    } catch { setErr("Server error"); }
    setLoading(false);
  };

  const addCustom = () => {
    if (!newCat.trim()) return;
    setCats(c => [...c, { name: newCat.trim(), budget_amount: "", budget_type: "fixed", enabled: true }]);
    setNewCat("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a14", fontFamily: "'Syne','Segoe UI',sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ margin: "0 0 8px", fontSize: "26px", fontWeight: "800", color: "#e8e8f8" }}>Set up your budget 🎯</h1>
          <p style={{ color: "#555", margin: 0 }}>Monthly salary: <strong style={{ color: "#7c3aed" }}>{fmt(salary)}</strong> — Allocated: <strong style={{ color: total > salary ? "#f43f5e" : "#10b981" }}>{fmt(total)}</strong></p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {cats.map((cat, i) => (
            <div key={i} style={{ ...S.card, padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", opacity: cat.enabled ? 1 : 0.4 }}>
              <input type="checkbox" checked={cat.enabled} onChange={e => setCats(c => c.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))}
                style={{ width: "16px", height: "16px", accentColor: "#7c3aed", cursor: "pointer" }} />
              <span style={{ flex: 1, color: "#e8e8f8", fontSize: "14px", fontWeight: "600" }}>{cat.name}</span>
              {cat.enabled && <>
                <input
                  style={{ ...S.input, width: "120px" }}
                  type="number" placeholder={cat.budget_type === "percentage" ? "%" : "₹"}
                  value={cat.budget_amount}
                  onChange={e => setCats(c => c.map((x, j) => j === i ? { ...x, budget_amount: e.target.value } : x))}
                />
                <select
                  style={{ ...S.input, width: "110px" }}
                  value={cat.budget_type}
                  onChange={e => setCats(c => c.map((x, j) => j === i ? { ...x, budget_type: e.target.value } : x))}
                >
                  <option value="fixed">₹ Fixed</option>
                  <option value="percentage">% of salary</option>
                </select>
              </>}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
          <input style={{ ...S.input, flex: 1 }} placeholder="Add custom category..." value={newCat}
            onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()} />
          <button onClick={addCustom} style={S.btn()}>+ Add</button>
        </div>

        {err && <div style={{ color: "#f43f5e", background: "#f43f5e11", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>⚠️ {err}</div>}

        <button onClick={submit} disabled={loading} style={{ ...S.btn(), width: "100%", padding: "14px", fontSize: "15px", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Saving..." : "Start Tracking →"}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null); // null=loading, false=unauth, {name,onboarded}=auth
  const [onboarded, setOnboarded] = useState(false);
  const [salary, setSalary] = useState(0);
  const [tab, setTab] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, balance: 0, category_budgets: [], monthly_trend: [] });
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: "", amount: "", type: "expense", category_id: "", date: "" });
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterType, setFilterType] = useState("");
  const [warning, setWarning] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { setAuth(false); return; }
    setAuth({ name: localStorage.getItem("bf_name") || "User", onboarded: true });
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterCat) params.append("category_id", filterCat);
      if (filterType) params.append("type", filterType);

      const [txRes, sumRes, catRes] = await Promise.all([
        fetch(`${API}/transactions?${params}`, { headers: authHeaders() }),
        fetch(`${API}/summary`, { headers: authHeaders() }),
        fetch(`${API}/categories`, { headers: authHeaders() }),
      ]);
      const [txD, sumD, catD] = await Promise.all([txRes.json(), sumRes.json(), catRes.json()]);
      setTransactions(txD.transactions || []);
      setSummary(sumD);
      setCategories(catD.categories || []);
      setSalary(sumD.salary || 0);
      if (!form.category_id && catD.categories?.length) {
        setForm(f => ({ ...f, category_id: String(catD.categories[0].id) }));
      }
      setOnboarded(true);
    } catch { setErr("Cannot reach backend"); }
  }, [search, filterCat, filterType]);

  useEffect(() => {
    if (auth && auth.onboarded !== false) fetchAll();
  }, [auth, fetchAll]);

  const handleSubmit = async () => {
    setErr(""); setWarning("");
    if (!form.title.trim() || !form.amount || !form.category_id) { setErr("Fill all fields."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/transactions`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...form, amount: parseFloat(form.amount), category_id: parseInt(form.category_id) }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); } else {
        if (data.warning) setWarning(data.warning);
        setForm(f => ({ ...f, title: "", amount: "", date: "" }));
        fetchAll();
      }
    } catch { setErr("Server error"); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/transactions/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchAll();
  };

  const exportCSV = () => {
    window.open(`${API}/export/csv?token=${getToken()}`, "_blank");
    fetch(`${API}/export/csv`, { headers: authHeaders() })
      .then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
      });
  };

  const logout = async () => {
    await fetch(`${API}/auth/logout`, { method: "POST", headers: authHeaders() });
    localStorage.removeItem("bf_token"); localStorage.removeItem("bf_name");
    setAuth(false);
  };

  if (auth === null) return <div style={{ minHeight: "100vh", background: "#0a0a14", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed", fontFamily: "sans-serif" }}>Loading...</div>;
  if (auth === false) return <AuthPage onAuth={(u) => { setAuth(u); setOnboarded(u.onboarded); }} />;
  if (!onboarded) return <OnboardingPage salary={salary || 50000} onDone={() => { setOnboarded(true); fetchAll(); }} />;

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a14", color: "#e8e8f8", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      {/* NAV */}
      <nav style={{ background: "#10101e", borderBottom: "1px solid #1e1e35", padding: "0 32px", display: "flex", alignItems: "center", height: "60px", gap: "8px" }}>
        <span style={{ fontWeight: "800", fontSize: "18px", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginRight: "24px" }}>💸 BudgetFlow</span>
        {["dashboard", "add", "transactions"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 16px", border: "none", borderRadius: "8px", background: tab === t ? "#7c3aed" : "transparent", color: tab === t ? "#fff" : "#555", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
            {t === "add" ? "+ Add" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={exportCSV} style={{ ...S.btn("#1e1e35", "#888"), padding: "7px 14px", fontSize: "12px" }}>↓ CSV</button>
          <span style={{ color: "#555", fontSize: "13px" }}>👤 {auth.name}</span>
          <button onClick={logout} style={{ ...S.btn("#1e1e35", "#f43f5e"), padding: "7px 14px", fontSize: "12px" }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 24px" }}>
        {err && <div style={{ background: "#f43f5e15", border: "1px solid #f43f5e44", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", color: "#f43f5e", fontSize: "13px" }}>⚠️ {err}</div>}
        {warning && <div style={{ background: "#f59e0b15", border: "1px solid #f59e0b44", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", color: "#f59e0b", fontSize: "13px" }}>{warning}</div>}

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "16px", marginBottom: "28px" }}>
              {[
                { label: "Balance", value: summary.balance, color: summary.balance >= 0 ? "#7c3aed" : "#f43f5e" },
                { label: "Income", value: summary.total_income, color: "#10b981" },
                { label: "Expenses", value: summary.total_expense, color: "#f43f5e" },
                { label: "Monthly Salary", value: summary.salary, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ ...S.card, borderColor: s.color + "33" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#555", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: "700" }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: s.color }}>{fmt(s.value)}</p>
                </div>
              ))}
            </div>

            {/* Budget bars */}
            <div style={{ ...S.card, marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 20px", fontSize: "14px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>Category Budgets</h3>
              {summary.category_budgets?.length === 0
                ? <p style={{ color: "#444", fontSize: "14px" }}>No categories yet.</p>
                : summary.category_budgets?.map(item => <BudgetBar key={item.id} item={item} />)
              }
            </div>

            {/* Monthly trend */}
            {summary.monthly_trend?.length > 0 && (
              <div style={S.card}>
                <h3 style={{ margin: "0 0 20px", fontSize: "14px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>Monthly Trend</h3>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "100px" }}>
                  {summary.monthly_trend.map(m => {
                    const max = Math.max(...summary.monthly_trend.map(x => Math.max(x.income, x.expense)), 1);
                    return (
                      <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "70px" }}>
                          <div title={`Income: ${fmt(m.income)}`} style={{ width: "12px", height: `${(m.income / max) * 70}px`, background: "#10b981", borderRadius: "3px 3px 0 0" }} />
                          <div title={`Expense: ${fmt(m.expense)}`} style={{ width: "12px", height: `${(m.expense / max) * 70}px`, background: "#f43f5e", borderRadius: "3px 3px 0 0" }} />
                        </div>
                        <span style={{ fontSize: "10px", color: "#444" }}>{m.month?.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#10b981" }}>■ Income</span>
                  <span style={{ fontSize: "11px", color: "#f43f5e" }}>■ Expense</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ADD TRANSACTION */}
        {tab === "add" && (
          <>
            <h2 style={{ margin: "0 0 24px", fontSize: "20px", fontWeight: "800" }}>Add Transaction</h2>
            <div style={S.card}>
              <div style={{ display: "flex", background: "#0f0f1a", borderRadius: "10px", padding: "4px", marginBottom: "22px" }}>
                {["expense", "income"].map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", background: form.type === t ? (t === "income" ? "#10b981" : "#f43f5e") : "transparent", color: form.type === t ? "#fff" : "#555", fontWeight: "700", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>
                    {t === "income" ? "⬆ Income" : "⬇ Expense"}
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={S.label}>Title</label>
                  <input style={S.input} placeholder="e.g. Grocery run" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>Amount (₹)</label>
                  <input style={S.input} type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>Date</label>
                  <input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={S.label}>Category</label>
                  <select style={S.input} value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} {c.budget_amount > 0 ? `(Budget: ${fmt(c.budget_amount)})` : ""}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={loading} style={{ ...S.btn(), width: "100%", padding: "13px", marginTop: "22px", fontSize: "15px", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Saving..." : `Add ${form.type === "income" ? "Income" : "Expense"}`}
              </button>
            </div>
          </>
        )}

        {/* TRANSACTIONS */}
        {tab === "transactions" && (
          <>
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", flex: 1 }}>Transactions</h2>
              <input style={{ ...S.input, width: "200px" }} placeholder="🔍 Search..." value={search} onChange={e => { setSearch(e.target.value); }} />
              <select style={{ ...S.input, width: "150px" }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select style={{ ...S.input, width: "130px" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <button onClick={fetchAll} style={S.btn()}>Apply</button>
            </div>

            {transactions.length === 0
              ? <div style={{ ...S.card, textAlign: "center", padding: "48px" }}><p style={{ color: "#444" }}>No transactions found.</p></div>
              : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {transactions.map(t => (
                  <div key={t.id} style={{ ...S.card, padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: (t.category_color || "#7c3aed") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                      {t.type === "income" ? "⬆" : "⬇"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 3px", fontWeight: "700", fontSize: "14px" }}>{t.title}</p>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <Tag color={t.category_color || "#7c3aed"}>{t.category_name || "—"}</Tag>
                        {t.date && <span style={{ fontSize: "11px", color: "#444" }}>{t.date}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ margin: "0 0 4px", fontWeight: "800", fontSize: "16px", color: t.type === "income" ? "#10b981" : "#f43f5e" }}>
                        {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                      </p>
                      <button onClick={() => handleDelete(t.id)} style={{ background: "#f43f5e15", color: "#f43f5e", border: "none", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", cursor: "pointer", fontWeight: "700" }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            }
          </>
        )}
      </div>
    </div>
  );
}