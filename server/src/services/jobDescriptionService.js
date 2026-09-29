import technologyRegistry from '../config/technologyRegistry.js';

/**
 * Common regex patterns and aliases for recognized technologies in GitInsight's registry.
 * Maps variations in casing, punctuation, and abbreviations to canonical technology keys.
 */
const TECHNOLOGY_EXTRACTION_PATTERNS = [
  {
    key: 'javascript',
    patterns: [/\bjavascript\b/i, /\bjs\b/i, /\becmascript\b/i],
  },
  {
    key: 'typescript',
    patterns: [/\btypescript\b/i, /\bts\b/i],
  },
  {
    key: 'python',
    patterns: [/\bpython\b/i, /\bpython3\b/i],
  },
  {
    key: 'java',
    // Must match Java, but NOT JavaScript or JavaBean
    patterns: [/\bjava\b(?!\s*script)/i],
  },
  {
    key: 'cpp',
    patterns: [/\bc\+\+\b/i, /\bcpp\b/i, /\bc\s*\/\s*c\+\+/i],
  },
  {
    key: 'c',
    // Match C language in explicit programming contexts
    patterns: [/\bc\s+(programming|language)\b/i, /\bansi\s+c\b/i, /\b(c|c\+\+)\s+development\b/i],
  },
  {
    key: 'go',
    patterns: [/\bgolang\b/i, /\bgo\s+(programming|language)\b/i, /\bgo\s+developer\b/i],
  },
  {
    key: 'rust',
    patterns: [/\brust\b/i, /\brustlang\b/i],
  },
  {
    key: 'php',
    patterns: [/\bphp\b/i, /\bphp\d?\b/i],
  },
  {
    key: 'ruby',
    patterns: [/\bruby\b/i, /\bruby\s+on\s+rails\b/i],
  },
  {
    key: 'html',
    patterns: [/\bhtml\b/i, /\bhtml5\b/i],
  },
  {
    key: 'css',
    patterns: [/\bcss\b/i, /\bcss3\b/i],
  },
  {
    key: 'scss',
    patterns: [/\bscss\b/i, /\bsass\b/i],
  },
  {
    key: 'react',
    // Must match React, React.js, ReactJS, but not React Native
    patterns: [/\breact\.?js\b/i, /\breactjs\b/i, /\breact\b(?!\s*native)/i],
  },
  {
    key: 'nextjs',
    patterns: [/\bnext\.?js\b/i, /\bnextjs\b/i],
  },
  {
    key: 'vue',
    patterns: [/\bvue\.?js\b/i, /\bvuejs\b/i, /\bvue\s*3\b/i, /\bvue\b/i],
  },
  {
    key: 'angular',
    patterns: [/\bangular\.?js\b/i, /\bangularjs\b/i, /\bangular\b/i],
  },
  {
    key: 'nodejs',
    patterns: [/\bnode\.?js\b/i, /\bnodejs\b/i, /\bnode\s+backend\b/i, /\bnode\b/i],
  },
  {
    key: 'express',
    patterns: [/\bexpress\.?js\b/i, /\bexpressjs\b/i, /\bexpress\s+framework\b/i, /\bexpress\b/i],
  },
  {
    key: 'django',
    patterns: [/\bdjango\b/i, /\bdjango\s*rest\s*framework\b/i, /\bdrf\b/i],
  },
  {
    key: 'flask',
    patterns: [/\bflask\b/i],
  },
  {
    key: 'fastapi',
    patterns: [/\bfastapi\b/i, /\bfast\s+api\b/i],
  },
  {
    key: 'springboot',
    patterns: [/\bspring\s*boot\b/i, /\bspringboot\b/i, /\bspring\s+framework\b/i],
  },
  {
    key: 'mongodb',
    patterns: [/\bmongodb\b/i, /\bmongo\b/i, /\bmongoose\b/i],
  },
  {
    key: 'postgresql',
    patterns: [/\bpostgresql\b/i, /\bpostgres\b/i, /\bpsql\b/i],
  },
  {
    key: 'mysql',
    patterns: [/\bmysql\b/i],
  },
  {
    key: 'redis',
    patterns: [/\bredis\b/i],
  },
  {
    key: 'docker',
    patterns: [/\bdocker\b/i, /\bdocker[\s\-]compose\b/i, /\bcontainerization\b/i],
  },
];

