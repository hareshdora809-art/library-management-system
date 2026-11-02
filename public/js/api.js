/**
 * Alexandria Library Management System - API Client
 * Seamlessly connects to Python/SQLite backend with automatic LocalStorage fallback
 */

const API = (function() {
    let isServerAvailable = false;
    const STORAGE_KEY_BOOKS = 'alexandria_books';
    const STORAGE_KEY_MEMBERS = 'alexandria_members';
    const STORAGE_KEY_BORROWS = 'alexandria_borrows';

    // Initialize local storage if empty
    function initLocalStorage() {
        if (!localStorage.getItem(STORAGE_KEY_BOOKS)) {
            localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(window.SAMPLE_DATA ? window.SAMPLE_DATA.books : []));
        }
        if (!localStorage.getItem(STORAGE_KEY_MEMBERS)) {
            localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(window.SAMPLE_DATA ? window.SAMPLE_DATA.members : []));
        }
        if (!localStorage.getItem(STORAGE_KEY_BORROWS)) {
            localStorage.setItem(STORAGE_KEY_BORROWS, JSON.stringify(window.SAMPLE_DATA ? window.SAMPLE_DATA.borrows : []));
        }
    }

    async function checkServer() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);
            const res = await fetch('/api/status', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                isServerAvailable = true;
                return true;
            }
        } catch (e) {
            isServerAvailable = false;
        }
        initLocalStorage();
        return false;
    }

    // Helper for LocalStorage operations
    function getLocal(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch {
            return [];
        }
    }

    function setLocal(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    }

    // Update overdue in LocalStorage
    function refreshLocalOverdue() {
        const borrows = getLocal(STORAGE_KEY_BORROWS);
        const today = new Date().toISOString().split('T')[0];
        let updated = false;

        borrows.forEach(b => {
            if (b.status === 'Borrowed' && b.due_date < today) {
                b.status = 'Overdue';
                const due = new Date(b.due_date);
                const cur = new Date(today);
                const diffDays = Math.max(0, Math.ceil((cur - due) / (1000 * 60 * 60 * 24)));
                b.fine_amount = parseFloat((diffDays * 0.50).toFixed(2));
                updated = true;
            }
        });

        if (updated) setLocal(STORAGE_KEY_BORROWS, borrows);
    }

    return {
        async init() {
            await checkServer();
            return isServerAvailable;
        },

        isOnline() {
            return isServerAvailable;
        },

        // Dashboard statistics
        async getDashboard() {
            if (isServerAvailable) {
                const res = await fetch('/api/dashboard');
                return await res.json();
            }

            refreshLocalOverdue();
            const books = getLocal(STORAGE_KEY_BOOKS);
            const members = getLocal(STORAGE_KEY_MEMBERS);
            const borrows = getLocal(STORAGE_KEY_BORROWS);

            const total_titles = books.length;
            const total_copies = books.reduce((sum, b) => sum + (parseInt(b.total_copies) || 1), 0);
            const available_copies = books.reduce((sum, b) => sum + (parseInt(b.available_copies) || 0), 0);
            const active_members = members.filter(m => m.status === 'Active').length;
            const currently_borrowed = borrows.filter(b => b.status === 'Borrowed').length;
            const overdue = borrows.filter(b => b.status === 'Overdue');
            const overdue_count = overdue.length;
            const total_fines = overdue.reduce((sum, b) => sum + (parseFloat(b.fine_amount) || 0), 0);

            // Category breakdown
            const catMap = {};
            books.forEach(b => {
                const cat = b.category || 'General';
                if (!catMap[cat]) catMap[cat] = { category: cat, book_count: 0, copy_count: 0 };
                catMap[cat].book_count++;
                catMap[cat].copy_count += (parseInt(b.total_copies) || 1);
            });
            const categories = Object.values(catMap).sort((a, b) => b.book_count - a.book_count);

            // Recent activity
            const recent_activity = borrows.slice(-6).reverse().map(b => {
                const bk = books.find(x => x.id === b.book_id) || { title: 'Unknown Book' };
                const m = members.find(x => x.id === b.member_id) || { name: 'Unknown Member' };
                return {
                    id: b.id,
                    borrow_date: b.borrow_date,
                    due_date: b.due_date,
                    return_date: b.return_date,
                    status: b.status,
                    fine_amount: b.fine_amount,
                    book_title: bk.title,
                    member_name: m.name
                };
            });

            return {
                total_titles,
                total_copies,
                available_copies,
                active_members,
                currently_borrowed,
                overdue_count,
                total_fines: parseFloat(total_fines.toFixed(2)),
                categories,
                recent_activity
            };
        },

        // Books
        async getBooks(search = '', category = '') {
            if (isServerAvailable) {
                const q = new URLSearchParams();
                if (search) q.append('search', search);
                if (category) q.append('category', category);
                const res = await fetch(`/api/books?${q.toString()}`);
                return await res.json();
            }

            let books = getLocal(STORAGE_KEY_BOOKS);
            if (search) {
                const s = search.toLowerCase();
                books = books.filter(b => 
                    b.title.toLowerCase().includes(s) || 
                    b.author.toLowerCase().includes(s) || 
                    b.isbn.toLowerCase().includes(s)
                );
            }
            if (category && category !== 'All') {
                books = books.filter(b => b.category === category);
            }
            return books;
        },

        async addBook(bookData) {
            if (isServerAvailable) {
                const res = await fetch('/api/books', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookData)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to add book');
                return data;
            }

            const books = getLocal(STORAGE_KEY_BOOKS);
            const newId = books.length ? Math.max(...books.map(b => b.id)) + 1 : 1;
            const newBook = {
                id: newId,
                title: bookData.title,
                author: bookData.author,
                isbn: bookData.isbn,
                category: bookData.category || 'General',
                year: parseInt(bookData.year) || new Date().getFullYear(),
                total_copies: parseInt(bookData.total_copies) || 1,
                available_copies: parseInt(bookData.total_copies) || 1,
                location: bookData.location || 'Shelf A-1',
                description: bookData.description || '',
                cover_color: bookData.cover_color || 'from-indigo-600 to-blue-700'
            };
            books.unshift(newBook);
            setLocal(STORAGE_KEY_BOOKS, books);
            return { message: 'Book added successfully!', id: newId };
        },

        async updateBook(id, bookData) {
            if (isServerAvailable) {
                const res = await fetch(`/api/books/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookData)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to update book');
                return data;
            }

            const books = getLocal(STORAGE_KEY_BOOKS);
            const idx = books.findIndex(b => b.id === parseInt(id));
            if (idx === -1) throw new Error('Book not found');
            books[idx] = { ...books[idx], ...bookData };
            setLocal(STORAGE_KEY_BOOKS, books);
            return { message: 'Book updated successfully!' };
        },

        async deleteBook(id) {
            if (isServerAvailable) {
                const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to delete book');
                return data;
            }

            const borrows = getLocal(STORAGE_KEY_BORROWS);
            const active = borrows.some(b => b.book_id === parseInt(id) && ['Borrowed', 'Overdue'].includes(b.status));
            if (active) throw new Error('Cannot delete a book that is currently checked out.');

            let books = getLocal(STORAGE_KEY_BOOKS);
            books = books.filter(b => b.id !== parseInt(id));
            setLocal(STORAGE_KEY_BOOKS, books);
            return { message: 'Book deleted successfully!' };
        },

        // Members
        async getMembers(search = '') {
            if (isServerAvailable) {
                const q = search ? `?search=${encodeURIComponent(search)}` : '';
                const res = await fetch(`/api/members${q}`);
                return await res.json();
            }

            let members = getLocal(STORAGE_KEY_MEMBERS);
            const borrows = getLocal(STORAGE_KEY_BORROWS);

            if (search) {
                const s = search.toLowerCase();
                members = members.filter(m => 
                    m.name.toLowerCase().includes(s) || 
                    m.email.toLowerCase().includes(s) || 
                    (m.phone && m.phone.toLowerCase().includes(s))
                );
            }

            return members.map(m => {
                const currentBorrows = borrows.filter(b => b.member_id === m.id && ['Borrowed', 'Overdue'].includes(b.status));
                const pendingFines = borrows
                    .filter(b => b.member_id === m.id && !b.fine_paid)
                    .reduce((sum, b) => sum + (parseFloat(b.fine_amount) || 0), 0);
                return {
                    ...m,
                    current_borrowed_count: currentBorrows.length,
                    pending_fines: parseFloat(pendingFines.toFixed(2))
                };
            });
        },

        async addMember(memberData) {
            if (isServerAvailable) {
                const res = await fetch('/api/members', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(memberData)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to register member');
                return data;
            }

            const members = getLocal(STORAGE_KEY_MEMBERS);
            const newId = members.length ? Math.max(...members.map(m => m.id)) + 1 : 1;
            const newMember = {
                id: newId,
                name: memberData.name,
                email: memberData.email,
                phone: memberData.phone || '',
                membership_type: memberData.membership_type || 'Student',
                status: 'Active',
                join_date: new Date().toISOString().split('T')[0],
                max_books: parseInt(memberData.max_books) || 4
            };
            members.unshift(newMember);
            setLocal(STORAGE_KEY_MEMBERS, members);
            return { message: 'Member registered successfully!', id: newId };
        },

        async deleteMember(id) {
            if (isServerAvailable) {
                const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to delete member');
                return data;
            }

            const borrows = getLocal(STORAGE_KEY_BORROWS);
            const active = borrows.some(b => b.member_id === parseInt(id) && ['Borrowed', 'Overdue'].includes(b.status));
            if (active) throw new Error('Cannot delete a member with active borrowed books.');

            let members = getLocal(STORAGE_KEY_MEMBERS);
            members = members.filter(m => m.id !== parseInt(id));
            setLocal(STORAGE_KEY_MEMBERS, members);
            return { message: 'Member removed successfully.' };
        },

        // Borrows & Circulation
        async getBorrows(status = '') {
            if (isServerAvailable) {
                const q = status ? `?status=${encodeURIComponent(status)}` : '';
                const res = await fetch(`/api/borrows${q}`);
                return await res.json();
            }

            refreshLocalOverdue();
            let borrows = getLocal(STORAGE_KEY_BORROWS);
            const books = getLocal(STORAGE_KEY_BOOKS);
            const members = getLocal(STORAGE_KEY_MEMBERS);

            if (status && status !== 'All') {
                borrows = borrows.filter(b => b.status === status);
            }

            return borrows.map(b => {
                const bk = books.find(x => x.id === b.book_id) || {};
                const m = members.find(x => x.id === b.member_id) || {};
                return {
                    ...b,
                    book_title: bk.title || 'Unknown Title',
                    book_author: bk.author || 'Unknown Author',
                    book_isbn: bk.isbn || 'N/A',
                    member_name: m.name || 'Unknown Member',
                    member_email: m.email || 'N/A'
                };
            }).reverse();
        },

        async issueBook(bookId, memberId, days = 14, notes = '') {
            if (isServerAvailable) {
                const res = await fetch('/api/borrows/issue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ book_id: bookId, member_id: memberId, days, notes })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to issue book');
                return data;
            }

            const books = getLocal(STORAGE_KEY_BOOKS);
            const members = getLocal(STORAGE_KEY_MEMBERS);
            const borrows = getLocal(STORAGE_KEY_BORROWS);

            const book = books.find(b => b.id === parseInt(bookId));
            if (!book || book.available_copies <= 0) throw new Error('Book is not available for issue.');

            const member = members.find(m => m.id === parseInt(memberId));
            if (!member) throw new Error('Member not found.');
            if (member.status !== 'Active') throw new Error(`Member is currently ${member.status}.`);

            const activeBorrows = borrows.filter(b => b.member_id === member.id && ['Borrowed', 'Overdue'].includes(b.status));
            if (activeBorrows.length >= (member.max_books || 4)) {
                throw new Error(`Member has reached borrowing limit of ${member.max_books || 4} books.`);
            }

            const today = new Date();
            const dueDate = new Date();
            dueDate.setDate(today.getDate() + parseInt(days));

            const newId = borrows.length ? Math.max(...borrows.map(b => b.id)) + 1 : 1;
            const newBorrow = {
                id: newId,
                book_id: book.id,
                member_id: member.id,
                borrow_date: today.toISOString().split('T')[0],
                due_date: dueDate.toISOString().split('T')[0],
                return_date: null,
                status: 'Borrowed',
                fine_amount: 0.0,
                fine_paid: 0,
                notes: notes
            };

            book.available_copies--;
            borrows.unshift(newBorrow);

            setLocal(STORAGE_KEY_BOOKS, books);
            setLocal(STORAGE_KEY_BORROWS, borrows);
            return { message: `'${book.title}' successfully issued to ${member.name}!` };
        },

        async returnBook(borrowId) {
            if (isServerAvailable) {
                const res = await fetch('/api/borrows/return', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ borrow_id: borrowId })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to return book');
                return data;
            }

            const books = getLocal(STORAGE_KEY_BOOKS);
            const borrows = getLocal(STORAGE_KEY_BORROWS);

            const record = borrows.find(b => b.id === parseInt(borrowId));
            if (!record) throw new Error('Borrow record not found.');
            if (record.status === 'Returned') throw new Error('Book already returned.');

            const today = new Date().toISOString().split('T')[0];
            let fine = 0.0;
            if (today > record.due_date) {
                const due = new Date(record.due_date);
                const cur = new Date(today);
                const diffDays = Math.ceil((cur - due) / (1000 * 60 * 60 * 24));
                fine = parseFloat((diffDays * 0.50).toFixed(2));
            }

            record.return_date = today;
            record.status = 'Returned';
            record.fine_amount = fine;

            const book = books.find(b => b.id === record.book_id);
            if (book) book.available_copies = Math.min(book.total_copies, (book.available_copies || 0) + 1);

            setLocal(STORAGE_KEY_BOOKS, books);
            setLocal(STORAGE_KEY_BORROWS, borrows);
            return { message: 'Book returned successfully!', fine };
        },

        async renewBook(borrowId, days = 14) {
            if (isServerAvailable) {
                const res = await fetch('/api/borrows/renew', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ borrow_id: borrowId, days })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to renew loan');
                return data;
            }

            const borrows = getLocal(STORAGE_KEY_BORROWS);
            const record = borrows.find(b => b.id === parseInt(borrowId));
            if (!record || record.status === 'Returned') throw new Error('Cannot renew this loan.');

            const currentDue = new Date(record.due_date);
            currentDue.setDate(currentDue.getDate() + parseInt(days));
            record.due_date = currentDue.toISOString().split('T')[0];
            record.status = currentDue >= new Date() ? 'Borrowed' : 'Overdue';

            setLocal(STORAGE_KEY_BORROWS, borrows);
            return { message: `Loan extended until ${record.due_date}!` };
        },

        async payFine(borrowId) {
            if (isServerAvailable) {
                const res = await fetch('/api/borrows/pay-fine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ borrow_id: borrowId })
                });
                return await res.json();
            }

            const borrows = getLocal(STORAGE_KEY_BORROWS);
            const record = borrows.find(b => b.id === parseInt(borrowId));
            if (record) {
                record.fine_paid = 1;
                setLocal(STORAGE_KEY_BORROWS, borrows);
            }
            return { message: 'Fine settled.' };
        },

        async resetDatabase() {
            if (isServerAvailable) {
                const res = await fetch('/api/reset-data', { method: 'POST' });
                return await res.json();
            }
            localStorage.removeItem(STORAGE_KEY_BOOKS);
            localStorage.removeItem(STORAGE_KEY_MEMBERS);
            localStorage.removeItem(STORAGE_KEY_BORROWS);
            initLocalStorage();
            return { message: 'Sample data restored!' };
        }
    };
})();
