import fs from "fs";
import { URL } from "url";
import path from "path";

// Configuration
const CONCURRENCY = 10;
const TIMEOUT_MS = 10000; // Increased timeout for potentially slow sites
const README_PATH = path.join(process.cwd(), "list/README.md");

// Helper: timeout wrapper
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout exceeded")), ms)
  );
  return Promise.race([promise, timeout]);
}

// Check single blog
async function checkRedirect(item) {
  const { name, url } = item;

  try {
    const response = await withTimeout(fetch(url, { redirect: "follow" }), TIMEOUT_MS);
    const finalUrl = response.url;

    // Normalize URLs for comparison (remove trailing slashes, www, etc if needed)
    // Here we stick to the user's logic: compare hostnames
    const originalHost = new URL(url).hostname.replace(/^www\./, "");
    const finalHost = new URL(finalUrl).hostname.replace(/^www\./, "");

    if (originalHost !== finalHost) {
      return { name, url, finalUrl, status: response.status, redirected: true };
    }
  } catch (err) {
    return { name, url, error: err.message };
  }

  return null;
}

// Run concurrent checks
async function runConcurrent(items) {
  const results = [];
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.pop();
      try {
          const result = await checkRedirect(item);
          if (result) {
            results.push(result);
            process.stdout.write("x"); // visual feedback for failure/redirect
          } else {
            process.stdout.write("."); // visual feedback for success
          }
      } catch (e) {
         console.error(`\nError processing ${item.url}:`, e);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);
  console.log(""); // Newline after progress
  return results;
}

function parseReadme(content) {
  const lines = content.split('\n');
  const items = [];
  
  // Regex to match markdown links in tables: | [Name](URL) | ...
  // Or just general markdown links [Name](URL)
  // The user said "The resources to check are in the list/readme.md."
  // Looking at the file, it has tables.
  // Example: | [Netlify](https://netlify.com) | ... |

  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;

  let match;
  while ((match = linkRegex.exec(content)) !== null) {
      const name = match[1];
      const url = match[2];
      // Filter out internal links (anchors) or obviously non-resource links if any
      if (!url.startsWith('http')) continue;
      
      // Also maybe filter out the "Made by Marko" or "Awesome" badges if they trigger
      if (url.includes("shields.io") || url.includes("badgen.net")) continue;

      items.push({ name, url });
  }
  return items;
}

// Main
async function main() {
  console.log(`Reading ${README_PATH}...`);
  if (!fs.existsSync(README_PATH)) {
      console.error("README file not found at " + README_PATH);
      process.exit(1);
  }

  const content = fs.readFileSync(README_PATH, "utf8");
  const items = parseReadme(content);

  console.log(`Found ${items.length} links to check.`);
  console.log(`Checking with concurrency ${CONCURRENCY}...\n`);
  
  const results = await runConcurrent(items);

  if (results.length === 0) {
    console.log("✅ No redirects detected.");
  } else {
    console.log(`\n⚠️ Found ${results.length} redirects or failed URLs:`);
    // console.table(results); // Can be verbose if too many
    fs.writeFileSync("redirects.json", JSON.stringify(results, null, 2));
    console.log("Saved report to redirects.json");
  }
}

main();
