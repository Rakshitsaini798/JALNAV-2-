// Formats a raw `curl -i` response for the video: status line, a few headers, pretty JSON.
const SHOW = (process.env.SHOW_HEADERS || 'content-type,set-cookie,retry-after,www-authenticate,access-control-allow-origin')
  .toLowerCase()
  .split(',');
let raw = '';
process.stdin.on('data', (d) => (raw += d)).on('end', () => {
  if (!raw.trim()) {
    console.log('\x1b[1;31mNo response. Is the server running? Start it with: npm start\x1b[0m');
    return;
  }
  const blocks = raw.split(/\r?\n\r?\n/);
  let i = 0;
  while (i < blocks.length - 1 && /^HTTP\/[\d.]+ 1\d\d/.test(blocks[i])) i += 1; // skip 100-continue
  const [statusLine, ...headers] = blocks[i].split(/\r?\n/);
  const body = blocks.slice(i + 1).join('\n\n').trim();
  const code = Number(statusLine.split(' ')[1]);
  const color = code < 300 ? '32' : code < 500 ? '33' : '31';
  console.log(`\x1b[1;${color}m${statusLine}\x1b[0m`);
  headers
    .filter((h) => SHOW.includes('all') || SHOW.includes(h.split(':')[0].toLowerCase()))
    .forEach((h) => console.log(h));
  if (!body || process.env.HIDE_BODY) return;
  try {
    const json = JSON.parse(body);
    if (json.accessToken) json.accessToken = `${json.accessToken.slice(0, 24)}...`;
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log(body);
  }
});
