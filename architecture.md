# GPSP 2.0 Architecture

Frontend and backend are separated.

GitHub Pages hosts only public static application code. The API URL is public by nature, but sensitive operations and identity checks must be enforced server-side.

Recommended production hardening:
1. Add verified authentication for supervisor/student.
2. Restrict write endpoints by role.
3. Never trust studentId supplied by browser for authorization.
4. Keep OpenAI API key in Apps Script Script Properties.
5. Keep Drive uploads and AI review behind authenticated server endpoints.
6. Add CORS/proxy strategy if browser-origin restrictions appear.
