/** Downloads a generated backend blob. Uses the admin-token fetch bridge if needed. */
export async function downloadBackendFile(path: string, fileName: string): Promise<void> {
  const response = await fetch(path, { credentials: 'omit' });
  if (!response.ok) {
    let details = `HTTP ${response.status}`;
    try { details = (await response.json()).error || details; } catch { /* binary or HTML error */ }
    throw new Error(details);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
