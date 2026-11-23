import { chromium } from "playwright";
import { unlock } from "./audit-login.mjs";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const screenDir = path.join(root, "docs", "audit", "screens");
fs.mkdirSync(screenDir, { recursive: true });

const base = process.env.AUDIT_URL || "http://127.0.0.1:5174";
const widths = [360, 390, 768, 1280];
const pages = [
  ["stack", "Today"],
  ["plan", "Plan"],
  ["sources", "Proof"],
  ["numbers", "Numbers"],
  ["hub", "Character"],
  ["setup", "Setup"]
];

const expected = {
  360: { gutter: "16px", pageTop: "24px", section: "32px", card: "16px", cardGap: "24px" },
  390: { gutter: "16px", pageTop: "24px", section: "32px", card: "16px", cardGap: "24px" },
  768: { gutter: "24px", pageTop: "24px", section: "32px", card: "16px", cardGap: "24px" },
  1280: { gutter: "32px", pageTop: "32px", section: "48px", card: "24px", cardGap: "32px" }
};

function shot(name) {
  return path.join(screenDir, name + ".png");
}

function mdCell(value) {
  return String(value ?? "").replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 180);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await unlock(page, base);
const apiLog = [];
page.on("request", (request) => {
  const url = request.url();
  if (url.includes("/api/")) apiLog.push(request.method() + " " + url.replace(base, ""));
});

const report = [];
const rules = [];
const prompts = { subway: null, other: null };
let apiSnapshot = [];

function fail(rule, selector, detail) {
  rules.push({ rule, result: "FAIL", selector, detail });
}
function pass(rule, detail = "") {
  rules.push({ rule, result: "PASS", selector: "", detail });
}

async function readPrompts() {
  return page.evaluate(() => {
    const node = document.querySelector("[data-prompts]");
    if (!node) return null;
    try {
      return JSON.parse(node.getAttribute("data-prompts"));
    } catch (error) {
      return { error: String(error) };
    }
  });
}

