export async function unlock(page, base) {
  const passcode = process.env.AUDIT_PASSCODE || "";
  if (!passcode) throw new Error("AUDIT_PASSCODE is not set.");
  await page.goto(base + "/#stack", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.__status = [];
    const note = () => {
      const nodes = [...document.querySelectorAll(".research-status")].map((node) => node.textContent.trim());
      const last = window.__status[window.__status.length - 1];
      if (!last || last.join("|") !== nodes.join("|")) window.__status.push(nodes);
    };
    new MutationObserver(note).observe(document.body, { childList: true, subtree: true, characterData: true });
    note();
  });
  const box = page.getByLabel("Password");
  if (await box.count()) {
    await box.fill(passcode);
    await page.getByRole("button", { name: "Unlock" }).click();
    await page.waitForFunction(() => !document.body.innerText.includes("This site needs the password."), null, { timeout: 20000 });
  }
}
