const tableNameCache = new Map();

const isMissingTableError = (error) => {
  const message = (error?.message || '').toLowerCase();
  return (
    message.includes('could not find the table') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  );
};

export const resolveTableName = async (client, cacheKey, candidates) => {
  if (tableNameCache.has(cacheKey)) {
    return tableNameCache.get(cacheKey);
  }

  let lastError = null;

  for (const candidate of candidates) {
    const { error } = await client.from(candidate).select('id').limit(1);

    if (!error) {
      tableNameCache.set(cacheKey, candidate);
      return candidate;
    }

    if (!isMissingTableError(error)) {
      throw new Error(`Failed resolving table "${cacheKey}" via "${candidate}": ${error.message}`);
    }

    lastError = error;
  }

  throw new Error(
    `Unable to resolve table "${cacheKey}". Tried: ${candidates.join(', ')}. Last error: ${
      lastError?.message || 'unknown'
    }`
  );
};
