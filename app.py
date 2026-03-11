from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
import hashlib
import secrets
import csv
import io

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "budget.db")

DEFAULT_CATEGORIES = [
    "Food & Dining", "Transport", "Shopping", "Entertainment",
    "Health", "Utilities", "Salary", "Freelance", "Investment", "Other"
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salary REAL DEFAULT 0,
            onboarded INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            budget_amount REAL DEFAULT 0,
            budget_type TEXT DEFAULT 'fixed',
            color TEXT DEFAULT '#6366f1',
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category_id INTEGER,
            date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (category_id) REFERENCES categories(id)
        );
    ''')
    conn.commit()
    conn.close()


init_db()


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def get_current_user(req):
    token = req.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    conn = get_db()
    row = conn.execute(
        "SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token = ?", (token,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


# ─── AUTH ────────────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    required = ["name", "email", "password", "salary"]
    for f in required:
        if not data.get(f):
            return jsonify({"error": f"Missing field: {f}"}), 400

    try:
        salary = float(data["salary"])
    except ValueError:
        return jsonify({"error": "Invalid salary"}), 400

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (data["email"],)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Email already registered"}), 409

    pw_hash = hash_password(data["password"])
    cursor = conn.execute(
        "INSERT INTO users (name, email, password_hash, salary) VALUES (?, ?, ?, ?)",
        (data["name"].strip(), data["email"].strip().lower(), pw_hash, salary)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    token = secrets.token_hex(32)
    conn = get_db()
    conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    conn.commit()
    conn.close()

    return jsonify({"token": token, "name": data["name"], "onboarded": False}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE email = ? AND password_hash = ?",
        (data.get("email", "").lower(), hash_password(data.get("password", "")))
    ).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    token = secrets.token_hex(32)
    conn = get_db()
    conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user["id"]))
    conn.commit()
    conn.close()

    return jsonify({"token": token, "name": user["name"], "onboarded": bool(user["onboarded"])})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Logged out"})


# ─── ONBOARDING ──────────────────────────────────────────────────────────────

@app.route("/api/onboarding", methods=["POST"])
def complete_onboarding():
    user = get_current_user(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    categories = data.get("categories", [])

    if not categories:
        return jsonify({"error": "At least one category required"}), 400

    conn = get_db()
    conn.execute("DELETE FROM categories WHERE user_id = ?", (user["id"],))

    COLORS = ["#6366f1","#f59e0b","#10b981","#3b82f6","#ec4899",
              "#8b5cf6","#14b8a6","#f97316","#06b6d4","#84cc16",
              "#ef4444","#64748b"]

    for i, cat in enumerate(categories):
        budget_amount = float(cat.get("budget_amount", 0))
        budget_type = cat.get("budget_type", "fixed")
        # if percentage, convert to fixed amount
        if budget_type == "percentage":
            budget_amount = (budget_amount / 100) * user["salary"]

        conn.execute(
            "INSERT INTO categories (user_id, name, budget_amount, budget_type, color) VALUES (?, ?, ?, ?, ?)",
            (user["id"], cat["name"].strip(), budget_amount, budget_type, COLORS[i % len(COLORS)])
        )

    conn.execute("UPDATE users SET onboarded = 1 WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    return jsonify({"message": "Onboarding complete"})


@app.route("/api/default-categories", methods=["GET"])
def get_default_categories():
    return jsonify({"categories": DEFAULT_CATEGORIES})


# ─── CATEGORIES ──────────────────────────────────────────────────────────────

@app.route("/api/categories", methods=["GET"])
def get_categories():
    user = get_current_user(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    rows = conn.execute("SELECT * FROM categories WHERE user_id = ?", (user["id"],)).fetchall()
    conn.close()
    return jsonify({"categories": [dict(r) for r in rows]})


# ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    user = get_current_user(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    search = request.args.get("search", "")
    category_id = request.args.get("category_id", "")
    tx_type = request.args.get("type", "")
    date_from = request.args.get("date_from", "")
    date_to = request.args.get("date_to", "")

    query = """
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
    """
    params = [user["id"]]

    if search:
        query += " AND t.title LIKE ?"
        params.append(f"%{search}%")
    if category_id:
        query += " AND t.category_id = ?"
        params.append(category_id)
    if tx_type:
        query += " AND t.type = ?"
        params.append(tx_type)
    if date_from:
        query += " AND t.date >= ?"
        params.append(date_from)
    if date_to:
        query += " AND t.date <= ?"
        params.append(date_to)

    query += " ORDER BY t.id DESC"

    conn = get_db()
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify({"transactions": [dict(r) for r in rows]})


@app.route("/api/transactions", methods=["POST"])
def add_transaction():
    user = get_current_user(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    for f in ["title", "amount", "type", "category_id"]:
        if not data.get(f) and data.get(f) != 0:
            return jsonify({"error": f"Missing field: {f}"}), 400

    if data["type"] not in ["income", "expense"]:
        return jsonify({"error": "Type must be income or expense"}), 400

    try:
        amount = float(data["amount"])
        if amount <= 0:
            raise ValueError
    except ValueError:
        return jsonify({"error": "Amount must be a positive number"}), 400

    # Check budget warning
    warning = None
    if data["type"] == "expense":
        conn = get_db()
        cat = conn.execute("SELECT * FROM categories WHERE id = ? AND user_id = ?",
                           (data["category_id"], user["id"])).fetchone()
        if cat and cat["budget_amount"] > 0:
            spent = conn.execute(
                "SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=? AND category_id=? AND type='expense'",
                (user["id"], data["category_id"])
            ).fetchone()["total"]
            conn.close()
            new_total = spent + amount
            if new_total > cat["budget_amount"]:
                warning = f"⚠️ Over budget for {cat['name']}! Budget: ₹{cat['budget_amount']:.0f}, Spent: ₹{new_total:.0f}"
        else:
            conn.close()

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO transactions (user_id, title, amount, type, category_id, date) VALUES (?, ?, ?, ?, ?, ?)",
        (user["id"], data["title"].strip(), amount, data["type"], data["category_id"], data.get("date", ""))
    )
    conn.commit()
    new_id = cursor.lastrowid
    row = conn.execute(
        "SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?",
        (new_id,)
    ).fetchone()
    conn.close()

    resp = {"message": "Transaction added", "transaction": dict(row)}
    if warning:
        resp["warning"] = warning
    return jsonify(resp), 201


@app.route("/api/transactions/<int:tid>", methods=["DELETE"])
def delete_transaction(tid):
    user = get_current_user(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    result = conn.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tid, user["id"]))
    conn.commit()
    conn.close()

    if result.rowcount == 0:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"message": "Deleted"})


# ─── SUMMARY ─────────────────────────────────────────────────────────────────

@app.route("/api/summary", methods=["GET"])
def get_summary():
    user = get_current_user(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    txs = conn.execute(
        "SELECT t.*, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = ?",
        (user["id"],)
    ).fetchall()
    cats = conn.execute("SELECT * FROM categories WHERE user_id = ?", (user["id"],)).fetchall()
    conn.close()

    transactions = [dict(r) for r in txs]
    categories = [dict(c) for c in cats]

    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    balance = total_income - total_expense

    # Category budgets with spent amounts
    category_budgets = []
    for cat in categories:
        spent = sum(t["amount"] for t in transactions if t["type"] == "expense" and t["category_id"] == cat["id"])
        category_budgets.append({
            "id": cat["id"],
            "name": cat["name"],
            "color": cat["color"],
            "budget": cat["budget_amount"],
            "spent": spent,
            "remaining": max(0, cat["budget_amount"] - spent),
            "over_budget": spent > cat["budget_amount"] and cat["budget_amount"] > 0,
            "percent_used": round((spent / cat["budget_amount"]) * 100, 1) if cat["budget_amount"] > 0 else 0
        })

    # Monthly trend (last 6 months)
    monthly = {}
    for t in transactions:
        month = (t["date"] or "")[:7]
        if month:
            if month not in monthly:
                monthly[month] = {"month": month, "income": 0, "expense": 0}
            monthly[month][t["type"]] += t["amount"]

    return jsonify({
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance,
        "salary": user["salary"],
        "category_budgets": category_budgets,
        "monthly_trend": sorted(monthly.values(), key=lambda x: x["month"])[-6:]
    })


# ─── EXPORT ──────────────────────────────────────────────────────────────────

@app.route("/api/export/csv", methods=["GET"])
def export_csv():
    user = get_current_user(request)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    rows = conn.execute(
        "SELECT t.title, t.amount, t.type, c.name as category, t.date FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? ORDER BY t.date DESC",
        (user["id"],)
    ).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Amount", "Type", "Category", "Date"])
    for row in rows:
        writer.writerow([row["title"], row["amount"], row["type"], row["category"], row["date"]])

    from flask import Response
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"}
    )


if __name__ == "__main__":
    app.run(debug=True, port=8000)