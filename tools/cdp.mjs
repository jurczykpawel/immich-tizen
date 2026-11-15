// Minimal Chrome DevTools client for the app running on the TV.
export async function connect(port, host = process.env.TV_HOST) {
  if (!host) throw new Error('set TV_HOST to the IP address of the TV');
  const [target] = await (await fetch(`http://${host}:${port}/json`)).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d); };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(`${r.result.exceptionDetails.text} ${r.result.exceptionDetails.exception?.description ?? ''}`);
    return r.result?.result?.value;
  };
  const key = (code) => evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { keyCode: ${code}, bubbles: true, cancelable: true })); 'sent'`);
  return { evaluate, key, close: () => ws.close() };
}
