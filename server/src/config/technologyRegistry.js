/**
 * Registry of identifiable technologies, frameworks, runtimes, and tools.
 * Defines explicit matching rules for languages, manifest dependencies, topics, and configuration files.
 */
export const technologyRegistry = [
  // --- Languages ---
  {
    key: 'javascript',
    name: 'JavaScript',
    category: 'language',
    languageMatches: ['JavaScript'],
  },
  {
    key: 'typescript',
    name: 'TypeScript',
    category: 'language',
    languageMatches: ['TypeScript'],
    manifestPackages: {
      npm: ['typescript', '@types/node', '@types/react'],
    },
    fileMatches: ['tsconfig.json'],
  },
  {
    key: 'python',
    name: 'Python',
    category: 'language',
    languageMatches: ['Python'],
  },
  {
    key: 'java',
    name: 'Java',
    category: 'language',
    languageMatches: ['Java'],
  },
  {
    key: 'cpp',
    name: 'C++',
    category: 'language',
    languageMatches: ['C++', 'cpp'],
  },
  {
    key: 'c',
    name: 'C',
    category: 'language',
    languageMatches: ['C'],
  },
  {
    key: 'go',
    name: 'Go',
    category: 'language',
    languageMatches: ['Go'],
    fileMatches: ['go.mod', 'go.sum'],
  },
  {
    key: 'rust',
    name: 'Rust',
    category: 'language',
    languageMatches: ['Rust'],
    fileMatches: ['Cargo.toml'],
  },
  {
    key: 'php',
    name: 'PHP',
    category: 'language',
    languageMatches: ['PHP'],
    fileMatches: ['composer.json'],
  },
  {
    key: 'ruby',
    name: 'Ruby',
    category: 'language',
    languageMatches: ['Ruby'],
    fileMatches: ['Gemfile'],
  },
  {
    key: 'html',
    name: 'HTML',
    category: 'language',
    languageMatches: ['HTML', 'HTML5'],
  },
  {
    key: 'css',
    name: 'CSS',
    category: 'language',
    languageMatches: ['CSS'],
  },
  {
    key: 'scss',
    name: 'SCSS / Sass',
    category: 'language',
    languageMatches: ['SCSS', 'Sass'],
    manifestPackages: {
      npm: ['sass', 'node-sass', 'sass-loader'],
    },
  },

  // --- Web Frameworks & Libraries ---
  {
    key: 'react',
    name: 'React',
    category: 'framework',
    manifestPackages: {
      npm: ['react', 'react-dom', 'react-router-dom', 'react-scripts'],
    },
    topicMatches: ['react', 'reactjs'],
  },
  {
    key: 'nextjs',
    name: 'Next.js',
    category: 'framework',
    manifestPackages: {
      npm: ['next'],
    },
    topicMatches: ['nextjs', 'next-js'],
    fileMatches: ['next.config.js', 'next.config.mjs'],
  },
  {
    key: 'vue',
    name: 'Vue.js',
    category: 'framework',
    manifestPackages: {
      npm: ['vue', 'vue-router', 'pinia', 'vuex', '@vue/cli-service'],
    },
    topicMatches: ['vue', 'vuejs', 'vue3'],
  },
  {
    key: 'angular',
    name: 'Angular',
    category: 'framework',
    manifestPackages: {
      npm: ['@angular/core', '@angular/common', '@angular/cli'],
    },
    topicMatches: ['angular', 'angularjs'],
  },

  // --- Backend Frameworks & Runtimes ---
  {
    key: 'nodejs',
    name: 'Node.js',
    category: 'runtime',
    manifestPackages: {
      npm: ['@types/node'],
    },
    topicMatches: ['nodejs', 'node'],
  },
  {
    key: 'express',
    name: 'Express.js',
    category: 'framework',
    manifestPackages: {
      npm: ['express'],
    },
    topicMatches: ['express', 'expressjs'],
  },
  {
    key: 'django',
    name: 'Django',
    category: 'framework',
    manifestPackages: {
      pip: ['django', 'djangorestframework'],
    },
    topicMatches: ['django', 'django-rest-framework'],
  },
  {
    key: 'flask',
    name: 'Flask',
    category: 'framework',
    manifestPackages: {
      pip: ['flask', 'flask-cors', 'flask-restful', 'flask-sqlalchemy'],
    },
    topicMatches: ['flask'],
  },
  {
    key: 'fastapi',
    name: 'FastAPI',
    category: 'framework',
    manifestPackages: {
      pip: ['fastapi', 'uvicorn'],
    },
    topicMatches: ['fastapi'],
  },
  {
    key: 'springboot',
    name: 'Spring Boot',
    category: 'framework',
    manifestPackages: {
      maven: ['spring-boot', 'spring-boot-starter', 'spring-boot-starter-web'],
      gradle: ['spring-boot', 'spring-boot-starter'],
    },
    topicMatches: ['spring-boot', 'springboot', 'spring-framework'],
  },

  // --- Databases & Stores ---
  {
    key: 'mongodb',
    name: 'MongoDB',
    category: 'database',
    manifestPackages: {
      npm: ['mongodb', 'mongoose'],
      pip: ['pymongo', 'motor'],
    },
    topicMatches: ['mongodb', 'mongoose'],
  },
  {
    key: 'postgresql',
    name: 'PostgreSQL',
    category: 'database',
    manifestPackages: {
      npm: ['pg', 'pg-promise', 'typeorm', 'prisma'],
      pip: ['psycopg2', 'psycopg2-binary', 'asyncpg'],
    },
    topicMatches: ['postgresql', 'postgres'],
  },
  {
    key: 'mysql',
    name: 'MySQL',
    category: 'database',
    manifestPackages: {
      npm: ['mysql', 'mysql2', 'sequelize'],
      pip: ['mysqlclient', 'pymysql'],
    },
    topicMatches: ['mysql'],
  },
  {
    key: 'redis',
    name: 'Redis',
    category: 'database',
    manifestPackages: {
      npm: ['redis', 'ioredis'],
      pip: ['redis', 'aioredis'],
    },
    topicMatches: ['redis'],
  },

  // --- Infrastructure & Tools ---
  {
    key: 'docker',
    name: 'Docker',
    category: 'tool',
    fileMatches: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
    topicMatches: ['docker', 'docker-compose', 'containerization'],
  },
];

export default technologyRegistry;
