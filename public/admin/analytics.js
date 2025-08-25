document.getElementById('save-token').addEventListener('click', () => {
  const token = document.getElementById('admin-token').value.trim();
  if (!token) return;
  sessionStorage.setItem('admin_token', token);
  document.getElementById('token-status').textContent = 'Logged in (token saved in session)';
});

document.getElementById('logout').addEventListener('click', () => {
  sessionStorage.removeItem('admin_token');
  document.getElementById('admin-token').value = '';
  document.getElementById('token-status').textContent = 'Not logged in';
  document.getElementById('status').textContent = 'Logged out';
  document.querySelector('#events-table tbody').innerHTML = '';
});

document.getElementById('login-cookie').addEventListener('click', async () => {
  const secret = document.getElementById('admin-token').value.trim();
  if (!secret) { document.getElementById('status').textContent = 'Enter admin secret first'; return; }
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
      credentials: 'include'
    });
    if (res.status === 204) {
      document.getElementById('status').textContent = 'Logged in with cookie (HttpOnly)';
      // set sessionStorage flag so UI knows it's logged in
      sessionStorage.setItem('admin_token', 'cookie');
      document.getElementById('token-status').textContent = 'Logged in (cookie)';
    } else if (res.status === 401) {
      document.getElementById('status').textContent = 'Invalid admin secret';
    } else if (res.status === 403) {
      document.getElementById('status').textContent = 'Admin login not enabled on server';
    } else {
      const j = await res.json().catch(()=>({}));
      document.getElementById('status').textContent = 'Cookie login failed: ' + (j.error || res.statusText);
    }
  } catch (e) {
    document.getElementById('status').textContent = 'Cookie login error: ' + e.message;
  }
});

document.getElementById('load').addEventListener('click', async () => {
  const token = sessionStorage.getItem('admin_token') || '';
  const limit = Number(document.getElementById('limit').value) || 100;
  const status = document.getElementById('status');
  const tbody = document.querySelector('#events-table tbody');
  tbody.innerHTML = '';
  status.textContent = 'Loading...';
  try {
    const tokenIsCookie = token === 'cookie';
    if (!token) {
      status.textContent = 'Please provide an admin token and click Save token or use Login (cookie)';
      return;
    }
    const fetchOpts = tokenIsCookie ? { credentials: 'include' } : { headers: { Authorization: 'Bearer ' + token } };
    const res = await fetch(`/api/admin/analytics?limit=${limit}`, fetchOpts);
    if (!res.ok) {
      if (res.status === 401) {
        status.textContent = 'Unauthorized - check your admin secret or re-login';
      } else if (res.status === 403) {
        status.textContent = 'Admin analytics not enabled on server';
      } else {
        const err = await res.json().catch(()=>({error:'unknown'}));
        status.textContent = 'Error: ' + (err.error || res.statusText);
      }
      return;
    }
    const json = await res.json();
    status.textContent = `Loaded ${json.count} events (source=${json.source})`;
    const events = json.events || [];
    for (const e of events) {
      const tr = document.createElement('tr');
      const ts = document.createElement('td'); ts.textContent = e.timestamp || '';
      const ip = document.createElement('td'); ip.textContent = e.ip || '';
      const ua = document.createElement('td'); ua.textContent = e.ua || '';
      const path = document.createElement('td'); path.textContent = e.path || '';
      const ev = document.createElement('td'); ev.textContent = e.event || '';
      const data = document.createElement('td'); data.textContent = JSON.stringify(e.data || '');
      tr.appendChild(ts); tr.appendChild(ip); tr.appendChild(ua); tr.appendChild(path); tr.appendChild(ev); tr.appendChild(data);
      tbody.appendChild(tr);
    }
  } catch (err) {
    status.textContent = 'Fetch error';
  }
});

document.getElementById('clear-cache').addEventListener('click', () => {
  document.querySelector('#events-table tbody').innerHTML = '';
  document.getElementById('status').textContent = 'Cleared';
});

// CSV export button
document.getElementById('export-csv').addEventListener('click', async () => {
  const token = sessionStorage.getItem('admin_token') || '';
  if (!token) { document.getElementById('status').textContent = 'No token saved'; return; }
  const limit = Number(document.getElementById('limit').value) || 1000;
  const url = `/api/admin/analytics.csv?limit=${limit}`;
  try {
  const tokenIsCookie = token === 'cookie';
  const res = tokenIsCookie ? await fetch(url, { credentials: 'include' }) : await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) {
      document.getElementById('status').textContent = 'CSV export failed';
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'analytics.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    document.getElementById('status').textContent = 'CSV downloaded';
  } catch (err) {
    document.getElementById('status').textContent = 'CSV fetch error';
  }
});

