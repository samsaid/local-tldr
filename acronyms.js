// ── Your personal acronym dictionary ──────────────────────────────────────────
// Keys are matched as whole words, case-sensitively.
// Add, edit, or remove any entry — this is your dictionary.

const ACRONYM_DICTIONARY = {
  // Meta
  "TLDR":   "Too Long; Didn't Read — a short summary of a longer text",
  "IIRC":   "If I Recall Correctly",
  "AFAIK":  "As Far As I Know",
  "IMO":    "In My Opinion",
  "IMHO":   "In My Humble Opinion",
  "FYI":    "For Your Information",
  "ETA":    "Estimated Time of Arrival",
  "ASAP":   "As Soon As Possible",
  "AKA":    "Also Known As",
  "TBD":    "To Be Determined",
  "WIP":    "Work In Progress",
  "EOD":    "End of Day",

  // Web & Frontend
  "HTML":   "HyperText Markup Language",
  "CSS":    "Cascading Style Sheets",
  "JS":     "JavaScript",
  "TS":     "TypeScript",
  "DOM":    "Document Object Model",
  "URL":    "Uniform Resource Locator",
  "URI":    "Uniform Resource Identifier",
  "HTTP":   "HyperText Transfer Protocol",
  "HTTPS":  "HyperText Transfer Protocol Secure",
  "JSON":   "JavaScript Object Notation",
  "XML":    "Extensible Markup Language",
  "REST":   "Representational State Transfer",
  "GraphQL":"Graph Query Language",

  // Dev & Infra
  "API":    "Application Programming Interface",
  "SDK":    "Software Development Kit",
  "IDE":    "Integrated Development Environment",
  "CLI":    "Command Line Interface",
  "CI":     "Continuous Integration",
  "CD":     "Continuous Deployment",
  "PR":     "Pull Request",
  "DB":     "Database",
  "SQL":    "Structured Query Language",
  "NoSQL":  "Non-relational Database",
  "ORM":    "Object Relational Mapper",
  "MVC":    "Model View Controller",
  "SPA":    "Single Page Application",
  "SSR":    "Server-Side Rendering",
  "CDN":    "Content Delivery Network",
  "DNS":    "Domain Name System",
  "TLS":    "Transport Layer Security",
  "SSO":    "Single Sign-On",
  "MFA":    "Multi-Factor Authentication",
  "RBAC":   "Role-Based Access Control",

  // Reliability & Ops
  "SLA":    "Service Level Agreement",
  "SLO":    "Service Level Objective",
  "SLI":    "Service Level Indicator",
  "MTTR":   "Mean Time To Recovery",
  "MTTD":   "Mean Time To Detection",
  "RCA":    "Root Cause Analysis",
  "IaC":    "Infrastructure as Code",
  "K8s":    "Kubernetes",

  // Product & Business
  "MVP":    "Minimum Viable Product",
  "UI":     "User Interface",
  "UX":     "User Experience",
  "A/B":    "A/B Testing",
  "KPI":    "Key Performance Indicator",
  "OKR":    "Objectives and Key Results",
  "ROI":    "Return on Investment",
  "QA":     "Quality Assurance",
  "B2B":    "Business to Business",
  "B2C":    "Business to Consumer",
  "PMO":    "Project Management Office",
  "SME":    "Subject Matter Expert",
  "POC":    "Proof of Concept",
  "RFC":    "Request for Comments",
};

/**
 * Scan text for acronyms present in the dictionary.
 * Returns matches sorted by first appearance in the text.
 */
function findAcronyms(text, dictionary = ACRONYM_DICTIONARY) {
  const found = [];
  const seen  = new Set();

  for (const [term, definition] of Object.entries(dictionary)) {
    const regex = new RegExp(`\\b${escapeRegex(term)}\\b`);
    if (!seen.has(term) && regex.test(text)) {
      seen.add(term);
      found.push({ term, definition, pos: text.indexOf(term) });
    }
  }

  return found.sort((a, b) => a.pos - b.pos);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
