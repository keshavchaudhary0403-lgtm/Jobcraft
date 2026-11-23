# Jobcraft — AI job search system

A multi-user web app built on the *Get Hired Faster* prompt library. Each user saves their details once.
After that, every prompt is filled in from those details, so nobody has to re-type or re-prompt.

| Section | Prompt | What it does |
|---|---|---|
| My details & resume | — | Master resume (paste or import from PDF), target role, CTC, strongest proof |
| Job applications | 1–5 | One workspace per job: **JD Decoder → Fit Score → Resume Tailor → LinkedIn → Outreach**. All five run in one conversation, like "keep one chat open". The tailored resume is saved per job (copy / print to PDF). Tracks status: saved → applied → interviewing → offer. |
| LinkedIn profile | 4 | Headlines, About section and skills, built from the master resume |
| Interview practice | 6 | Voice mock interview: 6 questions, then a score. Every run starts a fresh session |
| Salary negotiation | 7 | Market check, then a voice role-play with HR |
| Admin · users | — | Create users (phone and/or email + password), reset passwords, pause users |

Built with Next.js 16, Supabase (auth + Postgres with Row Level Security), and Claude (`claude-opus-5-5`).
Voice uses the browser's built-in speech features (Chrome, Edge, Safari), so it adds no extra cost.

## Setup (about 15 minutes)

### 1. Supabase
1. Create a project at supabase.com.
2. **SQL Editor → New query**: paste all of `supabase/schema.sql` and click **Run**.
3. **Authentication → Sign In / Providers**:
   - Turn **off** "Allow new users to sign up" (only you create accounts).
   - Under Email, turn **off** "Confirm email".
4. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key.

### 2. Make yourself the admin
1. **Authentication → Users → Add user → Create new user**: enter your email and a password, and tick *Auto confirm*.
2. In the SQL Editor, run:
   ```sql
   update public.profiles
   set is_admin = true, phone = '919876543210', full_name = 'Your Name'
   where email = 'you@example.com';
   ```
   Write the phone as digits only, with the country code. Phone login also works with just the 10 digits.

### 3. Add other users
**Recommended:** log in and open **Admin · users**. Enter a name, a phone and/or email, and a password, then click Create.
No email or OTP is sent. Give the person their login yourself.

**From the Supabase dashboard instead:** go to Add user, then email + password + auto confirm. Then set their `phone` in the
`profiles` table if they should also be able to log in by phone.
(If you create a user with a phone number only in the dashboard, Supabase's Phone provider must be enabled.
The Admin page avoids this.)

### 4. Run locally
```bash
cp .env.example .env.local   # fill in the 3 Supabase values + ANTHROPIC_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

### 5. Deploy (GitHub + Vercel)
1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → import the repo**.
3. Add the same environment variables from `.env.example` under **Settings → Environment Variables**.
4. Deploy. Voice input needs HTTPS, which Vercel provides.

## How login works
- Users type an **email or phone number** plus a password.
- For a phone number, the server finds the matching account (using the service-role key, server-side only) and signs in.
  No SMS provider or OTP is needed.
- Users can change their own password under *My details*. Admins can reset anyone's password.
- Phone-only users get an internal placeholder email (`<phone>@phone.jobcraft.invalid`). It never receives mail.

## Costs
The app calls Claude with **your** `ANTHROPIC_API_KEY`, so you pay for every user's usage.
To estimate: one full workspace run (prompts 1–5) is a few cents. The resume and JD are prompt-cached between turns, which cuts repeat cost.
To use a cheaper model, set `ANTHROPIC_MODEL` (for example `claude-sonnet-5-5`). You can pause any user from the Admin page.

## Project map
```
supabase/schema.sql            tables, RLS, triggers
src/lib/prompts.ts             the 7 library prompts + "candidate file" system prompt
src/app/api/chat/route.ts      streaming Claude chat (saves every turn)
src/app/api/auth/login         email-or-phone + password login
src/app/api/admin/users        admin: create / reset / pause users
src/app/api/resume/extract     resume PDF → text
src/components/ChatPanel.tsx   chat UI, step buttons, voice
src/app/(app)/…                pages
```
