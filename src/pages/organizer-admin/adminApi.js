const API = import.meta.env.VITE_API_URL || '';

export async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    const fieldErrors = body?.error?.details?.fieldErrors;
    const validationMessage =
      fieldErrors && Object.values(fieldErrors).flat().find(Boolean);
    const error = new Error(
      validationMessage ||
        body?.error?.message ||
        (response.status === 429
          ? 'Too many attempts. Please wait before trying again.'
          : 'Request failed.'),
    );
    error.code = body?.error?.code;
    error.status = response.status;
    throw error;
  }
  return body.data;
}
