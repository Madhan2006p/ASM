export const sanitizeSubdomainStr = (domainStr) => {
  if (!domainStr) return "";
  let clean = domainStr.trim().toLowerCase().replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
  let parts = clean.split('.');
  
  let changed = true;
  while (changed) {
    changed = false;
    const maxL = Math.floor(parts.length / 2);
    for (let L = 2; L <= maxL; L++) {
      const suf1 = parts.slice(-L);
      const suf2 = parts.slice(-2 * L, -L);
      let match = true;
      for (let i = 0; i < L; i++) {
        if (suf1[i] !== suf2[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        parts = parts.slice(0, -L);
        changed = true;
        break;
      }
    }
  }
  return parts.join('.');
};

export const getRootDomain = (domainStr) => {
  if (!domainStr) return "";
  let clean = domainStr.replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
  const parts = clean.split('.');
  if (parts.length > 2) {
    return parts.slice(-2).join('.');
  }
  return clean;
};

export const combineSubdomainAndRoot = (prefix, root) => {
  if (!root) return "";
  let cleanRoot = root.trim().toLowerCase().replace(/https?:\/\//i, '').split('/')[0].split(':')[0].replace(/^www\./i, '');
  let cleanPrefix = prefix ? prefix.trim().toLowerCase() : "";
  
  if (!cleanPrefix) return cleanRoot;
  
  // Strip any leading/trailing dots from prefix
  cleanPrefix = cleanPrefix.replace(/^\.+|\.+$/g, '');
  
  // If the prefix already ends with the root domain (e.g. prefix = "api.security.com", root = "security.com")
  if (cleanPrefix.endsWith("." + cleanRoot)) {
    return cleanPrefix;
  }
  
  // If the prefix is exactly equal to the root domain
  if (cleanPrefix === cleanRoot) {
    return cleanRoot;
  }
  
  // If the prefix itself has a valid TLD and is a full domain, don't append root (e.g. prefix = "api.shopy.com", root = "shop.com")
  // Check if it ends with standard domain suffixes
  const hasDomainSuffix = /\.(com|org|net|edu|gov|co|io|in|uk|info|biz|me|xyz|us|ca|xyz)(\.[a-z]{2})?$/i.test(cleanPrefix);
  if (hasDomainSuffix) {
    return cleanPrefix;
  }
  
  return `${cleanPrefix}.${cleanRoot}`;
};

export const cleanupLocalStorageDomains = () => {
  // Remove any leftover mock data keys from localStorage
  const mockKeys = ["mockSubdomains", "mockVulnerabilities", "mockOpenPorts", "mockDirectories", "mockTechnologies", "mockEndpoints"];
  mockKeys.forEach(key => {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  });
};
