// Sample initial data for fallback or browser-only demonstration
window.SAMPLE_DATA = {
    books: [
        {
            id: 1,
            title: "Clean Code",
            author: "Robert C. Martin",
            isbn: "978-0132350884",
            category: "Technology",
            year: 2008,
            total_copies: 5,
            available_copies: 4,
            location: "Shelf T-101",
            description: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
            cover_color: "from-cyan-600 to-blue-700"
        },
        {
            id: 2,
            title: "The Pragmatic Programmer",
            author: "Andrew Hunt, David Thomas",
            isbn: "978-0135957059",
            category: "Technology",
            year: 2019,
            total_copies: 4,
            available_copies: 3,
            location: "Shelf T-102",
            description: "The Pragmatic Programmer cuts through the increasing specialization and technicalities of modern software development.",
            cover_color: "from-emerald-600 to-teal-700"
        },
        {
            id: 3,
            title: "To Kill a Mockingbird",
            author: "Harper Lee",
            isbn: "978-0061120084",
            category: "Fiction",
            year: 1960,
            total_copies: 6,
            available_copies: 5,
            location: "Shelf F-201",
            description: "The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it.",
            cover_color: "from-amber-600 to-orange-700"
        },
        {
            id: 4,
            title: "1984",
            author: "George Orwell",
            isbn: "978-0451524935",
            category: "Fiction",
            year: 1949,
            total_copies: 8,
            available_copies: 6,
            location: "Shelf F-202",
            description: "Winston Smith toes the Party line, rewriting history to satisfy the Ministry of Truth. With every lie, the Party tightens its grip.",
            cover_color: "from-rose-600 to-red-800"
        },
        {
            id: 5,
            title: "Sapiens: A Brief History of Humankind",
            author: "Yuval Noah Harari",
            isbn: "978-0062316097",
            category: "History",
            year: 2014,
            total_copies: 5,
            available_copies: 4,
            location: "Shelf H-301",
            description: "One hundred thousand years ago, at least six different species of humans inhabited Earth. Yet today there is only one: Homo sapiens.",
            cover_color: "from-indigo-600 to-purple-800"
        },
        {
            id: 6,
            title: "A Brief History of Time",
            author: "Stephen Hawking",
            isbn: "978-0553380163",
            category: "Science",
            year: 1988,
            total_copies: 4,
            available_copies: 2,
            location: "Shelf S-401",
            description: "Was there a beginning of time? Could time run backwards? The cosmic masterpiece by Stephen Hawking.",
            cover_color: "from-violet-600 to-indigo-900"
        },
        {
            id: 7,
            title: "Designing Data-Intensive Applications",
            author: "Martin Kleppmann",
            isbn: "978-1449373320",
            category: "Technology",
            year: 2017,
            total_copies: 3,
            available_copies: 2,
            location: "Shelf T-103",
            description: "Data is at the center of many challenges in system design today. Difficult issues need to be figured out, such as scalability, consistency, and reliability.",
            cover_color: "from-blue-600 to-indigo-800"
        },
        {
            id: 8,
            title: "The Great Gatsby",
            author: "F. Scott Fitzgerald",
            isbn: "978-0743273565",
            category: "Fiction",
            year: 1925,
            total_copies: 5,
            available_copies: 5,
            location: "Shelf F-203",
            description: "The exemplary novel of the Jazz Age, telling the tragic story of Jay Gatsby and his obsessive love for Daisy Buchanan.",
            cover_color: "from-yellow-600 to-amber-800"
        },
        {
            id: 9,
            title: "Thinking, Fast and Slow",
            author: "Daniel Kahneman",
            isbn: "978-0374533557",
            category: "Psychology",
            year: 2011,
            total_copies: 4,
            available_copies: 4,
            location: "Shelf P-501",
            description: "Kahneman takes us on a groundbreaking tour of the mind and explains the two systems that drive the way we think.",
            cover_color: "from-teal-600 to-emerald-800"
        },
        {
            id: 10,
            title: "Atomic Habits",
            author: "James Clear",
            isbn: "978-0735211292",
            category: "Self-Help",
            year: 2018,
            total_copies: 7,
            available_copies: 5,
            location: "Shelf S-601",
            description: "No matter your goals, Atomic Habits offers a proven framework for improving every day.",
            cover_color: "from-red-600 to-orange-600"
        }
    ],
    members: [
        {
            id: 1,
            name: "Alice Johnson",
            email: "alice.johnson@campus.edu",
            phone: "+1-555-0101",
            membership_type: "Student",
            status: "Active",
            join_date: "2024-01-15",
            max_books: 4
        },
        {
            id: 2,
            name: "Marcus Vance",
            email: "marcus.v@campus.edu",
            phone: "+1-555-0102",
            membership_type: "Faculty",
            status: "Active",
            join_date: "2023-09-10",
            max_books: 8
        },
        {
            id: 3,
            name: "Elena Rostova",
            email: "elena.r@campus.edu",
            phone: "+1-555-0103",
            membership_type: "Student",
            status: "Active",
            join_date: "2024-02-20",
            max_books: 4
        },
        {
            id: 4,
            name: "David Kim",
            email: "david.kim@outlook.com",
            phone: "+1-555-0104",
            membership_type: "Community",
            status: "Active",
            join_date: "2024-03-01",
            max_books: 3
        },
        {
            id: 5,
            name: "Sophia Chen",
            email: "sophia.chen@campus.edu",
            phone: "+1-555-0105",
            membership_type: "Student",
            status: "Active",
            join_date: "2023-11-12",
            max_books: 4
        }
    ],
    borrows: [
        {
            id: 1,
            book_id: 1,
            member_id: 1,
            borrow_date: "2026-10-20",
            due_date: "2026-11-03",
            return_date: null,
            status: "Borrowed",
            fine_amount: 0.0,
            fine_paid: 0,
            notes: "Reference for semester coursework"
        },
        {
            id: 2,
            book_id: 2,
            member_id: 2,
            borrow_date: "2026-10-05",
            due_date: "2026-10-19",
            return_date: null,
            status: "Overdue",
            fine_amount: 5.50,
            fine_paid: 0,
            notes: "Faculty extended study"
        },
        {
            id: 3,
            book_id: 6,
            member_id: 3,
            borrow_date: "2026-10-25",
            due_date: "2026-11-08",
            return_date: null,
            status: "Borrowed",
            fine_amount: 0.0,
            fine_paid: 0,
            notes: "Physics seminar"
        },
        {
            id: 4,
            book_id: 7,
            member_id: 5,
            borrow_date: "2026-10-12",
            due_date: "2026-10-26",
            return_date: null,
            status: "Overdue",
            fine_amount: 2.00,
            fine_paid: 0,
            notes: "Distributed systems lab"
        },
        {
            id: 5,
            book_id: 10,
            member_id: 4,
            borrow_date: "2026-10-01",
            due_date: "2026-10-15",
            return_date: "2026-10-14",
            status: "Returned",
            fine_amount: 0.0,
            fine_paid: 1,
            notes: "Returned on time"
        }
    ]
};
