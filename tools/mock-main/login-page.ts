import { demoOrigins, demoUsers } from './demo-users';

export function safeReturnTo(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return !url.username && !url.password && demoOrigins.includes(url.origin) ? url.href : null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
}

export function loginPage(returnTo: string) {
  const users = demoUsers
    .map(
      (user) =>
        `<button name="userId" value="${user.id}">${escapeHtml(user.name)} (${user.plan})</button>`,
    )
    .join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Planner demo login</title>
<style>body{font:16px system-ui;background:#f7faf8;color:#183b35;max-width:440px;margin:12vh auto;padding:24px}button{display:block;width:100%;margin:12px 0;padding:16px;background:#176f62;color:white;border:0;border-radius:12px;font:inherit;cursor:pointer}p{line-height:1.6}</style>
<h1>Meal planner demo</h1><p>This local login simulates the Vetify account service. Choose an account to open the planner.</p><form action="/login" method="post"><input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}">${users}</form><p>No real account or password is used.</p></html>`;
}
