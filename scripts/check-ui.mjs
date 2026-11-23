import { chromium } from "playwright";
import { unlock } from "./audit-login.mjs";

const base = process.env.AUDIT_URL || "http://127.0.0.1:5174";
const widths = [360, 390, 768, 1280];
const pages = ["stack", "plan", "sources", "numbers", "hub", "setup"];
const fails = [];

function note(width, page, detail) {
  fails.push(width + " " + page + ": " + detail);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await unlock(page, base);

for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  for (const name of pages) {
    await page.goto(base + "/#" + name, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const found = await page.evaluate(() => {
      function box(node) {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height };
      }
      function distance(a, b) {
        const h = Math.max(a.left, b.left) - Math.min(a.right, b.right);
        const v = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom);
        const hGap = Math.max(0, h);
        const vGap = Math.max(0, v);
        if (hGap === 0 && vGap === 0) return 0;
        if (hGap > 0 && vGap > 0) return Math.hypot(hGap, vGap);
        return hGap + vGap;
      }
      const problems = [];
      const buttons = [...document.querySelectorAll("button")].filter((node) => node.getBoundingClientRect().height > 8);
      const targets = [...document.querySelectorAll("input, textarea, label, p, h1, h2, h3")].filter((node) => node.getBoundingClientRect().height > 4);
      for (const button of buttons) {
        const buttonBox = box(button);
        for (const target of targets) {
          if (button.contains(target) || target.contains(button)) continue;
          const gap = distance(buttonBox, box(target));
          if (gap < 16) {
            problems.push(button.innerText.trim().slice(0, 40) + " is " + Math.round(gap) + "px from " + target.tagName + " " + (target.innerText || "").trim().slice(0, 40));
          }
        }
      }
      return problems.slice(0, 12);
    });
    for (const item of found) note(width, name, item);
    if (name === "sources") {
      const proof = await page.evaluate((desktop) => {
        const cards = [...document.querySelectorAll(".proof-card")];
        if (!cards.length) return { missing: true };
        const first = cards[0];
        const style = getComputedStyle(first);
        const heading = first.querySelector("h3");
        const claim = first.querySelector(".proof-claim");
        const field = first.querySelector("input");
        const check = [...first.querySelectorAll("button")].find((node) => node.innerText.includes("Check"));
        const confirm = [...first.querySelectorAll("button")].find((node) => node.innerText.includes("Mark"));
        const leave = [...first.querySelectorAll("button")].find((node) => node.innerText.includes("Leave"));
        function gap(a, b) {
          if (!a || !b) return null;
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return Math.round(br.top - ar.bottom);
        }
        let between = null;
        if (cards[1]) between = Math.round(cards[1].getBoundingClientRect().top - first.getBoundingClientRect().bottom);
        const confirmStyle = confirm ? getComputedStyle(confirm) : null;
        return {
          pad: style.paddingTop + " " + style.paddingRight,
          border: style.borderTopWidth,
          between,
          claimGap: gap(heading, claim),
          fieldGap: gap(claim, field),
          checkGap: gap(field, check),
          beside: desktop && check && field ? Math.round(check.getBoundingClientRect().left - field.getBoundingClientRect().right) : null,
          confirmDisabled: confirm ? confirm.disabled : null,
          confirmBg: confirmStyle ? confirmStyle.backgroundColor : "",
          leaveBg: leave ? getComputedStyle(leave).backgroundColor : "",
          names: document.body.innerText.includes("Link name"),
          dates: document.body.innerText.includes("Link date")
        };
      }, width >= 900);
      if (proof.missing) note(width, "sources", "no proof cards");
      else {
        const pad = width >= 900 ? "24px" : "16px";
        if (!proof.pad.startsWith(pad)) note(width, "sources", "card padding " + proof.pad);
        if (proof.border !== "1px") note(width, "sources", "border " + proof.border);
        if (proof.between != null && proof.between !== 24) note(width, "sources", "card gap " + proof.between);
        if (proof.claimGap !== 8) note(width, "sources", "claim gap " + proof.claimGap);
        if (proof.fieldGap !== 16) note(width, "sources", "field gap " + proof.fieldGap);
        if (width < 900 && proof.checkGap !== 16) note(width, "sources", "check gap " + proof.checkGap);
        if (width >= 900 && proof.beside !== 16) note(width, "sources", "desktop field-button gap " + proof.beside);
        if (proof.confirmDisabled !== true) note(width, "sources", "Mark confirmed starts enabled");
        if (proof.names || proof.dates) note(width, "sources", "name or date field still showing");
        if (proof.confirmBg === "rgb(255, 0, 0)") note(width, "sources", "Mark confirmed is pure #ff0000");
      }
    }
  }
}

await browser.close();
if (fails.length) {
  console.log("FAIL " + fails.length);
  for (const item of fails) console.log(item);
  process.exit(1);
}
console.log("PASS button clearance and proof cards at 360, 390, 768, 1280");
