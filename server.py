#!/usr/bin/env python3
"""
Modern Library Management System - Backend Server
Zero external dependencies (uses standard library: http.server + sqlite3)
"""

import http.server
import socketserver
import json
import sqlite3
import os
import urllib.parse
from datetime import datetime, timedelta

PORT = 8000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "library.db")
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        year INTEGER,
        total_copies INTEGER DEFAULT 1,
        available_copies INTEGER DEFAULT 1,
        location TEXT DEFAULT 'Shelf A-1',
        description TEXT,
        cover_color TEXT DEFAULT 'from-indigo-600 to-blue-700',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        membership_type TEXT DEFAULT 'Student',
        status TEXT DEFAULT 'Active',
        join_date DATE DEFAULT (DATE('now')),
        max_books INTEGER DEFAULT 4
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS borrows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        borrow_date DATE NOT NULL,
        due_date DATE NOT NULL,
        return_date DATE,
        status TEXT DEFAULT 'Borrowed',
        fine_amount REAL DEFAULT 0.0,
        fine_paid INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
    )
    """)

    # Seed data if books table is empty
    c.execute("SELECT COUNT(*) FROM books")
    if c.fetchone()[0] == 0:
        books_data = [
            ("Clean Code", "Robert C. Martin", "978-0132350884", "Technology", 2008, 5, 4, "Shelf T-101", "A Handbook of Agile Software Craftsmanship", "from-cyan-600 to-blue-700"),
            ("The Pragmatic Programmer", "Andrew Hunt, David Thomas", "978-0135957059", "Technology", 2019, 4, 3, "Shelf T-102", "Your journey to mastery in modern software craft", "from-emerald-600 to-teal-700"),
            ("To Kill a Mockingbird", "Harper Lee", "978-0061120084", "Fiction", 1960, 6, 5, "Shelf F-201", "The unforgettable novel of a childhood in a sleepy Southern town", "from-amber-600 to-orange-700"),
            ("1984", "George Orwell", "978-0451524935", "Fiction", 1949, 8, 6, "Shelf F-202", "A startling and haunting vision of totalitarian surveillance society", "from-rose-600 to-red-800"),
            ("Sapiens: A Brief History of Humankind", "Yuval Noah Harari", "978-0062316097", "History", 2014, 5, 4, "Shelf H-301", "How humankind grew to dominate planet Earth", "from-indigo-600 to-purple-800"),
            ("A Brief History of Time", "Stephen Hawking", "978-0553380163", "Science", 1988, 4, 2, "Shelf S-401", "From the Big Bang to Black Holes in modern physics", "from-violet-600 to-indigo-900"),
            ("Designing Data-Intensive Applications", "Martin Kleppmann", "978-1449373320", "Technology", 2017, 3, 2, "Shelf T-103", "The big ideas behind reliable, scalable, and maintainable systems", "from-blue-600 to-indigo-800"),
            ("The Great Gatsby", "F. Scott Fitzgerald", "978-0743273565", "Fiction", 1925, 5, 5, "Shelf F-203", "The Jazz Age classic story of Jay Gatsby and Daisy Buchanan", "from-yellow-600 to-amber-800"),
            ("Guns, Germs, and Steel", "Jared Diamond", "978-0393317558", "History", 1997, 3, 3, "Shelf H-302", "The Fates of Human Societies and geographical determinism", "from-amber-700 to-stone-800"),
            ("Thinking, Fast and Slow", "Daniel Kahneman", "978-0374533557", "Psychology", 2011, 4, 4, "Shelf P-501", "Major insights into the two systems that drive the way we think", "from-teal-600 to-emerald-800"),
            ("Atomic Habits", "James Clear", "978-0735211292", "Self-Help", 2018, 7, 5, "Shelf S-601", "An Easy & Proven Way to Build Good Habits & Break Bad Ones", "from-red-600 to-orange-600"),
            ("Cosmos", "Carl Sagan", "978-0345331359", "Science", 1980, 4, 3, "Shelf S-402", "The story of fifteen billion years of cosmic evolution", "from-purple-600 to-blue-900")
        ]
        c.executemany("""
            INSERT INTO books (title, author, isbn, category, year, total_copies, available_copies, location, description, cover_color)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, books_data)

        members_data = [
            ("Alice Johnson", "alice.johnson@campus.edu", "+1-555-0101", "Student", "Active", "2024-01-15", 4),
            ("Marcus Vance", "marcus.v@campus.edu", "+1-555-0102", "Faculty", "Active", "2023-09-10", 8),
            ("Elena Rostova", "elena.r@campus.edu", "+1-555-0103", "Student", "Active", "2024-02-20", 4),
            ("David Kim", "david.kim@outlook.com", "+1-555-0104", "Community", "Active", "2024-03-01", 3),
            ("Sophia Chen", "sophia.chen@campus.edu", "+1-555-0105", "Student", "Active", "2023-11-12", 4),
            ("Prof. Robert Langdon", "rlangdon@campus.edu", "+1-555-0106", "Faculty", "Active", "2023-08-01", 8)
        ]
        c.executemany("""
            INSERT INTO members (name, email, phone, membership_type, status, join_date, max_books)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, members_data)

        today = datetime.now().date()
        borrows_data = [
            (1, 1, (today - timedelta(days=10)).isoformat(), (today + timedelta(days=4)).isoformat(), None, "Borrowed", 0.0, 0, "Reference for project"),
            (2, 2, (today - timedelta(days=22)).isoformat(), (today - timedelta(days=8)).isoformat(), None, "Overdue", 4.00, 0, "Second reminder sent"),
            (6, 3, (today - timedelta(days=5)).isoformat(), (today + timedelta(days=9)).isoformat(), None, "Borrowed", 0.0, 0, "Class assignment"),
            (7, 5, (today - timedelta(days=18)).isoformat(), (today - timedelta(days=4)).isoformat(), None, "Overdue", 2.00, 0, "Notice mailed"),
            (11, 4, (today - timedelta(days=20)).isoformat(), (today - timedelta(days=6)).isoformat(), (today - timedelta(days=1)).isoformat(), "Returned", 2.50, 1, "Returned fine settled"),
            (12, 1, (today - timedelta(days=2)).isoformat(), (today + timedelta(days=12)).isoformat(), None, "Borrowed", 0.0, 0, "Leisure reading")
        ]
        c.executemany("""
            INSERT INTO borrows (book_id, member_id, borrow_date, due_date, return_date, status, fine_amount, fine_paid, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, borrows_data)

    conn.commit()
    conn.close()

def update_overdue_statuses():
    """Update overdue statuses and fine amounts based on current date"""
    conn = get_db()
    c = conn.cursor()
    today_str = datetime.now().date().isoformat()
    # Mark overdue
    c.execute("""
        SELECT id, due_date FROM borrows
        WHERE status = 'Borrowed' AND due_date < ?
    """, (today_str,))
    rows = c.fetchall()
    today = datetime.now().date()
    for row in rows:
        due = datetime.strptime(row['due_date'], "%Y-%m-%d").date()
        days_late = (today - due).days
        fine = max(0.0, round(days_late * 0.50, 2)) # $0.50 per day
        c.execute("""
            UPDATE borrows SET status = 'Overdue', fine_amount = ? WHERE id = ?
        """, (fine, row['id']))
    conn.commit()
    conn.close()

class LibraryRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def parse_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > 0:
            raw = self.rfile.read(length).decode("utf-8")
            return json.loads(raw)
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if not path.startswith("/api/"):
            return super().do_GET()

        update_overdue_statuses()
        conn = get_db()
        c = conn.cursor()

        try:
            if path == "/api/status":
                self.send_json({"status": "ok", "time": datetime.now().isoformat(), "server": "Library API v1.0"})

            elif path == "/api/dashboard":
                c.execute("SELECT COUNT(*) FROM books")
                total_titles = c.fetchone()[0]

                c.execute("SELECT COALESCE(SUM(total_copies), 0), COALESCE(SUM(available_copies), 0) FROM books")
                total_copies, available_copies = c.fetchone()

                c.execute("SELECT COUNT(*) FROM members WHERE status = 'Active'")
                active_members = c.fetchone()[0]

                c.execute("SELECT COUNT(*) FROM borrows WHERE status = 'Borrowed'")
                currently_borrowed = c.fetchone()[0]

                c.execute("SELECT COUNT(*), COALESCE(SUM(fine_amount), 0) FROM borrows WHERE status = 'Overdue'")
                overdue_count, total_fines = c.fetchone()

                # Category breakdown
                c.execute("""
                    SELECT category, COUNT(*) as book_count, SUM(total_copies) as copy_count
                    FROM books GROUP BY category ORDER BY book_count DESC
                """)
                categories = [dict(row) for row in c.fetchall()]

                # Recent activity
                c.execute("""
                    SELECT b.id, b.borrow_date, b.due_date, b.return_date, b.status, b.fine_amount,
                           bk.title as book_title, m.name as member_name
                    FROM borrows b
                    JOIN books bk ON b.book_id = bk.id
                    JOIN members m ON b.member_id = m.id
                    ORDER BY b.id DESC LIMIT 6
                """)
                recent_activity = [dict(row) for row in c.fetchall()]

                self.send_json({
                    "total_titles": total_titles,
                    "total_copies": total_copies,
                    "available_copies": available_copies,
                    "active_members": active_members,
                    "currently_borrowed": currently_borrowed,
                    "overdue_count": overdue_count,
                    "total_fines": round(total_fines, 2),
                    "categories": categories,
                    "recent_activity": recent_activity
                })

            elif path == "/api/books":
                search = query.get("search", [""])[0].strip().lower()
                category = query.get("category", [""])[0].strip()

                sql = "SELECT * FROM books WHERE 1=1"
                params = []
                if search:
                    sql += " AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR isbn LIKE ?)"
                    params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
                if category and category != "All":
                    sql += " AND category = ?"
                    params.append(category)

                sql += " ORDER BY id DESC"
                c.execute(sql, params)
                books = [dict(row) for row in c.fetchall()]
                self.send_json(books)

            elif path == "/api/members":
                search = query.get("search", [""])[0].strip().lower()
                sql = """
                    SELECT m.*,
                        (SELECT COUNT(*) FROM borrows WHERE member_id = m.id AND status IN ('Borrowed', 'Overdue')) as current_borrowed_count,
                        (SELECT COALESCE(SUM(fine_amount), 0) FROM borrows WHERE member_id = m.id AND fine_paid = 0) as pending_fines
                    FROM members m WHERE 1=1
                """
                params = []
                if search:
                    sql += " AND (LOWER(m.name) LIKE ? OR LOWER(m.email) LIKE ? OR m.phone LIKE ?)"
                    params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

                sql += " ORDER BY m.id DESC"
                c.execute(sql, params)
                members = [dict(row) for row in c.fetchall()]
                self.send_json(members)

            elif path == "/api/borrows":
                status_filter = query.get("status", [""])[0].strip()
                sql = """
                    SELECT b.*,
                           bk.title as book_title, bk.author as book_author, bk.isbn as book_isbn,
                           m.name as member_name, m.email as member_email
                    FROM borrows b
                    JOIN books bk ON b.book_id = bk.id
                    JOIN members m ON b.member_id = m.id
                    WHERE 1=1
                """
                params = []
                if status_filter and status_filter != "All":
                    sql += " AND b.status = ?"
                    params.append(status_filter)

                sql += " ORDER BY CASE WHEN b.status = 'Overdue' THEN 1 WHEN b.status = 'Borrowed' THEN 2 ELSE 3 END, b.due_date ASC"
                c.execute(sql, params)
                borrows = [dict(row) for row in c.fetchall()]
                self.send_json(borrows)

            elif path == "/api/categories":
                c.execute("SELECT DISTINCT category FROM books ORDER BY category ASC")
                cats = [row[0] for row in c.fetchall()]
                self.send_json(cats)

            else:
                self.send_json({"error": "Endpoint not found"}, 404)
        finally:
            conn.close()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.parse_body()
        conn = get_db()
        c = conn.cursor()

        try:
            if path == "/api/books":
                title = body.get("title", "").strip()
                author = body.get("author", "").strip()
                isbn = body.get("isbn", "").strip()
                category = body.get("category", "General").strip()
                year = int(body.get("year", 2024))
                total_copies = int(body.get("total_copies", 1))
                location = body.get("location", "Shelf A-1").strip()
                description = body.get("description", "").strip()
                cover_color = body.get("cover_color", "from-indigo-600 to-blue-700")

                if not title or not author or not isbn:
                    return self.send_json({"error": "Title, author, and ISBN are required."}, 400)

                c.execute("""
                    INSERT INTO books (title, author, isbn, category, year, total_copies, available_copies, location, description, cover_color)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (title, author, isbn, category, year, total_copies, total_copies, location, description, cover_color))
                conn.commit()
                book_id = c.lastrowid
                self.send_json({"message": "Book added successfully!", "id": book_id}, 201)

            elif path == "/api/members":
                name = body.get("name", "").strip()
                email = body.get("email", "").strip()
                phone = body.get("phone", "").strip()
                membership_type = body.get("membership_type", "Student")
                max_books = int(body.get("max_books", 4))

                if not name or not email:
                    return self.send_json({"error": "Name and email are required."}, 400)

                c.execute("""
                    INSERT INTO members (name, email, phone, membership_type, status, max_books)
                    VALUES (?, ?, ?, ?, 'Active', ?)
                """, (name, email, phone, membership_type, max_books))
                conn.commit()
                member_id = c.lastrowid
                self.send_json({"message": "Member registered successfully!", "id": member_id}, 201)

            elif path == "/api/borrows/issue":
                book_id = int(body.get("book_id", 0))
                member_id = int(body.get("member_id", 0))
                days = int(body.get("days", 14))
                notes = body.get("notes", "").strip()

                if not book_id or not member_id:
                    return self.send_json({"error": "Book and member selections are required."}, 400)

                # Check book availability
                c.execute("SELECT available_copies, title FROM books WHERE id = ?", (book_id,))
                book = c.fetchone()
                if not book or book["available_copies"] <= 0:
                    return self.send_json({"error": "This book is currently out of stock or unavailable."}, 400)

                # Check member quota
                c.execute("SELECT max_books, status, name FROM members WHERE id = ?", (member_id,))
                member = c.fetchone()
                if not member:
                    return self.send_json({"error": "Member not found."}, 404)
                if member["status"] != "Active":
                    return self.send_json({"error": f"Member {member['name']} is {member['status']}. Cannot issue books."}, 400)

                c.execute("SELECT COUNT(*) FROM borrows WHERE member_id = ? AND status IN ('Borrowed', 'Overdue')", (member_id,))
                borrowed_count = c.fetchone()[0]
                if borrowed_count >= member["max_books"]:
                    return self.send_json({"error": f"Member has reached the limit of {member['max_books']} active loans."}, 400)

                today = datetime.now().date()
                due_date = today + timedelta(days=days)

                c.execute("""
                    INSERT INTO borrows (book_id, member_id, borrow_date, due_date, status, notes)
                    VALUES (?, ?, ?, ?, 'Borrowed', ?)
                """, (book_id, member_id, today.isoformat(), due_date.isoformat(), notes))

                c.execute("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?", (book_id,))
                conn.commit()
                self.send_json({"message": f"'{book['title']}' successfully issued to {member['name']} until {due_date.isoformat()}!"})

            elif path == "/api/borrows/return":
                borrow_id = int(body.get("borrow_id", 0))
                if not borrow_id:
                    return self.send_json({"error": "borrow_id is required."}, 400)

                c.execute("SELECT * FROM borrows WHERE id = ?", (borrow_id,))
                borrow = c.fetchone()
                if not borrow:
                    return self.send_json({"error": "Loan record not found."}, 404)
                if borrow["status"] == "Returned":
                    return self.send_json({"error": "This book has already been returned."}, 400)

                today = datetime.now().date()
                due_date = datetime.strptime(borrow["due_date"], "%Y-%m-%d").date()
                fine = 0.0
                if today > due_date:
                    days_late = (today - due_date).days
                    fine = round(days_late * 0.50, 2)

                c.execute("""
                    UPDATE borrows
                    SET return_date = ?, status = 'Returned', fine_amount = ?
                    WHERE id = ?
                """, (today.isoformat(), fine, borrow_id))

                c.execute("UPDATE books SET available_copies = available_copies + 1 WHERE id = ?", (borrow["book_id"],))
                conn.commit()
                self.send_json({"message": "Book marked as returned successfully!", "fine": fine})

            elif path == "/api/borrows/renew":
                borrow_id = int(body.get("borrow_id", 0))
                days = int(body.get("days", 14))
                c.execute("SELECT * FROM borrows WHERE id = ?", (borrow_id,))
                borrow = c.fetchone()
                if not borrow or borrow["status"] == "Returned":
                    return self.send_json({"error": "Cannot renew this record."}, 400)

                current_due = datetime.strptime(borrow["due_date"], "%Y-%m-%d").date()
                new_due = current_due + timedelta(days=days)
                new_status = "Borrowed" if new_due >= datetime.now().date() else "Overdue"

                c.execute("UPDATE borrows SET due_date = ?, status = ? WHERE id = ?", (new_due.isoformat(), new_status, borrow_id))
                conn.commit()
                self.send_json({"message": f"Loan renewed successfully until {new_due.isoformat()}."})

            elif path == "/api/borrows/pay-fine":
                borrow_id = int(body.get("borrow_id", 0))
                c.execute("UPDATE borrows SET fine_paid = 1 WHERE id = ?", (borrow_id,))
                conn.commit()
                self.send_json({"message": "Fine marked as paid."})

            elif path == "/api/reset-data":
                c.execute("DELETE FROM borrows")
                c.execute("DELETE FROM members")
                c.execute("DELETE FROM books")
                conn.commit()
                conn.close()
                init_db()
                return self.send_json({"message": "Database reset to sample state successfully!"})

            else:
                self.send_json({"error": "Endpoint not found"}, 404)
        except sqlite3.IntegrityError as e:
            self.send_json({"error": f"Database integrity error: {str(e)}"}, 400)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)
        finally:
            if conn:
                conn.close()

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.parse_body()
        conn = get_db()
        c = conn.cursor()

        try:
            if path.startswith("/api/books/"):
                book_id = int(path.split("/")[-1])
                c.execute("""
                    UPDATE books
                    SET title = ?, author = ?, isbn = ?, category = ?, year = ?,
                        total_copies = ?, available_copies = ?, location = ?, description = ?
                    WHERE id = ?
                """, (
                    body.get("title"), body.get("author"), body.get("isbn"), body.get("category"),
                    int(body.get("year", 2024)), int(body.get("total_copies", 1)),
                    int(body.get("available_copies", 1)), body.get("location"),
                    body.get("description"), book_id
                ))
                conn.commit()
                self.send_json({"message": "Book updated successfully!"})

            elif path.startswith("/api/members/"):
                member_id = int(path.split("/")[-1])
                c.execute("""
                    UPDATE members
                    SET name = ?, email = ?, phone = ?, membership_type = ?, status = ?, max_books = ?
                    WHERE id = ?
                """, (
                    body.get("name"), body.get("email"), body.get("phone"),
                    body.get("membership_type"), body.get("status"),
                    int(body.get("max_books", 4)), member_id
                ))
                conn.commit()
                self.send_json({"message": "Member details updated successfully!"})
            else:
                self.send_json({"error": "Endpoint not found"}, 404)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)
        finally:
            conn.close()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        conn = get_db()
        c = conn.cursor()

        try:
            if path.startswith("/api/books/"):
                book_id = int(path.split("/")[-1])
                # Check if actively borrowed
                c.execute("SELECT COUNT(*) FROM borrows WHERE book_id = ? AND status IN ('Borrowed', 'Overdue')", (book_id,))
                if c.fetchone()[0] > 0:
                    return self.send_json({"error": "Cannot delete a book that is currently checked out."}, 400)
                c.execute("DELETE FROM books WHERE id = ?", (book_id,))
                conn.commit()
                self.send_json({"message": "Book removed successfully."})

            elif path.startswith("/api/members/"):
                member_id = int(path.split("/")[-1])
                c.execute("SELECT COUNT(*) FROM borrows WHERE member_id = ? AND status IN ('Borrowed', 'Overdue')", (member_id,))
                if c.fetchone()[0] > 0:
                    return self.send_json({"error": "Cannot delete a member with active borrowed books."}, 400)
                c.execute("DELETE FROM members WHERE id = ?", (member_id,))
                conn.commit()
                self.send_json({"message": "Member removed successfully."})
            else:
                self.send_json({"error": "Endpoint not found"}, 404)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)
        finally:
            conn.close()

def run():
    init_db()
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), LibraryRequestHandler) as httpd:
        print(f"=====================================================")
        print(f"  📚 Alexandria Library Management System is running!")
        print(f"  👉 Open URL: http://localhost:{PORT}")
        print(f"  🗄️ Database: SQLite ({DB_FILE})")
        print(f"  Press Ctrl+C to stop the server.")
        print(f"=====================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
            httpd.server_close()

if __name__ == "__main__":
    run()
