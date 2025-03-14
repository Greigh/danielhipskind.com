export async function hashPassword(password) {
  try {
    // Convert password string to buffer
    const msgBuffer = new TextEncoder().encode(password);

    // Hash the password using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex;
  } catch (error) {
    console.error('Hashing failed:', error);
    throw new Error('Password hashing failed');
  }
}
