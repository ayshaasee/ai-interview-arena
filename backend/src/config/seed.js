import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const problems = [
  {
    title: 'Two Sum',
    slug: 'two-sum',
    description:
      'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to target. Assume exactly one solution exists, and you may not use the same element twice.',
    difficulty: 'easy',
    company_tags: ['Google', 'Amazon', 'Meta'],
    starter_code: {
      javascript: 'function twoSum(nums, target) {\n  // your code here\n}',
      python: 'def two_sum(nums, target):\n    # your code here\n    pass',
    },
    test_cases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1], hidden: false },
      { input: [[3, 2, 4], 6], expected: [1, 2], hidden: false },
      { input: [[3, 3], 6], expected: [0, 1], hidden: true },
    ],
  },
  {
    title: 'Reverse Linked List',
    slug: 'reverse-linked-list',
    description:
      'Given the head of a singly linked list, reverse the list and return the new head. Represent the list as a plain array for this exercise: input and output are arrays of node values.',
    difficulty: 'easy',
    company_tags: ['Microsoft', 'Amazon'],
    starter_code: {
      javascript: 'function reverseList(values) {\n  // your code here\n}',
      python: 'def reverse_list(values):\n    # your code here\n    pass',
    },
    test_cases: [
      { input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1], hidden: false },
      { input: [[1]], expected: [1], hidden: false },
      { input: [[]], expected: [], hidden: true },
    ],
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-unique-substring',
    description:
      'Given a string `s`, find the length of the longest substring without repeating characters.',
    difficulty: 'medium',
    company_tags: ['Amazon', 'Bloomberg'],
    starter_code: {
      javascript: 'function lengthOfLongestSubstring(s) {\n  // your code here\n}',
      python: 'def length_of_longest_substring(s):\n    # your code here\n    pass',
    },
    test_cases: [
      { input: ['abcabcbb'], expected: 3, hidden: false },
      { input: ['bbbbb'], expected: 1, hidden: false },
      { input: ['pwwkew'], expected: 3, hidden: true },
    ],
  },
];

async function seed() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);
  console.log('✅ Schema applied.');

  for (const p of problems) {
    await pool.query(
      `INSERT INTO problems (title, slug, description, difficulty, company_tags, starter_code, test_cases)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO NOTHING`,
      [
        p.title,
        p.slug,
        p.description,
        p.difficulty,
        p.company_tags,
        JSON.stringify(p.starter_code),
        JSON.stringify(p.test_cases),
      ]
    );
  }
  console.log(`✅ Seeded ${problems.length} problems.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});