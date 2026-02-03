# Expenses - Personal Finance Tracker

A beautiful, minimalist expense tracking application with Apple-inspired design. Built with Next.js 16 and Supabase.

## ✨ Features

- **Expense Tracking**: Add, edit, and delete expenses with custom categories
- **Recurring Expenses**: Set up monthly recurring expenses (rent, subscriptions, etc.)
- **Dashboard**: 6-month spending trends with category breakdown
- **Category Management**: Create custom categories with color coding
- **Filtering**: Filter expenses by category and month
- **Authentication**: Secure login with email/password and password reset
- **User Data**: Each user has their own isolated expense data

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 with custom Apple-inspired design
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Cloudflare Pages (free)

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

## 🌐 Deploy to Cloudflare Pages (Free)

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

**Quick steps:**
1. Push your code to GitHub
2. Connect your repo to Cloudflare Pages
3. Add environment variables (Supabase URL and key)
4. Deploy!

Your app will be live at `https://your-project.pages.dev`

## 📁 Project Structure

```
├── app/
│   ├── (auth)/                 # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── app/                    # Main application (protected)
│   │   └── page.tsx            # Expense tracker dashboard
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── supabase/              # Supabase client setup
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   └── middleware.ts      # Auth middleware
│   └── constants.ts           # App constants
├── supabase/
│   └── migrations/            # Database migrations
└── middleware.ts              # Next.js middleware
```

## 🎨 Design System

Minimalist design inspired by Apple, Airbnb, and BCG/McKinsey dashboards:

- **Colors**: Zinc gray scale with vibrant category colors
- **Typography**: System fonts with careful hierarchy
- **Spacing**: Generous whitespace and padding
- **Components**: Rounded corners (12-16px), subtle borders
- **Interactions**: Smooth transitions, hover states

## 🗄️ Database Schema

Three main tables with Row Level Security:

- **`categories`**: User categories (default + custom) with colors
- **`expenses`**: Individual expense entries with category and date
- **`recurring_expenses`**: Monthly recurring expenses (rent, subscriptions)

All data is isolated per user with RLS policies.

## License

MIT
