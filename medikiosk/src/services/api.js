export async function startVoiceSession() {
  const response = await fetch('/api/voice/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Server error');
  return data;
}

export async function sendVoiceChatMessage(sessionId, messages, language = 'en') {
  const response = await fetch('/api/voice/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      messages: messages,
      language: language,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Voice turn failed');
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