/**
 * Common broader software technologies that may appear in JDs but are not yet
 * part of the active GitInsight technology registry.
 * Preserved cleanly as "unrecognized" requirements without hallucinating evidence.
 */
const BROADER_UNRECOGNIZED_PATTERNS = [
  { key: 'unrecognized_aws', name: 'AWS', pattern: /\b(aws|amazon\s+web\s+services)\b/i },
  { key: 'unrecognized_azure', name: 'Azure', pattern: /\b(azure|microsoft\s+azure)\b/i },
  { key: 'unrecognized_gcp', name: 'GCP', pattern: /\b(gcp|google\s+cloud(\s+platform)?)\b/i },
  { key: 'unrecognized_kubernetes', name: 'Kubernetes', pattern: /\b(kubernetes|k8s)\b/i },
  { key: 'unrecognized_graphql', name: 'GraphQL', pattern: /\bgraphql\b/i },
  { key: 'unrecognized_tailwind', name: 'Tailwind CSS', pattern: /\b(tailwindcss|tailwind)\b/i },
  { key: 'unrecognized_kafka', name: 'Kafka', pattern: /\b(apache\s+)?kafka\b/i },
  { key: 'unrecognized_rabbitmq', name: 'RabbitMQ', pattern: /\brabbitmq\b/i },
  { key: 'unrecognized_elasticsearch', name: 'Elasticsearch', pattern: /\b(elasticsearch|elastic\s+search)\b/i },
  { key: 'unrecognized_terraform', name: 'Terraform', pattern: /\bterraform\b/i },
  { key: 'unrecognized_linux', name: 'Linux', pattern: /\blinux\b/i },
  { key: 'unrecognized_git', name: 'Git', pattern: /\bgit\b(?!\s*insight)/i },
  { key: 'unrecognized_redux', name: 'Redux', pattern: /\bredux\b/i },
  { key: 'unrecognized_swift', name: 'Swift', pattern: /\bswift\b/i },
  { key: 'unrecognized_kotlin', name: 'Kotlin', pattern: /\bkotlin\b/i },
  { key: 'unrecognized_graphql', name: 'GraphQL', pattern: /\bgraphql\b/i },
  { key: 'unrecognized_cicd', name: 'CI/CD', pattern: /\b(ci\s*\/\s*cd|continuous\s+integration)\b/i },
];

/**
 * Header keywords identifying section intent.
 */
