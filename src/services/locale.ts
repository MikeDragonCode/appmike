// Region of the phone's language setting ("US" for en-US, "PT" for pt-PT), if it has one.
export function deviceRegion(): string | undefined {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    return /[-_]([A-Za-z]{2})(?:$|[-_])/.exec(tag)?.[1].toUpperCase();
  } catch {
    return undefined;
  }
}
