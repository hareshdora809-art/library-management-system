/**
 * Alexandria Library Management System - Core App Logic
 */

(function () {
    // Current application state
    const state = {
        currentTab: 'dashboard',
        books: [],
        members: [],
        borrows: [],
        activeBorrowFilter: 'All',
        isOnline: false
    };

    // Category Color Palettes for Progress Bars
    const categoryColors = {
        Technology: 'bg-blue-500',
        Fiction: 'bg-amber-500',
        History: 'bg-purple-500',
        Science: 'bg-teal-500',
        Psychology: 'bg-emerald-500',
        'Self-Help': 'bg-rose-500',
        Business: 'bg-indigo-500',
        General: 'bg-slate-400'
    };

    // Member Avatar Color map
    const avatarGradients = [
        'from-blue-500 to-indigo-600',
        'from-purple-500 to-pink-600',
        'from-emerald-500 to-teal-600',
        'from-amber-500 to-orange-600',
        'from-rose-500 to-red-600',
        'from-cyan-500 to-blue-600'
    ];

    // Initialize application
    async function init() {
        setupTheme();
        setupNavigation();
        setupEventListeners();
        setupModals();

        // Initialize API and check backend
        state.isOnline = await API.init();
        updateBackendStatusBadge();

        await refreshAllData();
    }

    // Refresh all state from API
    async function refreshAllData() {
        try {
            state.books = await API.getBooks();
            state.members = await API.getMembers();
            state.borrows = await API.getBorrows();

            // Update badge counts in sidebar
            const bookBadge = document.getElementById('navBookBadge');
            if (bookBadge) bookBadge.textContent = state.books.length;

            const overdueCount = state.borrows.filter(b => b.status === 'Overdue').length;
            const overdueBadge = document.getElementById('navOverdueBadge');
            if (overdueBadge) {
                overdueBadge.textContent = overdueCount;
                overdueBadge.style.display = overdueCount > 0 ? 'inline-block' : 'none';
            }

            renderCurrentView();
        } catch (err) {
            showToast(err.message || 'Error loading library data', 'error');
        }
    }

    function renderCurrentView() {
        switch (state.currentTab) {
            case 'dashboard':
                renderDashboard();
                break;
            case 'books':
                renderBooks();
                break;
            case 'circulation':
                renderCirculation();
                break;
            case 'members':
                renderMembers();
                break;
            case 'overdue':
                renderOverdue();
                break;
        }
    }

    // 1. DASHBOARD RENDERING
    async function renderDashboard() {
        const stats = await API.getDashboard();

        document.getElementById('statTotalBooks').textContent = stats.total_titles;
        document.getElementById('statTotalCopies').textContent = `${stats.total_copies} total copies`;
        document.getElementById('statAvailableCopies').textContent = `${stats.available_copies} available in racks`;
        document.getElementById('statActiveMembers').textContent = stats.active_members;
        document.getElementById('statCurrentlyBorrowed').textContent = stats.currently_borrowed;
        document.getElementById('statOverdueCount').textContent = stats.overdue_count;
        document.getElementById('statTotalFines').textContent = `$${stats.total_fines.toFixed(2)} total penalty`;

        // Render Category Progress Bars
        const catContainer = document.getElementById('categoryBarsContainer');
        if (catContainer) {
            catContainer.innerHTML = '';
            const maxCopies = Math.max(...stats.categories.map(c => c.copy_count), 1);
            stats.categories.slice(0, 6).forEach(cat => {
                const pct = Math.round((cat.copy_count / maxCopies) * 100);
                const colorClass = categoryColors[cat.category] || categoryColors.General;
                const row = document.createElement('div');
                row.className = 'space-y-1.5';
                row.innerHTML = `
                    <div class="flex justify-between text-xs font-semibold">
                        <span class="text-slate-700 dark:text-slate-200">${cat.category}</span>
                        <span class="text-slate-400">${cat.copy_count} copies (${cat.book_count} titles)</span>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div class="${colorClass} h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                `;
                catContainer.appendChild(row);
            });
        }

        // Render Recent Activity Table
        const activityBody = document.getElementById('dashboardActivityTable');
        if (activityBody) {
            activityBody.innerHTML = '';
            if (!stats.recent_activity || stats.recent_activity.length === 0) {
                activityBody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-400">No circulation history yet.</td></tr>`;
            } else {
                stats.recent_activity.forEach(item => {
                    const statusBadge = getStatusBadge(item.status);
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors';
                    tr.innerHTML = `
                        <td class="py-3 font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(item.book_title)}</td>
                        <td class="py-3 text-slate-600 dark:text-slate-400">${escapeHtml(item.member_name)}</td>
                        <td class="py-3 text-slate-500 text-xs">${item.due_date}</td>
                        <td class="py-3">${statusBadge}</td>
                    `;
                    activityBody.appendChild(tr);
                });
            }
        }
    }

    // 2. BOOKS RENDERING
    function renderBooks() {
        const grid = document.getElementById('booksGrid');
        if (!grid) return;

        const searchVal = (document.getElementById('bookSearchInput')?.value || '').toLowerCase().trim();
        const catVal = document.getElementById('bookCategorySelect')?.value || '';

        let filtered = state.books.filter(b => {
            const matchesSearch = !searchVal ||
                b.title.toLowerCase().includes(searchVal) ||
                b.author.toLowerCase().includes(searchVal) ||
                b.isbn.toLowerCase().includes(searchVal);
            const matchesCat = !catVal || b.category === catVal;
            return matchesSearch && matchesCat;
        });

        grid.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <p class="text-slate-400 text-sm">No books found matching your criteria.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(book => {
            const isAvailable = (book.available_copies || 0) > 0;
            const coverColor = book.cover_color || 'from-indigo-600 to-blue-700';

            const card = document.createElement('div');
            card.className = 'book-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-sm flex flex-col justify-between';
            card.innerHTML = `
                <div>
                    <!-- Visual Book Cover Spine Header -->
                    <div class="h-32 bg-gradient-to-r ${coverColor} p-4 flex flex-col justify-between text-white relative book-cover overflow-hidden">
                        <div class="flex items-start justify-between z-10">
                            <span class="text-[10px] font-bold uppercase tracking-wider bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded">${escapeHtml(book.category)}</span>
                            <span class="text-[11px] font-mono opacity-80">${book.year || ''}</span>
                        </div>
                        <div class="z-10 pr-2">
                            <h4 class="font-extrabold text-base leading-snug line-clamp-2 drop-shadow-sm">${escapeHtml(book.title)}</h4>
                            <p class="text-xs text-white/90 font-medium truncate mt-0.5">${escapeHtml(book.author)}</p>
                        </div>
                    </div>

                    <!-- Book Details Body -->
                    <div class="p-5 space-y-3">
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            ${escapeHtml(book.description || 'No description provided for this catalog volume.')}
                        </p>

                        <div class="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                            <div class="flex items-center space-x-1.5 text-slate-500">
                                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                                <span>${escapeHtml(book.location || 'Shelf A-1')}</span>
                            </div>
                            <span class="font-mono text-[11px] text-slate-400">${escapeHtml(book.isbn)}</span>
                        </div>

                        <!-- Copies Meter -->
                        <div class="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Availability</span>
                            <span class="text-xs font-bold ${isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}">
                                ${book.available_copies} / ${book.total_copies} Copies
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Action Footer -->
                <div class="px-5 pb-5 pt-1 flex items-center space-x-2">
                    <button class="issue-this-book-btn flex-1 py-2 rounded-xl text-xs font-semibold text-white ${isAvailable ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/30' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'}" 
                            data-book-id="${book.id}" ${isAvailable ? '' : 'disabled'}>
                        ${isAvailable ? 'Issue Book' : 'Out of Stock'}
                    </button>
                    <button class="edit-book-btn p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700" data-book-id="${book.id}" title="Edit book details">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button class="delete-book-btn p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" data-book-id="${book.id}" title="Remove book">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // 3. CIRCULATION RENDERING (Issue / Return)
    function renderCirculation() {
        const tbody = document.getElementById('circulationTableBody');
        if (!tbody) return;

        let filtered = state.borrows;
        if (state.activeBorrowFilter && state.activeBorrowFilter !== 'All') {
            filtered = filtered.filter(b => b.status === state.activeBorrowFilter);
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 text-sm">No circulation records found for this filter.</td></tr>`;
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        filtered.forEach(borrow => {
            const isOverdue = borrow.status === 'Overdue';
            const isBorrowed = borrow.status === 'Borrowed';
            const isReturned = borrow.status === 'Returned';

            // Due calculation indicator
            let dueText = borrow.due_date;
            if (isBorrowed) {
                const due = new Date(borrow.due_date);
                const cur = new Date(today);
                const diffDays = Math.ceil((due - cur) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0) {
                    dueText = `<span class="text-emerald-600 dark:text-emerald-400 font-semibold">Due in ${diffDays} day${diffDays === 1 ? '' : 's'}</span>`;
                }
            } else if (isOverdue) {
                const due = new Date(borrow.due_date);
                const cur = new Date(today);
                const lateDays = Math.max(1, Math.ceil((cur - due) / (1000 * 60 * 60 * 24)));
                dueText = `<span class="text-rose-600 dark:text-rose-400 font-semibold">${lateDays}d overdue ($${borrow.fine_amount.toFixed(2)})</span>`;
            } else if (isReturned) {
                dueText = `<span class="text-slate-400">Returned on ${borrow.return_date || '-'}</span>`;
            }

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800 dark:text-slate-100">${escapeHtml(borrow.book_title)}</div>
                    <div class="text-xs text-slate-400">${escapeHtml(borrow.book_author || '')}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="font-medium text-slate-800 dark:text-slate-200">${escapeHtml(borrow.member_name)}</div>
                    <div class="text-xs text-slate-400">${escapeHtml(borrow.member_email || '')}</div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-500">${borrow.borrow_date}</td>
                <td class="px-6 py-4 text-xs">${dueText}</td>
                <td class="px-6 py-4">${getStatusBadge(borrow.status)}</td>
                <td class="px-6 py-4 text-right space-x-2">
                    ${!isReturned ? `
                        <button class="return-borrow-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm" data-borrow-id="${borrow.id}">
                            Return Book
                        </button>
                        <button class="renew-borrow-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200" data-borrow-id="${borrow.id}" title="Extend due date by 14 days">
                            +14d Renew
                        </button>
                    ` : `
                        <span class="text-xs text-slate-400 font-medium italic">Completed</span>
                    `}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 4. MEMBERS RENDERING
    function renderMembers() {
        const grid = document.getElementById('membersGrid');
        if (!grid) return;

        const searchVal = (document.getElementById('memberSearchInput')?.value || '').toLowerCase().trim();
        let filtered = state.members.filter(m => {
            return !searchVal ||
                m.name.toLowerCase().includes(searchVal) ||
                m.email.toLowerCase().includes(searchVal) ||
                (m.phone && m.phone.toLowerCase().includes(searchVal));
        });

        grid.innerHTML = '';
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <p class="text-slate-400 text-sm">No library members found.</p>
                </div>
            `;
            return;
        }

        filtered.forEach((member, i) => {
            const avatarGrad = avatarGradients[i % avatarGradients.length];
            const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const activeLoans = member.current_borrowed_count || 0;
            const maxAllowed = member.max_books || 4;
            const pendingFines = member.pending_fines || 0;

            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm space-y-4';
            card.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-11 h-11 rounded-xl bg-gradient-to-tr ${avatarGrad} flex items-center justify-center text-white font-black text-sm shadow-sm">
                            ${initials}
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-900 dark:text-white leading-tight">${escapeHtml(member.name)}</h4>
                            <span class="text-xs text-slate-400">${escapeHtml(member.email)}</span>
                        </div>
                    </div>
                    <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${member.membership_type === 'Faculty' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}">
                        ${member.membership_type || 'Student'}
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div class="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span class="text-slate-400 block text-[10px] uppercase font-semibold">Active Loans</span>
                        <span class="font-bold text-slate-700 dark:text-slate-200 text-sm">${activeLoans} / ${maxAllowed} books</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span class="text-slate-400 block text-[10px] uppercase font-semibold">Pending Fines</span>
                        <span class="font-bold ${pendingFines > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} text-sm">
                            $${pendingFines.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div class="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span class="text-[11px] text-slate-400">${member.phone || 'No phone'}</span>
                    <div class="flex items-center space-x-2">
                        <button class="issue-to-member-btn text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 hover:bg-indigo-100" data-member-id="${member.id}">
                            Issue Book
                        </button>
                        <button class="delete-member-btn p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" data-member-id="${member.id}" title="Remove member">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // 5. OVERDUE RENDERING
    function renderOverdue() {
        const tbody = document.getElementById('overdueTableBody');
        const totalFinesEl = document.getElementById('overdueFinesTotal');
        if (!tbody) return;

        const overdueItems = state.borrows.filter(b => b.status === 'Overdue');
        const sumFines = overdueItems.reduce((acc, b) => acc + (parseFloat(b.fine_amount) || 0), 0);
        if (totalFinesEl) totalFinesEl.textContent = `$${sumFines.toFixed(2)}`;

        tbody.innerHTML = '';
        if (overdueItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400 text-sm">🎉 Excellent! No overdue books at this time.</td></tr>`;
            return;
        }

        overdueItems.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800 dark:text-slate-100">${escapeHtml(item.book_title)}</div>
                    <div class="text-xs text-slate-400">ISBN: ${escapeHtml(item.book_isbn || 'N/A')}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="font-medium text-slate-800 dark:text-slate-200">${escapeHtml(item.member_name)}</div>
                    <div class="text-xs text-slate-400">${escapeHtml(item.member_email || '')}</div>
                </td>
                <td class="px-6 py-4 text-xs font-semibold text-rose-600 dark:text-rose-400">${item.due_date}</td>
                <td class="px-6 py-4">
                    <span class="text-xs font-black text-rose-600 dark:text-rose-400">$${item.fine_amount.toFixed(2)}</span>
                </td>
                <td class="px-6 py-4 text-right space-x-2">
                    <button class="return-borrow-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm" data-borrow-id="${item.id}">
                        Collect & Return
                    </button>
                    <button class="renew-borrow-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700" data-borrow-id="${item.id}">
                        Renew (+14d)
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Helper: Status Badges
    function getStatusBadge(status) {
        switch (status) {
            case 'Borrowed':
                return '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold badge-borrowed">Borrowed</span>';
            case 'Overdue':
                return '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold badge-overdue">Overdue</span>';
            case 'Returned':
                return '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold badge-returned">Returned</span>';
            default:
                return `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">${status}</span>`;
        }
    }

    // Navigation and tab switching
    function setupNavigation() {
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                switchTab(tab);
            });
        });

        // Quick Issue / Add Book buttons in header
        document.getElementById('quickIssueBtn')?.addEventListener('click', () => openIssueModal());
        document.getElementById('quickAddBookBtn')?.addEventListener('click', () => openBookModal());
        document.getElementById('addBookModalBtn')?.addEventListener('click', () => openBookModal());
        document.getElementById('addMemberModalBtn')?.addEventListener('click', () => openMemberModal());
        document.getElementById('issueNewCirculationBtn')?.addEventListener('click', () => openIssueModal());

        // Mobile menu toggle
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        mobileBtn?.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
    }

    function switchTab(tabId) {
        state.currentTab = tabId;

        // Update Nav UI
        document.querySelectorAll('.nav-link').forEach(link => {
            const matches = link.getAttribute('data-tab') === tabId;
            if (matches) {
                link.className = 'nav-link flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
            } else {
                link.className = 'nav-link flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white';
            }
        });

        // Hide all views & show current
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.add('hidden');
        });
        const currentView = document.getElementById(`tab-${tabId}`);
        if (currentView) currentView.classList.remove('hidden');

        // Update Header Title
        const titleEl = document.getElementById('viewTitle');
        const subtitleEl = document.getElementById('viewSubtitle');
        const titles = {
            dashboard: ['Library Dashboard', 'Real-time circulation metrics & catalog management'],
            books: ['Book Catalog & Shelf Inventory', 'Search, filter, and organize library titles and physical racks'],
            circulation: ['Circulation Desk', 'Track book issues, returns, renewals, and patron borrowings'],
            members: ['Registered Library Members', 'Manage student, faculty, and community patron records'],
            overdue: ['Overdue & Late Fee Tracking', 'Automated calculations for overdue borrowings and fines']
        };

        if (titles[tabId]) {
            titleEl.textContent = titles[tabId][0];
            subtitleEl.textContent = titles[tabId][1];
        }

        // Close mobile drawer if open
        document.getElementById('sidebar')?.classList.add('-translate-x-full');
        document.getElementById('sidebar')?.classList.add('md:translate-x-0');

        renderCurrentView();
    }

    // Event listeners
    function setupEventListeners() {
        // Search & Category Filters
        document.getElementById('bookSearchInput')?.addEventListener('input', () => renderBooks());
        document.getElementById('bookCategorySelect')?.addEventListener('change', () => renderBooks());
        document.getElementById('memberSearchInput')?.addEventListener('input', () => renderMembers());

        // Borrow Filter Tabs
        document.querySelectorAll('.borrow-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.borrow-filter-btn').forEach(b => {
                    b.className = 'borrow-filter-btn px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';
                });
                btn.className = 'borrow-filter-btn px-4 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm';
                state.activeBorrowFilter = btn.getAttribute('data-filter');
                renderCirculation();
            });
        });

        // Global delegate for dynamic button actions
        document.addEventListener('click', async (e) => {
            // Issue book button on card
            const issueBookBtn = e.target.closest('.issue-this-book-btn');
            if (issueBookBtn) {
                const bookId = issueBookBtn.getAttribute('data-book-id');
                openIssueModal(bookId, null);
                return;
            }

            // Issue to member button on member card
            const issueMemberBtn = e.target.closest('.issue-to-member-btn');
            if (issueMemberBtn) {
                const memberId = issueMemberBtn.getAttribute('data-member-id');
                openIssueModal(null, memberId);
                return;
            }

            // Return book button
            const returnBtn = e.target.closest('.return-borrow-btn');
            if (returnBtn) {
                const borrowId = returnBtn.getAttribute('data-borrow-id');
                try {
                    const res = await API.returnBook(borrowId);
                    showToast(res.message || 'Book returned successfully!', 'success');
                    await refreshAllData();
                } catch (err) {
                    showToast(err.message, 'error');
                }
                return;
            }

            // Renew book button
            const renewBtn = e.target.closest('.renew-borrow-btn');
            if (renewBtn) {
                const borrowId = renewBtn.getAttribute('data-borrow-id');
                try {
                    const res = await API.renewBook(borrowId, 14);
                    showToast(res.message || 'Loan extended by 14 days!', 'success');
                    await refreshAllData();
                } catch (err) {
                    showToast(err.message, 'error');
                }
                return;
            }

            // Delete book button
            const deleteBookBtn = e.target.closest('.delete-book-btn');
            if (deleteBookBtn) {
                const bookId = deleteBookBtn.getAttribute('data-book-id');
                if (confirm('Are you sure you want to remove this book from the catalog?')) {
                    try {
                        const res = await API.deleteBook(bookId);
                        showToast(res.message || 'Book deleted', 'success');
                        await refreshAllData();
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                }
                return;
            }

            // Delete member button
            const deleteMemberBtn = e.target.closest('.delete-member-btn');
            if (deleteMemberBtn) {
                const memberId = deleteMemberBtn.getAttribute('data-member-id');
                if (confirm('Are you sure you want to delete this library member?')) {
                    try {
                        const res = await API.deleteMember(memberId);
                        showToast(res.message || 'Member removed', 'success');
                        await refreshAllData();
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                }
                return;
            }

            // Edit book button
            const editBookBtn = e.target.closest('.edit-book-btn');
            if (editBookBtn) {
                const bookId = editBookBtn.getAttribute('data-book-id');
                const book = state.books.find(b => b.id === parseInt(bookId));
                if (book) openBookModal(book);
                return;
            }
        });

        // Database reset button
        document.getElementById('resetDataBtn')?.addEventListener('click', async () => {
            if (confirm('Reset database to initial sample dataset? Any unsaved edits will be refreshed.')) {
                try {
                    const res = await API.resetDatabase();
                    showToast(res.message || 'Sample data reloaded!', 'success');
                    await refreshAllData();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            }
        });
    }

    // Modals handling
    function setupModals() {
        // Close modal buttons
        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
            });
        });

        // Close modal when clicking backdrop
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        });

        // Book Form Submit
        document.getElementById('bookForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('bookFormId').value;
            const bookData = {
                title: document.getElementById('bookFormTitle').value.trim(),
                author: document.getElementById('bookFormAuthor').value.trim(),
                isbn: document.getElementById('bookFormIsbn').value.trim(),
                category: document.getElementById('bookFormCategory').value,
                year: parseInt(document.getElementById('bookFormYear').value) || 2024,
                total_copies: parseInt(document.getElementById('bookFormCopies').value) || 1,
                location: document.getElementById('bookFormLocation').value.trim(),
                cover_color: document.getElementById('bookFormCover').value,
                description: document.getElementById('bookFormDesc').value.trim()
            };

            try {
                if (id) {
                    await API.updateBook(id, bookData);
                    showToast('Book updated successfully!', 'success');
                } else {
                    await API.addBook(bookData);
                    showToast('New book cataloged!', 'success');
                }
                document.getElementById('bookModal').classList.add('hidden');
                await refreshAllData();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

        // Issue Form Submit
        document.getElementById('issueForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const bookId = document.getElementById('issueFormBook').value;
            const memberId = document.getElementById('issueFormMember').value;
            const duration = document.querySelector('input[name="loanDuration"]:checked')?.value || 14;
            const notes = document.getElementById('issueFormNotes').value.trim();

            try {
                const res = await API.issueBook(bookId, memberId, duration, notes);
                showToast(res.message || 'Book issued successfully!', 'success');
                document.getElementById('issueModal').classList.add('hidden');
                await refreshAllData();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

        // Member Form Submit
        document.getElementById('memberForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const memberData = {
                name: document.getElementById('memberFormName').value.trim(),
                email: document.getElementById('memberFormEmail').value.trim(),
                phone: document.getElementById('memberFormPhone').value.trim(),
                membership_type: document.getElementById('memberFormType').value,
                max_books: document.getElementById('memberFormType').value === 'Faculty' ? 8 : 4
            };

            try {
                await API.addMember(memberData);
                showToast('Member registered successfully!', 'success');
                document.getElementById('memberModal').classList.add('hidden');
                await refreshAllData();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    function openBookModal(existingBook = null) {
        const modal = document.getElementById('bookModal');
        const titleEl = document.getElementById('bookModalTitle');
        const form = document.getElementById('bookForm');
        form.reset();

        if (existingBook) {
            titleEl.textContent = 'Edit Cataloged Book';
            document.getElementById('bookFormId').value = existingBook.id;
            document.getElementById('bookFormTitle').value = existingBook.title;
            document.getElementById('bookFormAuthor').value = existingBook.author;
            document.getElementById('bookFormIsbn').value = existingBook.isbn;
            document.getElementById('bookFormCategory').value = existingBook.category || 'Technology';
            document.getElementById('bookFormYear').value = existingBook.year || 2024;
            document.getElementById('bookFormCopies').value = existingBook.total_copies || 1;
            document.getElementById('bookFormLocation').value = existingBook.location || 'Shelf A-1';
            document.getElementById('bookFormCover').value = existingBook.cover_color || 'from-indigo-600 to-blue-700';
            document.getElementById('bookFormDesc').value = existingBook.description || '';
        } else {
            titleEl.textContent = 'Add New Book to Catalog';
            document.getElementById('bookFormId').value = '';
        }

        modal.classList.remove('hidden');
    }

    function openIssueModal(preselectedBookId = null, preselectedMemberId = null) {
        const modal = document.getElementById('issueModal');
        const bookSelect = document.getElementById('issueFormBook');
        const memberSelect = document.getElementById('issueFormMember');

        bookSelect.innerHTML = '';
        state.books.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = `${b.title} (${b.available_copies} available)`;
            if (b.available_copies <= 0 && b.id !== parseInt(preselectedBookId)) {
                opt.disabled = true;
                opt.textContent += ' - Out of Stock';
            }
            if (preselectedBookId && b.id === parseInt(preselectedBookId)) {
                opt.selected = true;
            }
            bookSelect.appendChild(opt);
        });

        memberSelect.innerHTML = '';
        state.members.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.name} (${m.membership_type || 'Student'}) - ${m.current_borrowed_count || 0}/${m.max_books || 4} loans`;
            if (preselectedMemberId && m.id === parseInt(preselectedMemberId)) {
                opt.selected = true;
            }
            memberSelect.appendChild(opt);
        });

        document.getElementById('issueFormNotes').value = '';
        modal.classList.remove('hidden');
    }

    function openMemberModal() {
        const modal = document.getElementById('memberModal');
        document.getElementById('memberForm').reset();
        modal.classList.remove('hidden');
    }

    // Dark / Light Theme
    function setupTheme() {
        const toggleBtn = document.getElementById('themeToggleBtn');
        const icon = document.getElementById('themeIcon');
        const text = document.getElementById('themeText');
        const html = document.documentElement;

        const savedTheme = localStorage.getItem('alexandria_theme') || 'light';
        applyTheme(savedTheme);

        toggleBtn?.addEventListener('click', () => {
            const current = html.classList.contains('dark') ? 'dark' : 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
        });

        function applyTheme(theme) {
            if (theme === 'dark') {
                html.classList.add('dark');
                if (icon) icon.textContent = '🌙';
                if (text) text.textContent = 'Dark Theme';
            } else {
                html.classList.remove('dark');
                if (icon) icon.textContent = '☀️';
                if (text) text.textContent = 'Light Theme';
            }
            localStorage.setItem('alexandria_theme', theme);
        }
    }

    function updateBackendStatusBadge() {
        const pill = document.getElementById('backendStatusPill');
        const text = document.getElementById('backendStatusText');
        if (!pill || !text) return;

        if (state.isOnline) {
            pill.className = 'flex items-center space-x-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium';
            pill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>SQLite Connected</span>';
        } else {
            pill.className = 'flex items-center space-x-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-medium';
            pill.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>Browser Storage</span>';
        }
    }

    // Toast Notification System
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-item pointer-events-auto flex items-center space-x-3 px-4 py-3 rounded-xl shadow-lg border text-sm max-w-sm transition-all duration-300';

        if (type === 'success') {
            toast.className += ' bg-emerald-50 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800';
            toast.innerHTML = `<svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span class="font-medium">${escapeHtml(message)}</span>`;
        } else if (type === 'error') {
            toast.className += ' bg-rose-50 dark:bg-rose-950/90 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800';
            toast.innerHTML = `<svg class="w-5 h-5 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg><span class="font-medium">${escapeHtml(message)}</span>`;
        } else {
            toast.className += ' bg-slate-900 text-white border-slate-700';
            toast.innerHTML = `<span class="font-medium">${escapeHtml(message)}</span>`;
        }

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // PWA Service Worker & Install Prompt
    let deferredPrompt = null;
    function setupPWA() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.log('SW registration skipped:', err);
                });
            });
        }

        const installBtn = document.getElementById('installAppBtn');
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (installBtn) installBtn.style.display = 'flex';
        });

        installBtn?.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    showToast('Alexandria LMS installed as an App!', 'success');
                }
                deferredPrompt = null;
            } else {
                // If browser doesn't support beforeinstallprompt (e.g. Safari on macOS)
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                if (isMac) {
                    alert('To install on Mac Safari:\n1. Click "File" in the top menu bar.\n2. Choose "Add to Dock..."\n\nTo install on Chrome/Edge:\nClick the Install icon in the address bar.');
                } else {
                    alert('To install this app:\nClick the menu button in your browser and select "Install Alexandria LMS" or "Add to Home Screen".');
                }
            }
        });
    }

    // Start App on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            setupPWA();
        });
    } else {
        init();
        setupPWA();
    }
})();
