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
  // 1. mockSubdomains
  const storedSubs = localStorage.getItem("mockSubdomains");
  if (storedSubs) {
    try {
      const list = JSON.parse(storedSubs);
      let updated = false;
      const cleaned = list.map(item => {
        const cleanDom = sanitizeSubdomainStr(item.domain);
        if (cleanDom !== item.domain) {
          updated = true;
          return { ...item, domain: cleanDom };
        }
        return item;
      });
      if (updated) localStorage.setItem("mockSubdomains", JSON.stringify(cleaned));
    } catch (e) { console.error(e); }
  }

  // 2. mockVulnerabilities
  const storedVulns = localStorage.getItem("mockVulnerabilities");
  if (storedVulns) {
    try {
      const list = JSON.parse(storedVulns);
      let updated = false;
      const cleaned = list.map(item => {
        const cleanSub = sanitizeSubdomainStr(item.subdomain);
        const cleanDom = sanitizeSubdomainStr(item.domain);
        if (cleanSub !== item.subdomain || cleanDom !== item.domain) {
          updated = true;
          return { ...item, subdomain: cleanSub, domain: cleanDom };
        }
        return item;
      });
      if (updated) localStorage.setItem("mockVulnerabilities", JSON.stringify(cleaned));
    } catch (e) { console.error(e); }
  }

  // 3. mockOpenPorts
  const storedPorts = localStorage.getItem("mockOpenPorts");
  if (storedPorts) {
    try {
      const list = JSON.parse(storedPorts);
      let updated = false;
      const cleaned = list.map(item => {
        const cleanDom = sanitizeSubdomainStr(item.domain);
        if (cleanDom !== item.domain) {
          updated = true;
          return { ...item, domain: cleanDom };
        }
        return item;
      });
      if (updated) localStorage.setItem("mockOpenPorts", JSON.stringify(cleaned));
    } catch (e) { console.error(e); }
  }

  // 4. mockDirectories
  const storedDirs = localStorage.getItem("mockDirectories");
  if (storedDirs) {
    try {
      const list = JSON.parse(storedDirs);
      let updated = false;
      const cleaned = list.map(item => {
        const cleanSub = sanitizeSubdomainStr(item.subdomain_name);
        const cleanUrl = item.url ? item.url.replace(item.subdomain_name, cleanSub) : item.url;
        if (cleanSub !== item.subdomain_name || cleanUrl !== item.url) {
          updated = true;
          return { ...item, subdomain_name: cleanSub, url: cleanUrl };
        }
        return item;
      });
      if (updated) localStorage.setItem("mockDirectories", JSON.stringify(cleaned));
    } catch (e) { console.error(e); }
  }

  // 5. mockTechnologies
  const storedTechs = localStorage.getItem("mockTechnologies");
  if (storedTechs) {
    try {
      const list = JSON.parse(storedTechs);
      let updated = false;
      const cleaned = list.map(item => {
        const cleanDom = sanitizeSubdomainStr(item.domain);
        if (cleanDom !== item.domain) {
          updated = true;
          return { ...item, domain: cleanDom };
        }
        return item;
      });
      if (updated) localStorage.setItem("mockTechnologies", JSON.stringify(cleaned));
    } catch (e) { console.error(e); }
  }

  // 6. mockEndpoints
  const storedEndpoints = localStorage.getItem("mockEndpoints");
  if (storedEndpoints) {
    try {
      const list = JSON.parse(storedEndpoints);
      let updated = false;
      const cleaned = list.map(item => {
        const cleanSub = sanitizeSubdomainStr(item.subdomain_name);
        const cleanUrl = item.http_url ? item.http_url.replace(item.subdomain_name, cleanSub) : item.http_url;
        if (cleanSub !== item.subdomain_name || cleanUrl !== item.http_url) {
          updated = true;
          return { ...item, subdomain_name: cleanSub, http_url: cleanUrl };
        }
        return item;
      });
      if (updated) localStorage.setItem("mockEndpoints", JSON.stringify(cleaned));
    } catch (e) { console.error(e); }
  }
};
