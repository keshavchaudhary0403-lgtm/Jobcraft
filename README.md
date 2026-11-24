# Jobcraft — AI job search system

A multi-user web app built on the *Get Hired Faster* prompt library. Each user saves their details once.
After that, every prompt is filled in from those details, so nobody has to re-type or re-prompt.

**How it works for a user**
1. **Drop a resume.** AI fills in the profile, and the user reviews and confirms it.
2. **Paste a job description**, with the listing link if they have one. The company, role, location and type are read from the JD.
3. **Match.** An honest fit score, the skills they want, ATS keywords, gaps marked as *missing* or *not on resume*, and questions that sharpen the score.
4. **Resume.** A tailored, ATS-safe resume for that job, with prompts for real numbers and PDF download. Nothing is invented.
5. **Outreach.** A LinkedIn connection note and message, with character and word limits checked.
6. **Practice.** A voice mock interview and a salary negotiation role-play.
7. **LinkedIn.** Headlines, an About section and skills to pin.
8. **Admin.** Users, the AI model, and monthly ₹ spend limits.

The method from the *Get Hired Faster* prompt library runs in the backend (`src/lib/tasks.ts`, `src/lib/prompts.ts`). Users never see prompts.

Built with Next.js 16, Supabase (auth + Postgres with Row Level Security), and the OpenAI API or Anthropic's Claude API (default model `gpt-6.1-terra`; the admin switches between ChatGPT and Claude in Admin → AI & spending). Realistic voice calls always use OpenAI.
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
cp .env.example .env.local   # fill in the 3 Supabase values + OPENAI_API_KEY (+ ANTHROPIC_API_KEY for Claude)
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

## AI costs and spend limits
All AI calls use **your** `OPENAI_API_KEY`. Every call is logged in `usage_events` with its tokens and cost.
Limits are set in **Admin · users & AI**, in ₹, and reset on the 1st of each month (India time):
- **Default limit per user.** Applies to every user without their own limit, including users added later. The starting value is ₹100.
- **Per-user limit.** Overrides the default for one person. Set 0 to block that person's AI use, or leave it blank to use the default.
- **Total budget.** A cap for all users combined, to protect your OpenAI credits. The starting value is ₹1,000.

When a user reaches a limit, their AI features pause, with a clear message, until the next month. The check runs before each AI call, so a single reply can go slightly past the limit.

The ₹ figures use a **live USD→INR rate** (open.er-api.com, with ECB rates via Frankfurter as backup), refreshed every 6 hours. Admins can switch to a fixed rate.

Measured with GPT-6.1 Terra: resume import + match + tailored resume + outreach + LinkedIn cost about **₹1.50** in total. GPT-6 Luna is about 10× cheaper.
Prices are set in `src/lib/models.ts`. Update them there if OpenAI or Anthropic changes its prices.

**Existing projects:** run `supabase/002_usage_limits.sql`, `003_live_fx.sql` and `004_structured.sql` once in the SQL Editor. (`schema.sql` already includes it.)

## Project map
```
supabase/schema.sql            tables, RLS, triggers
src/lib/prompts.ts             the 7 library prompts + "candidate file" system prompt
src/app/api/chat/route.ts      streaming AI chat (saves every turn, logs cost, enforces limits)
src/lib/ai.ts · models.ts      OpenAI client, model prices, spend limits
src/app/api/auth/login         email-or-phone + password login
src/app/api/admin/users        admin: create / reset / pause users
src/app/api/resume/extract     resume PDF → text
src/components/ChatPanel.tsx   chat UI, step buttons, voice
src/app/(app)/…                pages
```
