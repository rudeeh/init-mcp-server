const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, PageNumber,
  BorderStyle, ShadingType, WidthType, TableLayoutType, SectionType,
  PageBreak,
} = require("docx");

// Palette: DM-1 Deep Cyan (Tech)
const palette = {
  bg: "162235",
  primary: "0A1628",
  body: "1A2B40",
  secondary: "6878A0",
  accent: "37DCF2",
  surface: "F4F8FC",
  cover: {
    titleColor: "FFFFFF",
    subtitleColor: "B0B8C0",
    metaColor: "90989F",
    footerColor: "687078",
  },
  table: {
    headerBg: "1B6B7A",
    headerText: "FFFFFF",
    accentLine: "1B6B7A",
    innerLine: "C8DDE2",
    surface: "EDF3F5",
  },
};

const c = (hex) => hex.replace("#", "");
const P = palette;
const t = palette.table;

// Border helpers
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// calcTitleLayout
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([...' \t', '-', '/', ':', '(', ')', '.']);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    lines[lines.length - 2] += " " + lines.pop();
  }
  return lines;
}

function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, metaLineCount = 0, fixedHeight = 800 } = params;
  const SAFETY = 1200;
  const usableHeight = 16838 - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = Math.max(usableHeight - contentHeight, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(remainingSpace * 0.45);
  const rawBottom = Math.floor(remainingSpace * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, midSpacing: 0, bottomSpacing };
}

// Cover R1 (Pure Paragraph Left)
function buildCoverR1(config) {
  const P = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: c(P.accent), space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "),
        size: 18, color: c(P.accent), font: { ascii: "Calibri" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: c(P.titleColor), font: { ascii: "Arial" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: c(P.subtitleColor), font: { ascii: "Calibri" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: c(P.metaColor), font: { ascii: "Calibri" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent), space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: c(P.footerColor), font: { ascii: "Calibri" } }),
      new TextRun({ text: "                                                  " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: c(P.footerColor), font: { ascii: "Calibri" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({ height: { value: 16838, rule: "exact" }, children: [
      new TableCell({ shading: { type: ShadingType.CLEAR, fill: c(P.bg) }, borders: noBorders, children }),
    ]})],
  })];
}

// Body helpers
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, color: c(P.primary), font: { ascii: "Calibri" } })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: c(P.primary), font: { ascii: "Calibri" } })],
  });
}
function body(text) {
  return new Paragraph({
    spacing: { line: 312, after: 120 }, alignment: AlignmentType.LEFT,
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri" } })],
  });
}
function codeBlock(lines) {
  return lines.map((line, i) => new Paragraph({
    spacing: { line: 276, after: i === lines.length - 1 ? 200 : 0 },
    shading: { type: ShadingType.CLEAR, fill: "F0F4F8" },
    indent: { left: 400 },
    children: [new TextRun({ text: line, size: 20, color: "334155", font: { ascii: "Consolas" } })],
  }));
}
function numberedItem(num, text) {
  return new Paragraph({
    spacing: { line: 312, after: 80 }, indent: { left: 600, hanging: 360 },
    children: [
      new TextRun({ text: `${num}.  `, size: 24, color: c(P.accent), font: { ascii: "Calibri" }, bold: true }),
      new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri" } }),
    ],
  });
}
function spacer() {
  return new Paragraph({ spacing: { before: 100, after: 100 }, children: [] });
}

// Horizontal-only table
function infoTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: c(t.accentLine) },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: c(t.accentLine) },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: c(t.innerLine) },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: rows[0].map(h => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: c(t.headerBg) },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 21, color: c(t.headerText), font: { ascii: "Calibri" } })] })],
        })),
      }),
      ...rows.slice(1).map((row, idx) => new TableRow({
        cantSplit: true,
        children: row.map(cell => new TableCell({
          shading: idx % 2 === 0 ? { type: ShadingType.CLEAR, fill: c(t.surface) } : undefined,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 21, color: c(P.body), font: { ascii: "Calibri" } })] })],
        })),
      })),
    ],
  });
}

// ======================== BUILD DOCUMENT ========================

const coverConfig = {
  title: "MCP Server Deployment Guide",
  subtitle: "Deploy to Render and Connect with Google Gemini",
  englishLabel: "MODEL CONTEXT PROTOCOL",
  metaLines: [
    "Repository: github.com/rudeeh/init-mcp-server",
    "Runtime: Node.js + TypeScript",
    "Hosting: Render Free Tier",
  ],
  footerLeft: "Step-by-Step Technical Guide",
  footerRight: "2026",
  palette: {
    bg: P.bg, accent: c(P.accent),
    titleColor: P.cover.titleColor, subtitleColor: P.cover.subtitleColor,
    metaColor: P.cover.metaColor, footerColor: P.cover.footerColor,
  },
};

