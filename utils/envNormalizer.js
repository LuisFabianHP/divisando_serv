const normalizeEnvValue = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
};

module.exports = {
  normalizeEnvValue,
};
