/**
 * Supplier matching utilities for invoice processing.
 * Matches extracted supplier names to database suppliers.
 */

/**
 * Normalize a supplier name for robust matching.
 * Removes punctuation, collapses whitespace, converts to lowercase.
 */
export function normalizeSupplierName(name) {
  if (!name) return "";
  
  let normalized = name.toLowerCase().trim();
  // Remove punctuation
  normalized = normalized.replace(/["'""''.,:;()\[\]/\\-]/g, " ");
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

/**
 * Calculate similarity between two strings using SequenceMatcher-like algorithm.
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getLevenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function getLevenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Match an extracted supplier name to a list of suppliers.
 * Returns { supplier, confidence } or { supplier: null, confidence: 0 }
 */
export function matchSupplier(supplierName, suppliers, confidenceThreshold = 60) {
  if (!supplierName || !suppliers || suppliers.length === 0) {
    return { supplier: null, confidence: 0 };
  }
  
  const nameNorm = normalizeSupplierName(supplierName);
  
  // 1. Exact normalized match
  for (const supplier of suppliers) {
    const supplierNorm = normalizeSupplierName(supplier.name);
    if (supplierNorm === nameNorm) {
      return { supplier, confidence: 100 };
    }
  }
  
  // 2. Substring and fuzzy matching
  let bestMatch = null;
  let bestScore = 0;
  
  for (const supplier of suppliers) {
    const supplierNorm = normalizeSupplierName(supplier.name);
    
    // Substring containment
    if (supplierNorm.includes(nameNorm) || nameNorm.includes(supplierNorm)) {
      const score = 85;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = supplier;
      }
      continue;
    }
    
    // Fuzzy match
    const similarity = calculateSimilarity(nameNorm, supplierNorm);
    const score = similarity * 100;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = supplier;
    }
  }
  
  if (bestScore >= confidenceThreshold) {
    return { supplier: bestMatch, confidence: bestScore };
  }
  
  return { supplier: null, confidence: bestScore };
}

/**
 * Find all suppliers that partially match the extracted name.
 */
export function findPartialSupplierMatches(supplierName, suppliers) {
  if (!supplierName || !suppliers) return [];
  
  const nameNorm = normalizeSupplierName(supplierName);
  const candidates = [];
  
  for (const supplier of suppliers) {
    const supplierNorm = normalizeSupplierName(supplier.name);
    
    if (supplierNorm.includes(nameNorm) || nameNorm.includes(supplierNorm)) {
      candidates.push(supplier);
    }
  }
  
  return candidates;
}
