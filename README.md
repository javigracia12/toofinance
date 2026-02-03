# FinanzasApp - Personal Finance Manager

A beautiful, Apple-inspired personal finance application built with Next.js 14 and Supabase. Track your expenses, manage your net worth, and gain insights into your financial health.

## Features

### Expense Tracking
- Add, edit, and delete expenses with categories
- Group expenses by date with daily totals
- Search and filter by category
- Visual analytics with pie charts and bar charts
- Monthly spending trends

### Net Worth Management
- **Cash Accounts**: Track multiple bank accounts with balance history
- **Assets**: Manage your assets (real estate, vehicles, investments, etc.) with purchase/current value tracking
- **Debts**: Track loans and debts with payoff progress visualization

### Monthly Reconciliation
- Track monthly income from multiple sources
- Compare tracked expenses vs. calculated real spending
- Monthly snapshots for historical tracking
- Visual charts showing income/expense evolution

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Apple-inspired design system
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase account

### 1. Clone and Install

```bash
cd toolfinanzas
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your URL and anon key
3. Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Open **SQL Editor**
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the SQL to create tables (categories, expenses, recurring_expenses) and RLS policies

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── (auth)/                 # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/            # Protected dashboard pages
│   │   ├── page.tsx            # Main dashboard
│   │   ├── expenses/           # Expense tracking
│   │   │   ├── page.tsx
│   │   │   └── analytics/
│   │   ├── net-worth/          # Net worth management
│   │   │   ├── page.tsx
│   │   │   ├── cash/
│   │   │   ├── assets/
│   │   │   └── debts/
│   │   └── monthly/            # Monthly reconciliation
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── layout/                 # Layout components
│   ├── charts/                 # Chart components
│   └── forms/                  # Form components
├── lib/
│   ├── supabase/              # Supabase client setup
│   ├── types/                 # TypeScript types
│   └── utils.ts               # Utility functions
└── supabase/
    └── migrations/            # Database migrations
```

## Design System

The app uses a custom design system inspired by Apple's design language:

### Colors
- **Primary**: Deep Ocean Blue (#0A84FF) - Trust and stability
- **Success**: Mint Green (#30D158) - Income and gains
- **Danger**: Coral Red (#FF453A) - Expenses and losses
- **Warning**: Amber (#FF9F0A) - Alerts

### Components
- Large touch targets (44px minimum)
- Generous whitespace
- Card-based layouts with rounded corners (16-24px border-radius)
- Subtle shadows and glass-morphism effects
- Smooth 300ms transitions

## Database Schema

The app uses the following main tables:

- `categories` - Expense categories with icons and colors
- `expenses` - Individual expense entries
- `cash_accounts` - Bank/cash accounts
- `cash_balances` - Historical balance snapshots
- `assets` - Assets with purchase and current values
- `debts` - Debts with payoff tracking
- `income_entries` - Income records
- `monthly_snapshots` - Monthly financial summaries

All tables are protected with Row Level Security (RLS) policies.

## License

MIT
