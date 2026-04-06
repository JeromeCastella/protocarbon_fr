# Test Credentials

## Main Test Account
- Email: `newtest@x.com`
- Password: `test123`
- Role: admin

## Auth Method
- HTTP-only cookies (not localStorage)
- Login route: `/auth` (not `/login`)
- Cookie name: `access_token`
- Cookie flags: HttpOnly, Secure, SameSite=Lax