// RSS export button
document.getElementById('export-rss').addEventListener('click', async () => {
  const token = sessionStorage.getItem('admin_token') || '';
  if (!token) { document.getElementById('status').textContent = 'No token saved'; return; }
  const limit = Number(document.getElementById('limit').value) || 100;
  const url = `/api/admin/analytics.rss?limit=${limit}`;
  try {
  const tokenIsCookie = token === 'cookie';
  const res = tokenIsCookie ? await fetch(url, { credentials: 'include' }) : await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) {
      document.getElementById('status').textContent = 'RSS export failed';
      return;
    }
    const text = await res.text();
    const blob = new Blob([text], { type: 'application/rss+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'analytics.rss';
    document.body.appendChild(a);
    a.click();
    a.remove();
    document.getElementById('status').textContent = 'RSS downloaded';
  } catch (err) {
    document.getElementById('status').textContent = 'RSS fetch error';
  }
});

// Server-side streaming export
document.getElementById('server-export').addEventListener('click', async () => {
  const token = sessionStorage.getItem('admin_token') || '';
  if (!token) { document.getElementById('status').textContent = 'No token saved'; return; }
  const tokenIsCookie = token === 'cookie';
  const limit = 50000; // large export
  const url = `/api/admin/analytics.csv?limit=${limit}`;
  document.getElementById('status').textContent = 'Starting server export...';
  try {
    const res = tokenIsCookie ? await fetch(url, { credentials: 'include' }) : await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) { document.getElementById('status').textContent = 'Server export failed'; return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'analytics-stream.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    document.getElementById('status').textContent = 'Server export downloaded';
  } catch (err) {
    document.getElementById('status').textContent = 'Server export error';
  }
});

// JSON cursor export (NDJSON) - fetch pages until cursor is null or safety limit reached
document.getElementById('json-export').addEventListener('click', async () => {
  const token = sessionStorage.getItem('admin_token') || '';
  if (!token) { document.getElementById('status').textContent = 'No token saved'; return; }
  const tokenIsCookie = token === 'cookie';
  const pageLimit = 2000; // server side limit per request
  let cursor = null;
  const outChunks = [];
  let total = 0;
  const safetyMax = 100000; // avoid browser OOM
  document.getElementById('status').textContent = 'Starting JSON cursor export...';
  try {
    while (true) {
      const url = `/api/admin/analytics/export?limit=${pageLimit}` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
      const res = tokenIsCookie ? await fetch(url, { credentials: 'include' }) : await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) { document.getElementById('status').textContent = 'Export request failed'; return; }
      const json = await res.json();
      const items = json.events || [];
      for (const it of items) {
        outChunks.push(JSON.stringify(it));
      }
      total += items.length;
      document.getElementById('status').textContent = `Exported ${total} events...`;
      if (!json.cursor) break;
      cursor = json.cursor;
      if (total >= safetyMax) { document.getElementById('status').textContent = `Reached safety limit ${safetyMax}`; break; }
    }
    // download NDJSON
    const blob = new Blob([outChunks.join('\n')], { type: 'application/x-ndjson' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'analytics.ndjson'; document.body.appendChild(a); a.click(); a.remove();
    document.getElementById('status').textContent = `Export complete: ${total} events`;
  } catch (e) {
    document.getElementById('status').textContent = 'Export error';
  }
});

// Initialize token status on load
document.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('admin_token');

  // Check if user is authenticated
  if (!token) {
    // Redirect to login page if no token
    document.getElementById('status').textContent = 'Not authenticated. Redirecting to login...';
    setTimeout(() => {
      window.location.href = '/admin/login.html';
    }, 2000);
    return;
  }

  if (token) document.getElementById('token-status').textContent = 'Logged in (token saved in session)';
  // Clear visible token input on load to avoid shoulder-surfing
  const input = document.getElementById('admin-token');
  if (input) input.value = '';
  // Populate curl examples for convenience
  const curlEl = document.getElementById('curl-examples');
  if (curlEl) {
    const site = window.location.origin;
    const curlText = `# Download CSV with Bearer token (replace TOKEN):\ncurl -H "Authorization: Bearer TOKEN" "${site}/api/admin/analytics.csv?limit=1000" -o analytics.csv\n\n# Download CSV using nginx Basic Auth + Bearer token (replace USER and TOKEN):\ncurl -u USER: -H "Authorization: Bearer TOKEN" "${site}/api/admin/analytics.csv?limit=1000" -o analytics.csv\n\n# Download CSV using cookie-based login (first POST secret to /api/admin/login):\n# 1) curl -X POST -H \"Content-Type: application/json\" -d '{"secret":"YOUR_ADMIN_SECRET"}' -c cookies.txt "${site}/api/admin/login"\n# 2) curl -b cookies.txt "${site}/api/admin/analytics.csv?limit=1000" -o analytics.csv`;
    curlEl.textContent = curlText;
  }
});
