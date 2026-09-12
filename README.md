# CleanExpress Laundry - PWA Management System

CleanExpress Laundry is a modern, responsive, and installable Progressive Web App (PWA) built with Next.js 14 App Router, TypeScript, Tailwind CSS, and Firebase.

## 🚀 Key Modules & Features

1. **Progressive Web App (PWA):** Installable web app with custom Web App Manifest and Service Worker caching.
2. **Authentication & RBAC:** Role-Based Access Control (`admin`, `cashier`, `production`) backed by Firebase Authentication & Firestore.
3. **Inventory Management (`/admin/inventory`):** CRUD operations with real-time **Minimum Stock Alert** (`onSnapshot`).
4. **Services & Packages (`/admin/services`):** Dynamic package pricing per kg or pcs.
5. **Customer Management (`/admin/customers`):** Customer directory with complete transaction history (`order` queries) and auto-updating `totalSpent` & `totalOrders`.
6. **Order Management POS (`/admin/orders`):**
   - Atomic Server Action transactions (`runTransaction`) ensuring inventory decrement and customer stats consistency.
   - Kanban & Table views with real-time status pipeline.
   - WhatsApp Digital Receipt integration.
7. **Expenses & Financial Reports (`/admin/expenses`, `/admin/reports`):**
   - Operational expense logging.
   - Automated Profit & Loss calculation: $\text{Net Profit} = \sum(\text{Income}) - \sum(\text{Expenses})$.
   - Excel Export (.xlsx) using SheetJS (`xlsx`).
8. **Live Dashboard (`/admin/dashboard`):** Real-time operational metrics and stock alerts.

## 🗄️ Data Flow & Architecture

- **Mutations (Writes):** Executed exclusively via Next.js Server Actions (`'use server'`) using Firebase Firestore transactions (`runTransaction`) to guarantee ACID compliance across `orders`, `inventory`, and `customers`.
- **Subscriptions (Reads):** Real-time updates delivered via custom React hook `useFirestoreQuery` leveraging Firestore `onSnapshot`.
- **Security:** Governed by `firestore.rules` enforcing strict role-based access per collection.
