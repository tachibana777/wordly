# Admin dashboard

1. Run `db/003_admin.sql` in Neon SQL Editor, or run the existing migration script against the intended database.
2. Register your own account and verify its email and ID in the `users` table. Email ownership is not verified by the app, so confirm this is the account you created before granting access.
3. Grant access to that specific account using SQL (replace the UUID):

```sql
UPDATE users SET is_admin = true WHERE id = 'your-account-uuid';
```

4. Deploy the updated code and sign in, then open `/admin` on your deployment domain.

Revoke access with `UPDATE users SET is_admin = false WHERE id = 'your-account-uuid';`.
No environment variable or client-side role controls access. The page and feedback update API check the database role on every request. Password hashes and session tokens are never selected for the dashboard.

The dashboard shows total accounts, learners and practice attempts in the last seven days, pending feedback, paginated account and feedback lists, email/status filters, and per-account vocabulary/category and sentence difficulty summaries. Feedback can be marked new, in progress, or done.

Learning events begin after this migration and deployment. They record submitted word ratings and sentence answer checks, not page views, session duration, or historical localStorage. Repeated attempts count separately. Scores are client-reported practice results, not verified examination results. Self-assessments without scores are excluded from the average. Dates display in Asia/Bangkok.

Learning progress remains in each browser; this feature does not add cross-device progress synchronization. Failed event uploads show a message and are not retried or backfilled. Inform testers that account-linked exercise results are now available to the administrator.

Before production, test with a normal account (admin denied), an admin account, a submitted feedback item, and a word/sentence attempt. Run `npm run typecheck`, `npm test`, `npm run build`, and the database-backed `npm run test:browser` locally.