const REQUIRED_HEADING_REGEX =
  /^(#+|\*+|-+)?\s*(requirements?|required(\s*(qualifications?|skills?|experience|competencies))?|must[\s\-]have|mandatory|essential(\s*(skills?|qualifications?))?|what\s*(you('ll)?\s*need|we('re)?\s*looking\s*for)|basic\s*qualifications?|minimum\s*qualifications?|core\s*requirements?)/i;

const PREFERRED_HEADING_REGEX =
  /^(#+|\*+|-+)?\s*(preferred(\s*(qualifications?|skills?|experience|competencies))?|nice[\s\-]to[\s\-]have|bonus(\s*points?)?|good\s*to\s*have|plus(es)?|desired(\s*skills?)?|optional|advantages?|would\s*be\s*a\s*plus|preferred\s*skills?)/i;

const NEUTRAL_HEADING_REGEX =
  /^(#+|\*+|-+)?\s*(about(\s*(the\s*role|the\s*job|us|our\s*team))?|responsibilities|what\s*you'll\s*do|company\s*overview|benefits|perks|compensation)/i;

/**
 * In-line keywords within a line or bullet point.
 */
const INLINE_REQUIRED_REGEX =
  /\b(must\s+have|required|mandatory|essential|minimum\s+of|strictly\s+required)\b/i;

const INLINE_PREFERRED_REGEX =
  /\b(nice\s+to\s+have|preferred|bonus|plus|good\s+to\s+have|optional|advantageous|would\s+be\s+great)\b/i;

export const jobDescriptionService = {
  /**
   * Extract recognized and unrecognized technology requirements from raw JD text.
   * Classifies each requirement as 'required', 'preferred', or 'unspecified'.
   */
  extractRequirements(rawText) {
    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      return {
        requirements: [],
        totalExtracted: 0,
      };
    }

    const lines = rawText.split(/\r?\n/);
    let currentSectionContext = 'unspecified';

    // Map of technologyKey -> requirement object
    const extractedMap = new Map();

    // Fast lookup map for registry info
    const registryMap = new Map(technologyRegistry.map((t) => [t.key, t]));

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // 1. Check for Section Heading updates
      if (REQUIRED_HEADING_REGEX.test(line)) {
        currentSectionContext = 'required';
        continue;
      } else if (PREFERRED_HEADING_REGEX.test(line)) {
        currentSectionContext = 'preferred';
        continue;
      } else if (NEUTRAL_HEADING_REGEX.test(line)) {
        currentSectionContext = 'unspecified';
        continue;
      }

      // 2. Determine Line-Level Context
      let lineContext = currentSectionContext;
      if (INLINE_REQUIRED_REGEX.test(line)) {
        lineContext = 'required';
      } else if (INLINE_PREFERRED_REGEX.test(line)) {
        lineContext = 'preferred';
      }

      // 3. Scan for Recognized Technologies
      for (const entry of TECHNOLOGY_EXTRACTION_PATTERNS) {
        const regItem = registryMap.get(entry.key);
        if (!regItem) continue;

        let matched = false;
        let matchedPhrase = '';

        for (const pattern of entry.patterns) {
          const match = line.match(pattern);
          if (match) {
            matched = true;
            matchedPhrase = match[0];
            break;
          }
        }

        if (matched) {
          if (!extractedMap.has(entry.key)) {
            extractedMap.set(entry.key, {
              technologyKey: entry.key,
              displayName: regItem.name,
              category: lineContext,
              recognitionStatus: 'recognized',
              matchedText: matchedPhrase,
              occurrencesCount: 1,
              sampleSnippets: [line.length > 140 ? line.slice(0, 140) + '...' : line],
            });
          } else {
            const existing = extractedMap.get(entry.key);
            existing.occurrencesCount += 1;
            // Upgrade category precedence: required > preferred > unspecified
            if (lineContext === 'required') {
              existing.category = 'required';
            } else if (lineContext === 'preferred' && existing.category === 'unspecified') {
              existing.category = 'preferred';
            }
            if (existing.sampleSnippets.length < 3 && !existing.sampleSnippets.includes(line)) {
              existing.sampleSnippets.push(line.length > 140 ? line.slice(0, 140) + '...' : line);
            }
          }
        }
      }

      // 4. Scan for Broader Unrecognized Technologies
      for (const unrec of BROADER_UNRECOGNIZED_PATTERNS) {
        const match = line.match(unrec.pattern);
        if (match) {
          if (!extractedMap.has(unrec.key)) {
            extractedMap.set(unrec.key, {
              technologyKey: unrec.key,
              displayName: unrec.name,
              category: lineContext,
              recognitionStatus: 'unrecognized',
              matchedText: match[0],
              occurrencesCount: 1,
              sampleSnippets: [line.length > 140 ? line.slice(0, 140) + '...' : line],
            });
          } else {
            const existing = extractedMap.get(unrec.key);
            existing.occurrencesCount += 1;
            if (lineContext === 'required') {
              existing.category = 'required';
            } else if (lineContext === 'preferred' && existing.category === 'unspecified') {
              existing.category = 'preferred';
            }
          }
        }
      }
    }

    const requirements = Array.from(extractedMap.values()).sort((a, b) => {
      // Sort by recognition (recognized first), then category (required > preferred > unspecified), then name
      if (a.recognitionStatus !== b.recognitionStatus) {
        return a.recognitionStatus === 'recognized' ? -1 : 1;
      }
      const catOrder = { required: 1, preferred: 2, unspecified: 3 };
      if (catOrder[a.category] !== catOrder[b.category]) {
        return catOrder[a.category] - catOrder[b.category];
      }
      return a.displayName.localeCompare(b.displayName);
    });

    return {
      requirements,
      totalExtracted: requirements.length,
      requiredCount: requirements.filter((r) => r.category === 'required').length,
      preferredCount: requirements.filter((r) => r.category === 'preferred').length,
      unspecifiedCount: requirements.filter((r) => r.category === 'unspecified').length,
      recognizedCount: requirements.filter((r) => r.recognitionStatus === 'recognized').length,
      unrecognizedCount: requirements.filter((r) => r.recognitionStatus === 'unrecognized').length,
    };
  },
};

export default jobDescriptionService;
