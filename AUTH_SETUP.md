# UniNote Authentication Setup Guide

## Overview

This guide will help you set up the role-based authentication system for UniNote.

## Prerequisites

- Supabase account and project created
- Node.js and npm installed
- Project dependencies installed (`npm install`)

## Step 1: Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/schema.sql`
4. Execute the SQL script in your Supabase project

This will create:

- User profiles table with role support
- Groups and group members tables
- Posts table with approval workflow
- Comments and likes tables
- Row Level Security (RLS) policies
- Necessary triggers and functions

## Step 2: Environment Variables

1. Copy `.env.local.example` to `.env.local`:

   ```bash
   copy .env.local.example .env.local
   ```

2. Get your Supabase credentials:

   - Go to Project Settings → API in your Supabase dashboard
   - Copy the Project URL
   - Copy the `anon` public key

3. Update `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Step 3: Assign First Universal Admin

After creating your first user account:

1. Go to Supabase Dashboard → Table Editor → profiles
2. Find your user record
3. Update the `user_role` field to `universal_admin`

Alternatively, run this SQL query (replace with your email):

```sql
UPDATE profiles
SET user_role = 'universal_admin'
WHERE email = 'your-admin@email.com';
```

## Step 4: Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application!

## User Roles

### User (Default)

- Can create posts (requires approval)
- Can join groups
- Can comment and like approved posts
- Can view their own pending/rejected posts

### Group Admin

- All user permissions
- Can approve/reject posts in their groups
- Can manage group members
- Can update group settings

### Universal Admin

- All permissions
- Can approve/reject all public posts
- Access to admin dashboard
- Can view system statistics

## Features

### Authentication

- ✅ Email/password signup and login
- ✅ Password reset functionality
- ✅ Email verification (if enabled in Supabase)
- ✅ Session persistence
- ✅ Protected routes

### Post Management

- ✅ Create public posts (pending approval)
- ✅ Create group posts (pending group admin approval)
- ✅ View approved posts
- ✅ Edit/delete own posts

### Admin Features

- ✅ Admin dashboard with statistics
- ✅ Pending posts review interface
- ✅ Approve/reject posts with reasons
- ✅ Search and filter posts

### UI/UX

- ✅ Premium design with shadcn/ui components
- ✅ Dark mode support
- ✅ Responsive layout
- ✅ Role-based navigation
- ✅ User profile display with role badges

## Security Notes

⚠️ **IMPORTANT**: Never commit your `.env.local` file to version control!

The `.gitignore` file already includes:

```
.env
.env*.local
```

This ensures your Supabase credentials are never pushed to GitHub.

## Troubleshooting

### "Missing Supabase environment variables" error

- Make sure `.env.local` exists and contains valid credentials
- Restart the development server after adding environment variables

### Can't log in

- Check that the database schema was executed successfully
- Verify your Supabase project is active
- Check browser console for specific error messages

### Posts not appearing

- Ensure posts are approved (check approval_status in database)
- Verify RLS policies are enabled
- Check that you're logged in

### Admin features not showing

- Confirm your user has `universal_admin` role in the database
- Clear browser cache and reload

## Next Steps

1. Customize the UI to match your branding
2. Add email templates in Supabase for password reset
3. Configure email verification settings
4. Set up group creation functionality
5. Implement group admin assignment
6. Add post editing and deletion features
7. Create user profile pages

## Support

If you encounter issues:

1. Check the browser console for errors
2. Review Supabase logs in the dashboard
3. Verify database schema is correctly set up
4. Ensure environment variables are correct
