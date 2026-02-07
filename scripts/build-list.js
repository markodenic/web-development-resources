const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const DOMPurify = require('isomorphic-dompurify');

const readmePath = path.join(__dirname, '../list/README.md');
const indexPath = path.join(__dirname, '../list/index.html');

const readmeContent = fs.readFileSync(readmePath, 'utf8');
const renderer = new marked.Renderer();

renderer.heading = function ({ text, depth, raw }) {
    // Check if arguments are passed as object (marked v5+) or individual arguments
    const headerText = arguments[0]?.text || arguments[0] || '';
    const headerLevel = arguments[0]?.depth || arguments[1];

    const slug = String(headerText)
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
    return `<h${headerLevel} id="${slug}">${headerText}</h${headerLevel}>\n`;
};

const rawHtmlContent = marked.parse(readmeContent, { renderer: renderer });
const htmlContent = DOMPurify.sanitize(rawHtmlContent);

const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Free Web Development Resources</title>
    <meta name="description" content="This is a list of awesome web development resources. Add more!">
    <link rel="canonical" href="https://web-dev-resources.com/" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown.min.css" integrity="sha512-BrOPA520KmDMqieeM7XFe6a3u3Sb3F1JBaQnrIAmWg3EYrciJ+Qqe6ZcKCdfPv26rGcgTrJnZ/IdQEct8h3Zhw==" crossorigin="anonymous" referrerpolicy="no-referrer" />    <style>
        .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
            padding: 45px;
        }
        @media (max-width: 767px) {
            .markdown-body {
                padding: 15px;
            }
        }
        .home-link {
            display: inline-block;
            margin-bottom: 20px;
            text-decoration: none;
            color: #0366d6;
        }
        .home-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <article class="markdown-body">
        <a href="/" class="home-link">Home</a>
        ${htmlContent}
    </article>
</body>
</html>`;

fs.writeFileSync(indexPath, template);
console.log('Build complete: list/index.html generated.');
