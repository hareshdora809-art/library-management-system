#!/usr/bin/env python3
"""
Alexandria Library Management System - Native Desktop Application
Built with Python 3 + Tkinter / TTK + SQLite (Zero external dependencies)
"""

import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import sqlite3
import os
import sys
from datetime import datetime, timedelta

# Import DB helper from server module if available, or define local path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "library.db")

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def update_overdue_statuses():
    """Recalculate overdue fines and status"""
    conn = get_db()
    c = conn.cursor()
    today = datetime.now().date()
    today_str = today.isoformat()

    c.execute("SELECT id, due_date FROM borrows WHERE status = 'Borrowed' AND due_date < ?", (today_str,))
    rows = c.fetchall()
    for row in rows:
        due = datetime.strptime(row['due_date'], "%Y-%m-%d").date()
        days_late = (today - due).days
        fine = max(0.0, round(days_late * 0.50, 2))
        c.execute("UPDATE borrows SET status = 'Overdue', fine_amount = ? WHERE id = ?", (fine, row['id']))
    conn.commit()
    conn.close()

class AlexandriaDesktopApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Alexandria | Library Management Desktop App")
        self.geometry("1100x720")
        self.minsize(960, 600)
        self.configure(bg="#0f172a")

        # Style configuration
        self.style = ttk.Style(self)
        self.style.theme_use("clam")
        self.configure_styles()

        # Update overdue fees
        update_overdue_statuses()

        # Build UI layout
        self.create_layout()

        # Load initial tab
        self.switch_tab("dashboard")

    def configure_styles(self):
        # Palette: Dark modern slate and indigo
        self.style.configure(".", font=("Helvetica", 11), background="#f8fafc", foreground="#1e293b")
        self.style.configure("Sidebar.TFrame", background="#0f172a")
        
        # Sidebar Buttons
        self.style.configure("Nav.TButton", font=("Helvetica", 11, "bold"), padding=10,
                             background="#1e293b", foreground="#f8fafc", borderwidth=0)
        self.style.map("Nav.TButton",
                       background=[("active", "#4f46e5"), ("pressed", "#4338ca")],
                       foreground=[("active", "#ffffff")])

        # Action Buttons
        self.style.configure("Primary.TButton", font=("Helvetica", 10, "bold"), padding=6,
                             background="#4f46e5", foreground="#ffffff", borderwidth=0)
        self.style.map("Primary.TButton",
                       background=[("active", "#4338ca"), ("pressed", "#3730a3")])

        self.style.configure("Danger.TButton", font=("Helvetica", 10, "bold"), padding=6,
                             background="#e11d48", foreground="#ffffff", borderwidth=0)
        self.style.map("Danger.TButton",
                       background=[("active", "#be123c"), ("pressed", "#9f1239")])

        # Treeview
        self.style.configure("Treeview", font=("Helvetica", 10), rowheight=28,
                             background="#ffffff", fieldbackground="#ffffff", foreground="#0f172a")
        self.style.configure("Treeview.Heading", font=("Helvetica", 10, "bold"), padding=6,
                             background="#e2e8f0", foreground="#0f172a")
        self.style.map("Treeview", background=[("selected", "#6366f1")], foreground=[("selected", "#ffffff")])

    def create_layout(self):
        # Left Sidebar
        self.sidebar = ttk.Frame(self, style="Sidebar.TFrame", width=230)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)

        # Brand
        brand_frame = tk.Frame(self.sidebar, bg="#0f172a", pady=20, padx=16)
        brand_frame.pack(fill="x")
        
        lbl_brand = tk.Label(brand_frame, text="📚 Alexandria", font=("Helvetica", 16, "bold"), fg="#ffffff", bg="#0f172a")
        lbl_brand.pack(anchor="w")
        lbl_sub = tk.Label(brand_frame, text="Desktop Library Suite", font=("Helvetica", 9), fg="#94a3b8", bg="#0f172a")
        lbl_sub.pack(anchor="w")

        # Nav Buttons
        nav_items = [
            ("📊 Dashboard", "dashboard"),
            ("📖 Books Catalog", "books"),
            ("🔄 Issue & Return", "circulation"),
            ("👥 Members", "members"),
            ("⚠️ Overdue & Fines", "overdue")
        ]

        self.nav_buttons = {}
        nav_container = tk.Frame(self.sidebar, bg="#0f172a", padx=10)
        nav_container.pack(fill="x", pady=10)

        for text, key in nav_items:
            btn = ttk.Button(nav_container, text=text, style="Nav.TButton",
                             command=lambda k=key: self.switch_tab(k))
            btn.pack(fill="x", pady=4)
            self.nav_buttons[key] = btn

        # Sidebar Footer
        footer_frame = tk.Frame(self.sidebar, bg="#0f172a", padx=14, pady=16)
        footer_frame.pack(side="bottom", fill="x")
        lbl_db = tk.Label(footer_frame, text="● SQLite Connected", font=("Helvetica", 9, "bold"), fg="#10b981", bg="#0f172a")
        lbl_db.pack(anchor="w")
        lbl_db_path = tk.Label(footer_frame, text=os.path.basename(DB_FILE), font=("Helvetica", 8), fg="#64748b", bg="#0f172a")
        lbl_db_path.pack(anchor="w")

        # Main Content Canvas
        self.content_area = tk.Frame(self, bg="#f8fafc", padx=24, pady=20)
        self.content_area.pack(side="right", fill="both", expand=True)

    def switch_tab(self, tab_name):
        for widget in self.content_area.winfo_children():
            widget.destroy()

        if tab_name == "dashboard":
            self.render_dashboard()
        elif tab_name == "books":
            self.render_books()
        elif tab_name == "circulation":
            self.render_circulation()
        elif tab_name == "members":
            self.render_members()
        elif tab_name == "overdue":
            self.render_overdue()

    # 1. DASHBOARD
    def render_dashboard(self):
        update_overdue_statuses()
        conn = get_db()
        c = conn.cursor()

        c.execute("SELECT COUNT(*), COALESCE(SUM(total_copies), 0), COALESCE(SUM(available_copies), 0) FROM books")
        titles, copies, available = c.fetchone()

        c.execute("SELECT COUNT(*) FROM members WHERE status = 'Active'")
        members = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM borrows WHERE status = 'Borrowed'")
        borrowed = c.fetchone()[0]

        c.execute("SELECT COUNT(*), COALESCE(SUM(fine_amount), 0) FROM borrows WHERE status = 'Overdue'")
        overdue, fines = c.fetchone()
        conn.close()

        # Header
        header = tk.Frame(self.content_area, bg="#f8fafc")
        header.pack(fill="x", pady=(0, 16))
        tk.Label(header, text="Dashboard Overview", font=("Helvetica", 18, "bold"), fg="#0f172a", bg="#f8fafc").pack(anchor="w")
        tk.Label(header, text="Real-time circulation statistics and rack inventory", font=("Helvetica", 10), fg="#64748b", bg="#f8fafc").pack(anchor="w")

        # KPI Cards Frame
        kpi_frame = tk.Frame(self.content_area, bg="#f8fafc")
        kpi_frame.pack(fill="x", pady=(0, 20))

        cards_data = [
            ("Total Catalog Volumes", f"{titles} Titles ({copies} Copies)", f"{available} available in racks", "#4f46e5"),
            ("Active Patrons", f"{members} Members", "Students, Faculty & Community", "#059669"),
            ("Active Loans", f"{borrowed} Books", "Currently issued out", "#2563eb"),
            ("Overdue & Fines", f"{overdue} Overdue", f"${fines:.2f} unpaid penalties", "#dc2626")
        ]

        for i, (title, main_val, sub_val, color) in enumerate(cards_data):
            card = tk.Frame(kpi_frame, bg="#ffffff", padx=16, pady=14, relief="ridge", borderwidth=1)
            card.grid(row=0, column=i, sticky="nsew", padx=6)
            kpi_frame.columnconfigure(i, weight=1)

            tk.Label(card, text=title.upper(), font=("Helvetica", 8, "bold"), fg="#64748b", bg="#ffffff").pack(anchor="w")
            tk.Label(card, text=main_val, font=("Helvetica", 14, "bold"), fg=color, bg="#ffffff", pady=4).pack(anchor="w")
            tk.Label(card, text=sub_val, font=("Helvetica", 8), fg="#94a3b8", bg="#ffffff").pack(anchor="w")

        # Recent Loans Section
        recent_frame = tk.Frame(self.content_area, bg="#ffffff", padx=16, pady=16, relief="ridge", borderwidth=1)
        recent_frame.pack(fill="both", expand=True)

        tk.Label(recent_frame, text="Recent Circulation Activity", font=("Helvetica", 13, "bold"), fg="#0f172a", bg="#ffffff").pack(anchor="w", pady=(0, 10))

        columns = ("id", "book", "member", "due", "status")
        tree = ttk.Treeview(recent_frame, columns=columns, show="headings", height=8)
        tree.heading("id", text="#")
        tree.heading("book", text="Book Title")
        tree.heading("member", text="Patron")
        tree.heading("due", text="Due Date")
        tree.heading("status", text="Status")

        tree.column("id", width=40, anchor="center")
        tree.column("book", width=250)
        tree.column("member", width=180)
        tree.column("due", width=100, anchor="center")
        tree.column("status", width=90, anchor="center")

        tree.pack(fill="both", expand=True)

        conn = get_db()
        c = conn.cursor()
        c.execute("""
            SELECT b.id, bk.title, m.name, b.due_date, b.status
            FROM borrows b
            JOIN books bk ON b.book_id = bk.id
            JOIN members m ON b.member_id = m.id
            ORDER BY b.id DESC LIMIT 10
        """)
        for row in c.fetchall():
            tree.insert("", "end", values=(row[0], row[1], row[2], row[3], row[4]))
        conn.close()

    # 2. BOOKS CATALOG
    def render_books(self):
        header = tk.Frame(self.content_area, bg="#f8fafc")
        header.pack(fill="x", pady=(0, 12))
        tk.Label(header, text="Books Catalog & Shelf Inventory", font=("Helvetica", 18, "bold"), fg="#0f172a", bg="#f8fafc").pack(side="left")

        btn_add = ttk.Button(header, text="➕ Add New Book", style="Primary.TButton", command=self.dialog_add_book)
        btn_add.pack(side="right")

        # Toolbar
        toolbar = tk.Frame(self.content_area, bg="#f8fafc", pady=4)
        toolbar.pack(fill="x", pady=(0, 10))

        tk.Label(toolbar, text="Search:", font=("Helvetica", 10, "bold"), bg="#f8fafc").pack(side="left", padx=(0, 6))
        self.book_search_var = tk.StringVar()
        entry_search = ttk.Entry(toolbar, textvariable=self.book_search_var, width=28)
        entry_search.pack(side="left", padx=(0, 12))
        entry_search.bind("<KeyRelease>", lambda e: self.load_books_data())

        tk.Label(toolbar, text="Category:", font=("Helvetica", 10, "bold"), bg="#f8fafc").pack(side="left", padx=(0, 6))
        self.book_cat_var = tk.StringVar(value="All")
        cat_combo = ttk.Combobox(toolbar, textvariable=self.book_cat_var, state="readonly",
                                 values=["All", "Technology", "Fiction", "History", "Science", "Psychology", "Self-Help"], width=15)
        cat_combo.pack(side="left")
        cat_combo.bind("<<ComboboxSelected>>", lambda e: self.load_books_data())

        # Table Frame
        tbl_frame = tk.Frame(self.content_area, bg="#ffffff", relief="ridge", borderwidth=1)
        tbl_frame.pack(fill="both", expand=True)

        cols = ("id", "title", "author", "isbn", "cat", "year", "available", "location")
        self.books_tree = ttk.Treeview(tbl_frame, columns=cols, show="headings", selectmode="browse")
        self.books_tree.heading("id", text="ID")
        self.books_tree.heading("title", text="Title")
        self.books_tree.heading("author", text="Author")
        self.books_tree.heading("isbn", text="ISBN")
        self.books_tree.heading("cat", text="Category")
        self.books_tree.heading("year", text="Year")
        self.books_tree.heading("available", text="Copies Avail/Total")
        self.books_tree.heading("location", text="Rack / Location")

        self.books_tree.column("id", width=45, anchor="center")
        self.books_tree.column("title", width=220)
        self.books_tree.column("author", width=160)
        self.books_tree.column("isbn", width=130)
        self.books_tree.column("cat", width=110)
        self.books_tree.column("year", width=60, anchor="center")
        self.books_tree.column("available", width=120, anchor="center")
        self.books_tree.column("location", width=100)

        scrollbar = ttk.Scrollbar(tbl_frame, orient="vertical", command=self.books_tree.yview)
        self.books_tree.configure(yscrollcommand=scrollbar.set)
        self.books_tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Bottom Actions
        actions_bar = tk.Frame(self.content_area, bg="#f8fafc", pady=10)
        actions_bar.pack(fill="x")
        ttk.Button(actions_bar, text="✏️ Edit Selected", style="Primary.TButton", command=self.dialog_edit_book).pack(side="left", padx=4)
        ttk.Button(actions_bar, text="🗑️ Delete Selected", style="Danger.TButton", command=self.action_delete_book).pack(side="left", padx=4)

        self.load_books_data()

    def load_books_data(self):
        for item in self.books_tree.get_children():
            self.books_tree.delete(item)

        search = self.book_search_var.get().strip().lower()
        cat = self.book_cat_var.get()

        conn = get_db()
        c = conn.cursor()
        sql = "SELECT id, title, author, isbn, category, year, available_copies, total_copies, location FROM books WHERE 1=1"
        params = []
        if search:
            sql += " AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR isbn LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        if cat and cat != "All":
            sql += " AND category = ?"
            params.append(cat)
        sql += " ORDER BY id DESC"

        c.execute(sql, params)
        for row in c.fetchall():
            copies_str = f"{row[6]} / {row[7]}"
            self.books_tree.insert("", "end", values=(row[0], row[1], row[2], row[3], row[4], row[5], copies_str, row[8]))
        conn.close()

    def dialog_add_book(self):
        dlg = tk.Toplevel(self)
        dlg.title("Add New Book to Catalog")
        dlg.geometry("450x420")
        dlg.resizable(False, False)
        dlg.grab_set()

        fields = [
            ("Title *:", "title"),
            ("Author *:", "author"),
            ("ISBN *:", "isbn"),
            ("Category:", "category"),
            ("Year:", "year"),
            ("Total Copies:", "copies"),
            ("Location Shelf:", "location")
        ]
        entries = {}

        for i, (label, key) in enumerate(fields):
            tk.Label(dlg, text=label, font=("Helvetica", 10, "bold")).grid(row=i, column=0, sticky="w", padx=16, pady=6)
            if key == "category":
                cb = ttk.Combobox(dlg, values=["Technology", "Fiction", "History", "Science", "Psychology", "Self-Help"], state="readonly")
                cb.set("Technology")
                cb.grid(row=i, column=1, sticky="ew", padx=16, pady=6)
                entries[key] = cb
            else:
                e = ttk.Entry(dlg)
                if key == "year": e.insert(0, "2024")
                if key == "copies": e.insert(0, "3")
                if key == "location": e.insert(0, "Shelf A-1")
                e.grid(row=i, column=1, sticky="ew", padx=16, pady=6)
                entries[key] = e

        dlg.columnconfigure(1, weight=1)

        def save():
            title = entries["title"].get().strip()
            author = entries["author"].get().strip()
            isbn = entries["isbn"].get().strip()
            category = entries["category"].get()
            year = int(entries["year"].get() or 2024)
            copies = int(entries["copies"].get() or 1)
            loc = entries["location"].get().strip()

            if not title or not author or not isbn:
                messagebox.showerror("Error", "Title, Author, and ISBN are required!", parent=dlg)
                return

            try:
                conn = get_db()
                c = conn.cursor()
                c.execute("""
                    INSERT INTO books (title, author, isbn, category, year, total_copies, available_copies, location)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (title, author, isbn, category, year, copies, copies, loc))
                conn.commit()
                conn.close()
                dlg.destroy()
                self.load_books_data()
                messagebox.showinfo("Success", f"'{title}' cataloged successfully!")
            except Exception as ex:
                messagebox.showerror("Database Error", str(ex), parent=dlg)

        ttk.Button(dlg, text="Save Book", style="Primary.TButton", command=save).grid(row=len(fields), column=1, sticky="e", padx=16, pady=16)

    def dialog_edit_book(self):
        sel = self.books_tree.selection()
        if not sel:
            messagebox.showwarning("Select Book", "Please select a book to edit.")
            return

        book_id = self.books_tree.item(sel[0])["values"][0]
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM books WHERE id = ?", (book_id,))
        b = c.fetchone()
        conn.close()

        if not b: return

        dlg = tk.Toplevel(self)
        dlg.title(f"Edit Book #{book_id}")
        dlg.geometry("450x420")
        dlg.resizable(False, False)
        dlg.grab_set()

        entries = {}
        fields = [
            ("Title *:", "title", b["title"]),
            ("Author *:", "author", b["author"]),
            ("ISBN *:", "isbn", b["isbn"]),
            ("Category:", "category", b["category"]),
            ("Year:", "year", b["year"]),
            ("Total Copies:", "copies", b["total_copies"]),
            ("Location Shelf:", "location", b["location"])
        ]

        for i, (label, key, val) in enumerate(fields):
            tk.Label(dlg, text=label, font=("Helvetica", 10, "bold")).grid(row=i, column=0, sticky="w", padx=16, pady=6)
            if key == "category":
                cb = ttk.Combobox(dlg, values=["Technology", "Fiction", "History", "Science", "Psychology", "Self-Help"], state="readonly")
                cb.set(val or "Technology")
                cb.grid(row=i, column=1, sticky="ew", padx=16, pady=6)
                entries[key] = cb
            else:
                e = ttk.Entry(dlg)
                e.insert(0, str(val or ""))
                e.grid(row=i, column=1, sticky="ew", padx=16, pady=6)
                entries[key] = e

        dlg.columnconfigure(1, weight=1)

        def update():
            title = entries["title"].get().strip()
            author = entries["author"].get().strip()
            isbn = entries["isbn"].get().strip()
            category = entries["category"].get()
            year = int(entries["year"].get() or 2024)
            copies = int(entries["copies"].get() or 1)
            loc = entries["location"].get().strip()

            try:
                conn = get_db()
                c = conn.cursor()
                c.execute("""
                    UPDATE books
                    SET title = ?, author = ?, isbn = ?, category = ?, year = ?, total_copies = ?, location = ?
                    WHERE id = ?
                """, (title, author, isbn, category, year, copies, loc, book_id))
                conn.commit()
                conn.close()
                dlg.destroy()
                self.load_books_data()
                messagebox.showinfo("Success", "Book updated successfully!")
            except Exception as ex:
                messagebox.showerror("Database Error", str(ex), parent=dlg)

        ttk.Button(dlg, text="Update Book", style="Primary.TButton", command=update).grid(row=len(fields), column=1, sticky="e", padx=16, pady=16)

    def action_delete_book(self):
        sel = self.books_tree.selection()
        if not sel:
            messagebox.showwarning("Select Book", "Please select a book to delete.")
            return

        vals = self.books_tree.item(sel[0])["values"]
        book_id, title = vals[0], vals[1]

        if messagebox.askyesno("Confirm Delete", f"Are you sure you want to delete '{title}'?"):
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM borrows WHERE book_id = ? AND status IN ('Borrowed', 'Overdue')", (book_id,))
            if c.fetchone()[0] > 0:
                conn.close()
                messagebox.showerror("Blocked", "Cannot delete a book that is currently loaned out.")
                return
            c.execute("DELETE FROM books WHERE id = ?", (book_id,))
            conn.commit()
            conn.close()
            self.load_books_data()
            messagebox.showinfo("Deleted", "Book removed from catalog.")

    # 3. CIRCULATION (Issue & Return)
    def render_circulation(self):
        header = tk.Frame(self.content_area, bg="#f8fafc")
        header.pack(fill="x", pady=(0, 14))
        tk.Label(header, text="Circulation Desk (Issue & Return)", font=("Helvetica", 18, "bold"), fg="#0f172a", bg="#f8fafc").pack(anchor="w")

        # Top Issue Box
        issue_box = tk.LabelFrame(self.content_area, text=" ⚡ Quick Issue Book ", font=("Helvetica", 10, "bold"), bg="#ffffff", padx=14, pady=10)
        issue_box.pack(fill="x", pady=(0, 14))

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT id, title, available_copies FROM books WHERE available_copies > 0 ORDER BY title ASC")
        books_avail = c.fetchall()
        self.issue_books_map = {f"{b[1]} ({b[2]} available)": b[0] for b in books_avail}

        c.execute("SELECT id, name, membership_type FROM members WHERE status = 'Active' ORDER BY name ASC")
        members_avail = c.fetchall()
        self.issue_members_map = {f"{m[1]} ({m[2]})": m[0] for m in members_avail}
        conn.close()

        tk.Label(issue_box, text="Book:", font=("Helvetica", 9, "bold"), bg="#ffffff").grid(row=0, column=0, padx=6, pady=4, sticky="w")
        self.cb_issue_book = ttk.Combobox(issue_box, values=list(self.issue_books_map.keys()), state="readonly", width=34)
        if self.issue_books_map: self.cb_issue_book.current(0)
        self.cb_issue_book.grid(row=0, column=1, padx=6, pady=4)

        tk.Label(issue_box, text="Member:", font=("Helvetica", 9, "bold"), bg="#ffffff").grid(row=0, column=2, padx=6, pady=4, sticky="w")
        self.cb_issue_member = ttk.Combobox(issue_box, values=list(self.issue_members_map.keys()), state="readonly", width=28)
        if self.issue_members_map: self.cb_issue_member.current(0)
        self.cb_issue_member.grid(row=0, column=3, padx=6, pady=4)

        tk.Label(issue_box, text="Days:", font=("Helvetica", 9, "bold"), bg="#ffffff").grid(row=0, column=4, padx=6, pady=4, sticky="w")
        self.spn_days = ttk.Spinbox(issue_box, from_=7, to=60, width=5)
        self.spn_days.set(14)
        self.spn_days.grid(row=0, column=5, padx=6, pady=4)

        btn_confirm_issue = ttk.Button(issue_box, text="Confirm Issue", style="Primary.TButton", command=self.action_issue_book)
        btn_confirm_issue.grid(row=0, column=6, padx=10, pady=4)

        # Active Loans Table
        loans_frame = tk.Frame(self.content_area, bg="#ffffff", relief="ridge", borderwidth=1)
        loans_frame.pack(fill="both", expand=True)

        cols = ("id", "book", "member", "borrow_date", "due_date", "status", "fine")
        self.loans_tree = ttk.Treeview(loans_frame, columns=cols, show="headings")
        self.loans_tree.heading("id", text="Loan ID")
        self.loans_tree.heading("book", text="Book Title")
        self.loans_tree.heading("member", text="Patron")
        self.loans_tree.heading("borrow_date", text="Issue Date")
        self.loans_tree.heading("due_date", text="Due Date")
        self.loans_tree.heading("status", text="Status")
        self.loans_tree.heading("fine", text="Late Fine")

        self.loans_tree.column("id", width=60, anchor="center")
        self.loans_tree.column("book", width=260)
        self.loans_tree.column("member", width=180)
        self.loans_tree.column("borrow_date", width=100, anchor="center")
        self.loans_tree.column("due_date", width=100, anchor="center")
        self.loans_tree.column("status", width=90, anchor="center")
        self.loans_tree.column("fine", width=80, anchor="center")

        scrollbar = ttk.Scrollbar(loans_frame, orient="vertical", command=self.loans_tree.yview)
        self.loans_tree.configure(yscrollcommand=scrollbar.set)
        self.loans_tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Bottom Actions
        actions_bar = tk.Frame(self.content_area, bg="#f8fafc", pady=10)
        actions_bar.pack(fill="x")
        ttk.Button(actions_bar, text="✅ Return Selected Book", style="Primary.TButton", command=self.action_return_book).pack(side="left", padx=4)
        ttk.Button(actions_bar, text="🔄 Renew (+14 Days)", style="Primary.TButton", command=self.action_renew_book).pack(side="left", padx=4)

        self.load_loans_data()

    def load_loans_data(self):
        for item in self.loans_tree.get_children():
            self.loans_tree.delete(item)

        update_overdue_statuses()
        conn = get_db()
        c = conn.cursor()
        c.execute("""
            SELECT b.id, bk.title, m.name, b.borrow_date, b.due_date, b.status, b.fine_amount
            FROM borrows b
            JOIN books bk ON b.book_id = bk.id
            JOIN members m ON b.member_id = m.id
            WHERE b.status IN ('Borrowed', 'Overdue')
            ORDER BY CASE WHEN b.status = 'Overdue' THEN 1 ELSE 2 END, b.due_date ASC
        """)
        for row in c.fetchall():
            fine_str = f"${row[6]:.2f}" if row[6] > 0 else "-"
            self.loans_tree.insert("", "end", values=(row[0], row[1], row[2], row[3], row[4], row[5], fine_str))
        conn.close()

    def action_issue_book(self):
        book_key = self.cb_issue_book.get()
        member_key = self.cb_issue_member.get()

        if not book_key or not member_key:
            messagebox.showwarning("Missing Selection", "Please select both a book and a member.")
            return

        book_id = self.issue_books_map[book_key]
        member_id = self.issue_members_map[member_key]
        days = int(self.spn_days.get() or 14)

        today = datetime.now().date()
        due = today + timedelta(days=days)

        conn = get_db()
        c = conn.cursor()
        c.execute("INSERT INTO borrows (book_id, member_id, borrow_date, due_date, status) VALUES (?, ?, ?, ?, 'Borrowed')",
                  (book_id, member_id, today.isoformat(), due.isoformat()))
        c.execute("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?", (book_id,))
        conn.commit()
        conn.close()

        messagebox.showinfo("Success", f"Book issued until {due.isoformat()}!")
        self.render_circulation()

    def action_return_book(self):
        sel = self.loans_tree.selection()
        if not sel:
            messagebox.showwarning("Select Loan", "Please select an active loan to return.")
            return

        loan_id = self.loans_tree.item(sel[0])["values"][0]
        today_str = datetime.now().date().isoformat()

        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT book_id, due_date FROM borrows WHERE id = ?", (loan_id,))
        borrow = c.fetchone()
        if not borrow: return

        # Fine calc
        due = datetime.strptime(borrow["due_date"], "%Y-%m-%d").date()
        cur = datetime.now().date()
        fine = max(0.0, round((cur - due).days * 0.50, 2)) if cur > due else 0.0

        c.execute("UPDATE borrows SET return_date = ?, status = 'Returned', fine_amount = ? WHERE id = ?",
                  (today_str, fine, loan_id))
        c.execute("UPDATE books SET available_copies = available_copies + 1 WHERE id = ?", (borrow["book_id"],))
        conn.commit()
        conn.close()

        if fine > 0:
            messagebox.showinfo("Book Returned", f"Book returned successfully.\nOverdue fine accrued: ${fine:.2f}")
        else:
            messagebox.showinfo("Book Returned", "Book returned successfully on time!")

        self.load_loans_data()

    def action_renew_book(self):
        sel = self.loans_tree.selection()
        if not sel:
            messagebox.showwarning("Select Loan", "Please select a loan to renew.")
            return

        loan_id = self.loans_tree.item(sel[0])["values"][0]
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT due_date FROM borrows WHERE id = ?", (loan_id,))
        b = c.fetchone()
        if b:
            cur_due = datetime.strptime(b[0], "%Y-%m-%d").date()
            new_due = cur_due + timedelta(days=14)
            status = "Borrowed" if new_due >= datetime.now().date() else "Overdue"
            c.execute("UPDATE borrows SET due_date = ?, status = ? WHERE id = ?", (new_due.isoformat(), status, loan_id))
            conn.commit()
            conn.close()
            messagebox.showinfo("Loan Extended", f"Loan extended to {new_due.isoformat()}!")
            self.load_loans_data()

    # 4. MEMBERS
    def render_members(self):
        header = tk.Frame(self.content_area, bg="#f8fafc")
        header.pack(fill="x", pady=(0, 14))
        tk.Label(header, text="Patron & Member Directory", font=("Helvetica", 18, "bold"), fg="#0f172a", bg="#f8fafc").pack(side="left")

        ttk.Button(header, text="➕ Register Member", style="Primary.TButton", command=self.dialog_add_member).pack(side="right")

        # Table
        tbl_frame = tk.Frame(self.content_area, bg="#ffffff", relief="ridge", borderwidth=1)
        tbl_frame.pack(fill="both", expand=True)

        cols = ("id", "name", "email", "phone", "type", "status", "active_loans")
        self.members_tree = ttk.Treeview(tbl_frame, columns=cols, show="headings")
        self.members_tree.heading("id", text="ID")
        self.members_tree.heading("name", text="Full Name")
        self.members_tree.heading("email", text="Email")
        self.members_tree.heading("phone", text="Phone")
        self.members_tree.heading("type", text="Type")
        self.members_tree.heading("status", text="Status")
        self.members_tree.heading("active_loans", text="Active Loans")

        self.members_tree.column("id", width=45, anchor="center")
        self.members_tree.column("name", width=180)
        self.members_tree.column("email", width=220)
        self.members_tree.column("phone", width=130)
        self.members_tree.column("type", width=100, anchor="center")
        self.members_tree.column("status", width=80, anchor="center")
        self.members_tree.column("active_loans", width=100, anchor="center")

        self.members_tree.pack(fill="both", expand=True)

        self.load_members_data()

    def load_members_data(self):
        for item in self.members_tree.get_children():
            self.members_tree.delete(item)

        conn = get_db()
        c = conn.cursor()
        c.execute("""
            SELECT m.id, m.name, m.email, m.phone, m.membership_type, m.status,
                   (SELECT COUNT(*) FROM borrows WHERE member_id = m.id AND status IN ('Borrowed', 'Overdue')) as active_count
            FROM members m
            ORDER BY m.id DESC
        """)
        for r in c.fetchall():
            self.members_tree.insert("", "end", values=(r[0], r[1], r[2], r[3], r[4], r[5], r[6]))
        conn.close()

    def dialog_add_member(self):
        dlg = tk.Toplevel(self)
        dlg.title("Register Library Patron")
        dlg.geometry("420x300")
        dlg.resizable(False, False)
        dlg.grab_set()

        fields = [("Full Name *:", "name"), ("Email *:", "email"), ("Phone:", "phone"), ("Type:", "type")]
        entries = {}
        for i, (label, key) in enumerate(fields):
            tk.Label(dlg, text=label, font=("Helvetica", 10, "bold")).grid(row=i, column=0, sticky="w", padx=16, pady=8)
            if key == "type":
                cb = ttk.Combobox(dlg, values=["Student", "Faculty", "Community"], state="readonly")
                cb.set("Student")
                cb.grid(row=i, column=1, sticky="ew", padx=16, pady=8)
                entries[key] = cb
            else:
                e = ttk.Entry(dlg)
                e.grid(row=i, column=1, sticky="ew", padx=16, pady=8)
                entries[key] = e

        dlg.columnconfigure(1, weight=1)

        def save():
            name = entries["name"].get().strip()
            email = entries["email"].get().strip()
            phone = entries["phone"].get().strip()
            mtype = entries["type"].get()

            if not name or not email:
                messagebox.showerror("Error", "Name and Email are required!", parent=dlg)
                return

            try:
                conn = get_db()
                c = conn.cursor()
                max_b = 8 if mtype == "Faculty" else 4
                c.execute("INSERT INTO members (name, email, phone, membership_type, max_books) VALUES (?, ?, ?, ?, ?)",
                          (name, email, phone, mtype, max_b))
                conn.commit()
                conn.close()
                dlg.destroy()
                self.load_members_data()
                messagebox.showinfo("Success", f"Patron '{name}' registered!")
            except Exception as ex:
                messagebox.showerror("Error", str(ex), parent=dlg)

        ttk.Button(dlg, text="Register", style="Primary.TButton", command=save).grid(row=len(fields), column=1, sticky="e", padx=16, pady=16)

    # 5. OVERDUE & FINES
    def render_overdue(self):
        update_overdue_statuses()
        header = tk.Frame(self.content_area, bg="#f8fafc")
        header.pack(fill="x", pady=(0, 14))
        tk.Label(header, text="Overdue Loans & Uncollected Fines", font=("Helvetica", 18, "bold"), fg="#dc2626", bg="#f8fafc").pack(anchor="w")

        tbl_frame = tk.Frame(self.content_area, bg="#ffffff", relief="ridge", borderwidth=1)
        tbl_frame.pack(fill="both", expand=True)

        cols = ("id", "book", "member", "due_date", "fine")
        tree = ttk.Treeview(tbl_frame, columns=cols, show="headings")
        tree.heading("id", text="Loan ID")
        tree.heading("book", text="Overdue Title")
        tree.heading("member", text="Patron")
        tree.heading("due_date", text="Due Date")
        tree.heading("fine", text="Penalty Fine")

        tree.column("id", width=60, anchor="center")
        tree.column("book", width=280)
        tree.column("member", width=200)
        tree.column("due_date", width=120, anchor="center")
        tree.column("fine", width=100, anchor="center")
        tree.pack(fill="both", expand=True)

        conn = get_db()
        c = conn.cursor()
        c.execute("""
            SELECT b.id, bk.title, m.name, b.due_date, b.fine_amount
            FROM borrows b
            JOIN books bk ON b.book_id = bk.id
            JOIN members m ON b.member_id = m.id
            WHERE b.status = 'Overdue'
            ORDER BY b.due_date ASC
        """)
        for row in c.fetchall():
            tree.insert("", "end", values=(row[0], row[1], row[2], row[3], f"${row[4]:.2f}"))
        conn.close()

def main():
    app = AlexandriaDesktopApp()
    app.mainloop()

if __name__ == "__main__":
    main()
