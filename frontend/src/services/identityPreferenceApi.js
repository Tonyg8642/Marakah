const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export async function fetchIdentityPreference(identifier) {
  const normalized = String(identifier || "").trim();
  if (!normalized) {
    return null;
  }

  try {
    const params = new URLSearchParams({ identifier: normalized });
    const response = await fetch(
      `${API_BASE_URL}/api/preferences/identity?${params.toString()}`,
    );
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      return null;
    }

    return payload.identityPreference || null;
  } catch {
    return null;
  }
}

export async function saveIdentityPreference(identifier, identityPreference) {
  const normalized = String(identifier || "").trim();
  if (!normalized) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/preferences/identity`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: normalized,
        identityPreference,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      return null;
    }

    return payload.identityPreference || null;
  } catch {
    return null;
  }
}
