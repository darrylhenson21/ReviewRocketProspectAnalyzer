export async function callOpenAI(payload: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Add dev override header if available
  const devKey = localStorage.getItem('dev-openai-key');
  if (devKey) {
    headers['X-OpenAI-Key'] = devKey;
  }

  const r = await fetch('/api/openai', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  
  if (r.status === 401) {
    throw new Error('OPENAI_API_KEY missing — add it in Replit Secrets and reload.');
  }
  
  return r.json();
}