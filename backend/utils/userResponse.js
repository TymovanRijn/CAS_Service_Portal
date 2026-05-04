/** Strip internal fields en expose publieke avatar-URL voor client-JSON. */
function sanitizeUserForClient(row) {
  if (!row) return row;
  const { password_hash, avatar_filename, ...rest } = row;
  const avatar_url = avatar_filename
    ? `/uploads/avatars/${avatar_filename}`
    : null;
  return { ...rest, avatar_url };
}

module.exports = { sanitizeUserForClient };