async function measureRules(width) {
  const want = expected[width];
  const measured = await page.evaluate(() => {
    function px(value) {
      return Math.round(parseFloat(value) || 0);
    }
    function contrast(color, background) {
      function lum(input) {
        const parts = input.match(/\d+(\.\d+)?/g);
        if (!parts) return 0;
        const rgb = parts.slice(0, 3).map(Number).map((channel) => {
          const value = channel / 255;
          return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      }
      const a = lum(color);
      const b = lum(background);
      const high = Math.max(a, b);
      const low = Math.min(a, b);
      return (high + 0.05) / (low + 0.05);
    }
    function paint(node) {
      let current = node;
      while (current) {
        const color = getComputedStyle(current).backgroundColor;
        if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") return color;
        current = current.parentElement;
      }
      return "rgb(15, 15, 15)";
    }
    const pageEl = document.querySelector(".page");
    const card = document.querySelector(".card");
    const header = document.querySelector(".top-header");
    const sidebar = document.querySelector(".sidebar");
    const buttons = [...document.querySelectorAll("button")].filter((node) => node.getBoundingClientRect().height > 0);
    const badButton = buttons.find((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return box.height < 43 || px(style.paddingTop) < 11 || px(style.paddingBottom) < 11 || px(style.paddingLeft) < 15 || px(style.paddingRight) < 15;
    });
    const centered = [...document.querySelectorAll("h1, h2, h3, p, label, button, input, textarea")].find((node) => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      if (box.height < 1) return false;
      if (node.classList.contains("btn-icon")) return false;
      return style.textAlign === "center";
    });
    const small = [...document.querySelectorAll("body *")].find((node) => {
      const box = node.getBoundingClientRect();
      if (box.height < 1 || !node.innerText) return false;
      return px(getComputedStyle(node).fontSize) < 14;
    });
    const heading = [...document.querySelectorAll("h1, h2, h3")].find((node) => {
      const box = node.getBoundingClientRect();
      return box.height > 0 && getComputedStyle(node).color !== "rgb(255, 255, 255)";
    });
    const hint = document.querySelector(".field-hint, .muted");
    const hintContrast = hint ? contrast(getComputedStyle(hint).color, paint(hint)) : null;
    const pageStyle = pageEl ? getComputedStyle(pageEl) : null;
    const cardStyle = card ? getComputedStyle(card) : null;
    let headingGap = null;
    const titled = document.querySelector(".card h2");
    if (titled && titled.nextElementSibling) {
      headingGap = Math.round(titled.nextElementSibling.getBoundingClientRect().top - titled.getBoundingClientRect().bottom);
    }
    let labelGap = null;
    let labelIsButton = false;
    const label = document.querySelector(".field-label");
    if (label && label.nextElementSibling) {
      labelGap = Math.round(label.nextElementSibling.getBoundingClientRect().top - label.getBoundingClientRect().bottom);
      labelIsButton = label.nextElementSibling.tagName === "BUTTON" || !!label.nextElementSibling.querySelector("button");
    }
    return {
      gutter: pageStyle ? pageStyle.paddingLeft : "",
      pageTop: pageStyle ? pageStyle.paddingTop : "",
      pageBottom: pageStyle ? px(pageStyle.paddingBottom) : 0,
      section: pageStyle ? pageStyle.rowGap : "",
      cardPad: cardStyle ? cardStyle.paddingTop : "",
      cardGap: cardStyle ? cardStyle.rowGap : "",
      content: pageEl ? Math.round(pageEl.getBoundingClientRect().width) : 0,
      headerDisplay: header ? getComputedStyle(header).display : "missing",
      headerHeight: header ? Math.round(header.getBoundingClientRect().height) : 0,
      sidebarPosition: sidebar ? getComputedStyle(sidebar).position : "missing",
      sidebarTop: sidebar ? getComputedStyle(sidebar).top : "",
      badButton: badButton ? (badButton.id || badButton.className) : "",
      centered: centered ? (centered.id || centered.className || centered.tagName) : "",
      small: small ? (small.className || small.tagName) + " " + getComputedStyle(small).fontSize : "",
      heading: heading ? (heading.className || heading.tagName) : "",
      hintContrast,
      headingGap,
      labelGap,
      labelIsButton,
      tabBar: !!document.querySelector(".tab-bar, nav.tabs")
    };
  });

  const checks = [
    ["B1 page side padding", measured.gutter === want.gutter, ".page", measured.gutter],
    ["B2 page top padding", measured.pageTop === want.pageTop, ".page", measured.pageTop],
    ["B2 page bottom padding", measured.pageBottom >= 48, ".page", measured.pageBottom + "px"],
    ["B3 section gap", measured.section === want.section, ".page", measured.section],
    ["B4 card padding", measured.cardPad === want.card, ".card", measured.cardPad],
    ["B4 card inner gap", measured.cardGap === "16px", ".card", measured.cardGap],
    ["B4 heading gap", measured.headingGap == null || measured.headingGap === 12, ".card h2", measured.headingGap],
    ["B5 label gap", measured.labelGap == null || measured.labelGap === (measured.labelIsButton ? 16 : 8), ".field-label", measured.labelGap],
    ["B6 control size", !measured.badButton, measured.badButton || "button", ""],
    ["B8 smallest text", !measured.small, measured.small || "text", ""],
    ["B8 heading color", !measured.heading, measured.heading || "h1,h2,h3", ""],
    ["B8 helper contrast", measured.hintContrast == null || measured.hintContrast >= 4.5, ".muted", measured.hintContrast == null ? "" : measured.hintContrast.toFixed(2)],
    ["B9 left aligned", !measured.centered, measured.centered || "text", ""],
    ["B10 content width", measured.content <= 720, ".page", measured.content + "px"],
    ["D13 no tab bar", !measured.tabBar, ".tab-bar", ""]
  ];
  if (width >= 900) {
    checks.push(["D16 sidebar sticky", measured.sidebarPosition === "sticky" && measured.sidebarTop === "0px", ".sidebar", measured.sidebarPosition + " " + measured.sidebarTop]);
    checks.push(["D16 hamburger hidden", measured.headerDisplay === "none", ".top-header", measured.headerDisplay]);
  } else {
    checks.push(["D13 top bar 56", measured.headerHeight === 56, ".top-header", measured.headerHeight + "px"]);
  }
  for (const [rule, ok, selector, detail] of checks) {
    if (ok) pass(rule + " @" + width, detail);
    else fail(rule + " @" + width, selector, detail);
  }
}

await page.goto(base + "/#stack", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".page", { timeout: 20000 });

for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  for (const [hash, name] of pages) {
    const start = apiLog.length;
    await page.goto(base + "/#" + hash, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".page", { timeout: 20000 });
    await page.waitForTimeout(200);
    const text = await page.evaluate(() => {
      const bits = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent) continue;
        const style = getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const value = node.textContent.replace(/\s+/g, " ").trim();
        if (value) bits.push(value);
      }
      return bits;
    });
    const controls = await page.evaluate(() => {
      return [...document.querySelectorAll("button, input, textarea, [role='radio'], [role='checkbox']")]
        .filter((node) => node.getBoundingClientRect().height > 0 && getComputedStyle(node).visibility !== "hidden")
        .map((node) => {
          const style = getComputedStyle(node);
          const box = node.getBoundingClientRect();
          const next = node.nextElementSibling;
          const gap = next ? Math.round(next.getBoundingClientRect().top - box.bottom) : "";
          return {
            sel: node.id ? "#" + node.id : String(node.className).split(" ").filter(Boolean).slice(0, 2).join("."),
            text: (node.innerText || node.getAttribute("aria-label") || node.value || "").replace(/\s+/g, " ").trim().slice(0, 70),
            w: Math.round(box.width),
            h: Math.round(box.height),
            pl: style.paddingLeft,
            pr: style.paddingRight,
            pt: style.paddingTop,
            pb: style.paddingBottom,
            fs: style.fontSize,
            ta: style.textAlign,
            gap
          };
        });
    });
    await page.screenshot({ path: shot(name.toLowerCase() + "-" + width), fullPage: false });
    report.push({ width, name, text, controls, api: apiLog.slice(start) });
    if (hash === "stack") await measureRules(width);
  }

  if (width < 900) {
    await page.goto(base + "/#stack", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) main.scrollTop = 180;
    });
    const before = await page.evaluate(() => document.querySelector("main").scrollTop);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.waitForTimeout(200);
    const drawer = await page.evaluate(() => {
      const el = document.querySelector(".sidebar");
      const box = el.getBoundingClientRect();
      return { width: Math.round(box.width), open: el.classList.contains("is-open") };
    });
    await page.mouse.move(Math.min(width - 20, 340), 500);
    await page.mouse.wheel(0, 500);
    const after = await page.evaluate(() => document.querySelector("main").scrollTop);
    const drawerText = await page.evaluate(() => document.querySelector(".sidebar").innerText);
    await page.screenshot({ path: shot("drawer-" + width) });
    report.push({ width, name: "Drawer", text: drawerText.split("\n").map((line) => line.trim()).filter(Boolean), controls: [], api: [] });
    const maxDrawer = Math.min(Math.round(width * 0.8), 320);
    if (Math.abs(drawer.width - maxDrawer) > 2) fail("D14 drawer width @" + width, ".sidebar", drawer.width + " vs " + maxDrawer);
    else pass("D14 drawer width @" + width, drawer.width + "px");
    if (before !== after) fail("C2 drawer scroll lock @" + width, "main", before + " to " + after);
    else pass("C2 drawer scroll lock @" + width, before + " stayed " + after);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const closed = await page.evaluate(() => !document.querySelector(".sidebar").classList.contains("is-open"));
    if (!closed) fail("D14 escape closes drawer @" + width, ".sidebar", "still open");
    else pass("D14 escape closes drawer @" + width);
    await page.evaluate(() => {
      const main = document.querySelector("main");
      main.scrollTop = 160;
      document.querySelector("#stack-topic").click();
    });
    await page.waitForSelector(".select-sheet");
    const options = await page.evaluate(() => {
      return [...document.querySelectorAll(".select-sheet [role='option']")].map((node) => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return {
          text: node.innerText.replace(/\s+/g, " ").trim(),
          pl: style.paddingLeft,
          pr: style.paddingRight,
          h: Math.round(box.height),
          ta: style.textAlign
        };
      });
    });
    const sheet = await page.evaluate(() => {
      const el = document.querySelector(".select-sheet");
      const box = el.getBoundingClientRect();
      return { h: Math.round(box.height), view: window.innerHeight, place: el.getAttribute("data-placement") };
    });
    await page.screenshot({ path: shot("sheet-" + width) });
    report.push({ width, name: "Choose a video", text: options.map((item) => item.text), controls: options.map((item) => ({ sel: "[role=option]", text: item.text, w: "", h: item.h, pl: item.pl, pr: item.pr, pt: "", pb: "", fs: "", ta: item.ta, gap: "" })), api: [] });
    const badOption = options.find((item) => item.pl !== "16px" || item.pr !== "16px" || item.h < 44 || item.ta !== "left");
    if (badOption) fail("C1 option padding @" + width, "[role=option]", JSON.stringify(badOption));
    else pass("C1 option padding @" + width, options[0] ? options[0].pl + " " + options[0].pr + " h" + options[0].h : "");
    if (Math.abs(sheet.h - Math.round(sheet.view * 0.7)) > 4) fail("E19 sheet height @" + width, ".select-sheet", sheet.h + " of " + sheet.view);
    else pass("E19 sheet height @" + width, sheet.h + " of " + sheet.view);
    const scrolled = await page.evaluate(() => document.querySelector("main").scrollTop);
    await page.mouse.move(width / 2, 80);
    await page.mouse.wheel(0, 400);
    const scrolledAfter = await page.evaluate(() => document.querySelector("main").scrollTop);
    if (scrolled === 0) fail("C2 sheet scroll lock @" + width, "main", "started at 0, so the wheel test does not prove a lock");
    else if (scrolled !== scrolledAfter) fail("C2 sheet scroll lock @" + width, "main", scrolled + " to " + scrolledAfter);
    else pass("C2 sheet scroll lock @" + width, scrolled + " stayed " + scrolledAfter);
    await page.keyboard.press("Escape");
  }
}

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(base + "/#stack", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#stack-topic");
const sidebar = await page.evaluate(() => {
  const el = document.querySelector(".sidebar");
  const main = document.querySelector("main");
  const before = Math.round(el.getBoundingClientRect().top);
  main.scrollTop = 240;
  const after = Math.round(el.getBoundingClientRect().top);
  const style = getComputedStyle(el);
  return { position: style.position, top: style.top, height: style.height, before, after, mainTop: main.scrollTop };
});
if (sidebar.position !== "sticky" || sidebar.before !== 0 || sidebar.after !== 0) {
  fail("C4 sidebar stays put", ".sidebar", JSON.stringify(sidebar));
} else pass("C4 sidebar stays put", JSON.stringify(sidebar));

await page.evaluate(() => { document.querySelector("main").scrollTop = 0; });
await page.locator("#stack-topic").click();
await page.waitForSelector(".select-popover");
const pop = await page.evaluate(() => {
  const button = document.querySelector("#stack-topic").getBoundingClientRect();
  const menu = document.querySelector(".select-popover").getBoundingClientRect();
  const list = document.querySelector(".select-popover .select-list");
  const style = getComputedStyle(list);
  const option = document.querySelector(".select-popover [role='option']");
  const optionStyle = option ? getComputedStyle(option) : null;
  return {
    place: document.querySelector(".select-popover").getAttribute("data-placement"),
    buttonBottom: Math.round(button.bottom),
    menuTop: Math.round(menu.top),
    menuBottom: Math.round(menu.bottom),
    buttonTop: Math.round(button.top),
    overlap: menu.top < button.bottom - 1 && menu.bottom > button.top + 1,
    maxHeight: style.maxHeight,
    optionPad: optionStyle ? optionStyle.paddingLeft + " " + optionStyle.paddingRight : ""
  };
});
await page.screenshot({ path: shot("popover-1280") });
if (pop.place !== "down") fail("C3 opens downward", ".select-popover", pop.place);
else pass("C3 opens downward", pop.place + " button bottom " + pop.buttonBottom + " menu top " + pop.menuTop);
if (pop.overlap || pop.menuTop < pop.buttonBottom) fail("C3 covers button", ".select-popover", JSON.stringify(pop));
else pass("C3 does not cover button", "menu top " + pop.menuTop + " button bottom " + pop.buttonBottom);
if (pop.optionPad !== "16px 16px") fail("C1 option padding @1280", "[role=option]", pop.optionPad);
else pass("C1 option padding @1280", pop.optionPad);
await page.keyboard.press("Escape");
await page.waitForTimeout(100);
await page.evaluate(() => {
  const main = document.querySelector("main");
  main.scrollTop = 200;
  document.querySelector("#stack-topic").click();
});
await page.waitForSelector(".select-popover");

const beforePopover = await page.evaluate(() => document.querySelector("main").scrollTop);
await page.mouse.move(900, 500);
await page.mouse.wheel(0, 400);
const afterPopover = await page.evaluate(() => document.querySelector("main").scrollTop);
if (beforePopover === 0) fail("C2 popover scroll lock", "main", "started at 0, so the wheel test does not prove a lock");
else if (beforePopover !== afterPopover) fail("C2 popover scroll lock", "main", beforePopover + " to " + afterPopover);
else pass("C2 popover scroll lock", beforePopover + " stayed " + afterPopover);
await page.keyboard.press("Escape");
await page.evaluate(() => { document.querySelector("main").scrollTop = 0; });

async function choose(label) {
  const open = await page.locator(".select-popover, .select-sheet").count();
  if (!open) await page.locator("#stack-topic").click();
  await page.locator("[role='option']", { hasText: label }).first().click();
  await page.waitForTimeout(200);
}

await choose("Subway");
prompts.subway = await readPrompts();
await choose("Another brand");
prompts.other = await readPrompts();

const expanders = page.locator(".expander-trigger");
const expanderCount = await expanders.count();
for (let index = 0; index < expanderCount; index += 1) {
  await expanders.nth(index).click();
  await page.waitForTimeout(100);
}
await page.screenshot({ path: shot("today-1280-expanders") });

apiSnapshot = [...new Set(apiLog)];
await browser.close();

const lines = [];
lines.push("# Site audit");
lines.push("");
lines.push("Measured in headless Chromium with Playwright. Pass and fail come from getComputedStyle and getBoundingClientRect.");
lines.push("");
lines.push("## Rule check");
lines.push("");
lines.push("| Rule | Result | Selector | Measured |");
lines.push("| --- | --- | --- | --- |");
for (const item of rules) {
  lines.push("| " + mdCell(item.rule) + " | " + item.result + " | " + mdCell(item.selector) + " | " + mdCell(item.detail) + " |");
}
lines.push("");
lines.push("## Layout facts");
lines.push("");
lines.push("- Desktop sidebar: " + JSON.stringify(sidebar));
lines.push("- Desktop dropdown: " + JSON.stringify(pop));
lines.push("");
lines.push("## Prompts");
lines.push("");
lines.push("### Subway");
lines.push("");
lines.push("```");
lines.push(JSON.stringify(prompts.subway, null, 2) || "missing");
lines.push("```");
lines.push("");
lines.push("### Another brand");
lines.push("");
lines.push("```");
lines.push(JSON.stringify(prompts.other, null, 2) || "missing");
lines.push("```");
lines.push("");
lines.push("## API calls");
lines.push("");
for (const call of apiSnapshot) lines.push("- " + call);
if (!apiSnapshot.length) lines.push("- none recorded");
lines.push("");

for (const block of report) {
  lines.push("## " + block.name + " at " + block.width);
  lines.push("");
  lines.push("Visible text:");
  lines.push("");
  for (const bit of block.text) lines.push("- " + mdCell(bit));
  if (block.controls.length) {
    lines.push("");
    lines.push("| Control | Text | W | H | Pad L | Pad R | Pad T | Pad B | Gap | Font | Align |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const control of block.controls) {
      lines.push("| " + [control.sel, control.text, control.w, control.h, control.pl, control.pr, control.pt, control.pb, control.gap, control.fs, control.ta].map(mdCell).join(" | ") + " |");
    }
  }
  lines.push("");
}

fs.writeFileSync(path.join(root, "docs", "audit", "site-audit.md"), lines.join("\n"), "utf8");
const failed = rules.filter((item) => item.result === "FAIL");
console.log("rules " + rules.length + " fail " + failed.length);
for (const item of failed) console.log("FAIL " + item.rule + " " + item.selector + " " + item.detail);
