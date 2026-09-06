export async function startVoiceSession() {
  const response = await fetch('/api/voice/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Server error');
  return data;
}

export async function uploadPrescription(file) {
  const formData = new FormData();
  formData.append('prescription', file);

  const response = await fetch('/api/ocr', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to scan image');
  return data;
}