const bodyContent = [
  // Section 1
  h1("1. Overview"),
  body("This guide walks you through deploying your MCP (Model Context Protocol) server to the cloud using Render and connecting it to Google Gemini as a custom connected app. The MCP server in your repository uses Express with Server-Sent Events (SSE) transport, which is the required transport mode for cloud-hosted servers that Gemini can interact with over HTTPS."),
  body("The deployment process consists of three main phases: pushing your code to GitHub, configuring and deploying on Render (which provides automatic HTTPS and a free tier), and finally registering the live SSE endpoint in Gemini so that it can discover and call your server's tools. Each phase is broken down into detailed, actionable steps below."),
  body("Your repository, github.com/rudeeh/init-mcp-server, already contains the complete server code including the Express server with SSE transport, tool definitions (echo, add_numbers, get_current_time, reverse_text), TypeScript configuration, and a render.yaml blueprint file for one-click deployment. No code changes are required to deploy."),

  // Section 2
  h1("2. Prerequisites"),
  body("Before you begin, make sure you have the following accounts and tools set up. Each one is free and takes only a few minutes to create if you do not already have it."),
  infoTable([
    ["Requirement", "Purpose", "Where to Get It"],
    ["GitHub Account", "Host your repository", "github.com (free)"],
    ["Render Account", "Deploy your server", "dashboard.render.com (free tier)"],
    ["Google Gemini Access", "Connect the MCP server", "gemini.google.com (free)"],
    ["Git (CLI)", "Push code to GitHub", "git-scm.com (or GitHub Desktop)"],
    ["Node.js 18+", "Local testing (optional)", "nodejs.org"],
  ]),
  spacer(),
  body("You do not need to install Node.js locally if you only want to deploy. Render handles the build and runtime environment entirely on its own servers. However, having Node.js installed locally is useful if you want to test the server before deploying or make code changes."),

  // Section 3
  h1("3. Push Your Code to GitHub"),
  body("Your MCP server code needs to be in a public GitHub repository so that Render can access it during deployment. If your repository at github.com/rudeeh/init-mcp-server already contains the code, you can skip to Step 4. If not, follow the steps below to create the repository and push your code."),

  h2("3.1 Create a New GitHub Repository"),
  numberedItem(1, "Open your browser and go to github.com/new. You must be signed into your GitHub account."),
  numberedItem(2, "Set the repository name to init-mcp-server (or any name you prefer)."),
  numberedItem(3, "Set the visibility to Public. Render's free tier requires the repository to be publicly accessible. If you need a private repo, you will need a paid Render plan."),
  numberedItem(4, "Do NOT initialize with a README, .gitignore, or license. Your project already has these files. If you accidentally add them, you will need to resolve merge conflicts later."),
  numberedItem(5, "Click Create repository. You will be taken to a page showing setup instructions."),

  h2("3.2 Push Your Local Code to GitHub"),
  body("Open a terminal (Command Prompt on Windows, Terminal on macOS/Linux) and navigate to the folder containing your MCP server project. Then run the following commands in order. Replace the GitHub username if your repo is under a different account."),
  ...codeBlock([
    "# Navigate to your project folder",
    "cd path/to/init-mcp-server",
    "",
    "# Initialize Git (if not already a git repo)",
    "git init",
    "",
    "# Add all project files",
    "git add .",
    "",
    "# Commit the files with a descriptive message",
    'git commit -m "Initial commit: MCP server with SSE transport"',
    "",
    "# Add the remote GitHub repository",
    "git remote add origin https://github.com/rudeeh/init-mcp-server.git",
    "",
    "# Push to the main branch",
    "git branch -M main",
    "git push -u origin main",
  ]),
  body("After the push completes, go to your GitHub repository page in the browser and verify that all your files are visible: package.json, tsconfig.json, render.yaml, src/index.ts, src/tools.ts, and .gitignore. If any files are missing, check that they were not listed in .gitignore and run git add and git push again."),

  // Section 4
  h1("4. Deploy to Render"),
  body("Render is a cloud platform that automatically builds and deploys your code from GitHub. It provisions an HTTPS URL, handles SSL certificates, and offers a generous free tier that is perfect for MCP servers. Your repository includes a render.yaml blueprint file that automates most of the configuration."),

  h2("4.1 Create a Render Account"),
  numberedItem(1, "Go to dashboard.render.com and click Sign Up."),
  numberedItem(2, "Sign up using your GitHub account (recommended) or with an email address. Signing up with GitHub makes it easier to connect your repository in the next step."),
  numberedItem(3, "Verify your email address if you signed up with email."),

  h2("4.2 Deploy Using the Blueprint (Recommended)"),
  body("Your repository contains a render.yaml file that pre-configures the entire deployment. This is the fastest way to deploy because Render reads the file and sets up the service automatically."),
  numberedItem(1, "In the Render Dashboard, click the New button in the top-right corner and select Blueprint from the dropdown menu."),
  numberedItem(2, "Click Connect account under the GitHub section and authorize Render to access your GitHub repositories."),
  numberedItem(3, "Find and select the init-mcp-server repository from the list."),
  numberedItem(4, "Render will detect the render.yaml file and show you the configuration it found. Verify the following settings are displayed:"),
  infoTable([
    ["Setting", "Expected Value"],
    ["Type", "Web Service"],
    ["Runtime", "Node"],
    ["Plan", "Free"],
    ["Build Command", "npm install && npm run build"],
    ["Start Command", "npm start"],
  ]),
  spacer(),
  numberedItem(5, "Click Apply. Render will now build and deploy your server. This takes about 2-3 minutes on the first deploy."),
  numberedItem(6, "Wait for the deployment status to change from Building to Live. You will see a green Live indicator when it is ready."),

  h2("4.3 Alternative: Manual Deployment"),
  body("If you prefer to configure the service manually, or if you want to customize settings beyond what render.yaml provides, follow these steps instead."),
  numberedItem(1, "In the Render Dashboard, click New and select Web Service."),
  numberedItem(2, "Under Connect a Repository, find and select init-mcp-server."),
  numberedItem(3, "Configure the following fields exactly as shown:"),
  infoTable([
    ["Field", "Value to Enter"],
    ["Name", "my-mcp-server (or any name you like)"],
    ["Runtime", "Node"],
    ["Build Command", "npm install && npm run build"],
    ["Start Command", "npm start"],
    ["Instance Type", "Free"],
  ]),
  spacer(),
  numberedItem(4, "Scroll down and click Create Web Service."),
  numberedItem(5, "Wait 2-3 minutes for the build to complete. The log panel shows real-time output. You should see the message 'MCP Server listening on port 10000' near the end of the logs."),

  h2("4.4 Copy Your Live URL"),
  body("Once the deployment is live, Render assigns your service a unique HTTPS URL. This URL is displayed at the top of your service page in the Render Dashboard. It typically looks like this:"),
  ...codeBlock(["https://my-mcp-server-xxxx.onrender.com"]),
  body("Copy this URL. You will need it in the next step when connecting to Gemini. The complete SSE endpoint is this URL followed by /sse:"),
  ...codeBlock(["https://my-mcp-server-xxxx.onrender.com/sse"]),
  body("You can verify that your server is running by opening the health check endpoint in your browser. Navigate to https://my-mcp-server-xxxx.onrender.com/health and confirm you see the JSON response {\"status\":\"ok\",\"clients\":0} in the browser."),

  // Section 5
  h1("5. Connect Your Server to Gemini"),
  body("Now that your MCP server is live and accessible over HTTPS, you need to register it with Google Gemini so that Gemini can discover and invoke your server's tools. This is done through Gemini's custom connected app feature."),

  h2("5.1 Open the Connected App Setup"),
  numberedItem(1, "Open your browser and go to gemini.google.com."),
  numberedItem(2, "If you have not already, sign in with your Google account."),
  numberedItem(3, "Look for the Extensions or Connected Apps section. This is typically found in Settings or as a side panel option. The exact location may vary as Google updates the Gemini interface."),
  numberedItem(4, "Select the option to Set up a custom connected app or Add a custom app. This opens a configuration modal."),

  h2("5.2 Enter Your SSE Endpoint"),
  body("In the setup modal, you will see a field labeled Add a custom app link or Endpoint URL. Paste your Render HTTPS URL with the /sse path into this field:"),
  ...codeBlock(["https://my-mcp-server-xxxx.onrender.com/sse"]),
  body("Make sure to include the /sse path at the end. This is the Server-Sent Events endpoint that the MCP client uses to establish a persistent connection to your server. Without it, Gemini cannot communicate with your MCP server."),

  h2("5.3 OAuth Configuration (If Required)"),
  body("If your MCP server uses OAuth for authentication, you will need to configure additional settings. However, the server in your repository does not require OAuth, so you can skip this section unless you have added OAuth to your server code."),
  body("If you do need OAuth, expand the Advanced settings section in the Gemini modal. You will find a Redirect URI that Gemini provides. Copy this URI and register it in your OAuth provider's dashboard. Then copy the resulting Client ID and Client Secret back into the Gemini modal's corresponding fields."),

  h2("5.4 Complete the Connection"),
  numberedItem(1, "Click Next in the Gemini setup modal."),
  numberedItem(2, "Gemini will attempt to connect to your SSE endpoint and discover the available tools. You should see your four tools listed: echo, add_numbers, get_current_time, and reverse_text."),
  numberedItem(3, "If the connection is successful, click Done or Save to finalize the setup."),
  numberedItem(4, "You can now use your MCP tools directly in Gemini conversations. Try asking Gemini to use the echo tool or the get_current_time tool to verify everything is working."),

  // Section 6
  h1("6. Testing Your Deployment"),
  body("After connecting your server to Gemini, it is important to verify that each component works correctly. Run through the following checks to confirm your deployment is fully functional."),

  h2("6.1 Health Check"),
  body("Open the health endpoint in your browser or use curl in a terminal to confirm the server is responding:"),
  ...codeBlock([
    "curl https://my-mcp-server-xxxx.onrender.com/health",
    "",
    "# Expected response:",
    '{ "status": "ok", "clients": 0 }',
  ]),

  h2("6.2 Test Individual Tools in Gemini"),
  body("Open a new Gemini chat and try each of the following prompts to test that the tools are callable and returning correct results. If any tool fails, check the Render logs for error messages."),
  infoTable([
    ["Test Prompt", "Expected Tool", "Expected Result"],
    ["Use the echo tool with the message 'Hello MCP'", "echo", "Returns 'Echo: Hello MCP'"],
    ["Use add_numbers to add 42 and 58", "add_numbers", "Returns '42 + 58 = 100'"],
    ["What time is it right now in UTC?", "get_current_time", "Returns current UTC timestamp"],
    ["Reverse the text 'hello world'", "reverse_text", "Returns 'Reversed: dlrow olleh'"],
  ]),
  spacer(),

  // Section 7
  h1("7. Troubleshooting"),
  body("If you encounter issues during deployment or connection, the following table covers the most common problems and their solutions. Most issues are related to build failures, incorrect endpoint URLs, or Render's free tier sleep behavior."),
  infoTable([
    ["Problem", "Cause", "Solution"],
    ["Build fails on Render", "Missing dependencies or wrong build command", "Check the Render build logs. Ensure package.json has all dependencies. Verify the build command is 'npm install && npm run build'"],
    ["Gemini cannot connect", "Wrong URL or server not live", "Verify the URL ends with /sse. Open the /health endpoint in a browser to confirm the server is running"],
    ["Server returns 502/503", "Render cold start (free tier)", "Wait 30-60 seconds and retry. Free tier services spin down after 15 minutes of inactivity. The first request after spin-down takes longer"],
    ["Tools not discovered", "SSE connection issue", "Ensure your server uses SSEServerTransport from @modelcontextprotocol/sdk. Check that /message POST endpoint exists"],
    ["Git push rejected", "Repository not initialized", "Run git init, git add ., git commit, then try pushing again"],
    ["Render cannot see repo", "GitHub not connected", "Go to Render Dashboard > Account > GitHub and reconnect or authorize the repository"],
  ]),
  spacer(),

  h2("7.1 Checking Render Logs"),
  body("If your server is behaving unexpectedly, the first place to check is the Render deployment log. Navigate to your service in the Render Dashboard and click the Logs tab. Scroll to the bottom to see the most recent entries. Look for lines containing 'MCP Server listening' to confirm the server started, and check for any error stack traces above that line."),
  body("For real-time debugging, you can also open the Shell tab in the Render Dashboard, which gives you a live terminal session inside your running container. From there you can run curl localhost:10000/health to test the server internally."),

  h2("7.2 Keeping the Server Awake"),
  body("Render's free tier puts your service to sleep after 15 minutes of inactivity. When a request comes in after sleep, it takes approximately 30-60 seconds for the server to wake up, which may cause Gemini's connection attempt to time out. To mitigate this, you can set up a free UptimeRobot monitor (uptimerobot.com) that pings your /health endpoint every 5 minutes, keeping the server awake during your working hours."),
];

// Assemble Document
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri" }, size: 24, color: c(P.body) },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: { run: { font: { ascii: "Calibri" }, size: 32, bold: true, color: c(P.primary) } },
      heading2: { run: { font: { ascii: "Calibri" }, size: 28, bold: true, color: c(P.primary) } },
    },
  },
  sections: [
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1(coverConfig),
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: "decimal" },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
            new TextRun({ text: "MCP Server Deployment Guide", size: 16, color: c(P.secondary), font: { ascii: "Calibri" }, italics: true }),
          ] })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Page ", size: 16, color: c(P.secondary), font: { ascii: "Calibri" } }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: c(P.secondary), font: { ascii: "Calibri" } }),
          ] })],
        }),
      },
      children: bodyContent,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/z/my-project/download/MCP_Server_Deployment_Guide.docx", buf);
  console.log("Document generated successfully!");
});
