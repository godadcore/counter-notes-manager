let depth = 0;
let saved = null;

function listOf(target) {
  return target && target.closest ? target.closest("[data-scroll-lock-list]") : null;
}

function onWheel(event) {
  const list = listOf(event.target);
  if (!list) {
    event.preventDefault();
    return;
  }
  const max = list.scrollHeight - list.clientHeight;
  const atTop = list.scrollTop <= 0 && event.deltaY < 0;
  const atBottom = list.scrollTop >= max - 1 && event.deltaY > 0;
  if (atTop || atBottom) event.preventDefault();
}

function onTouch(event) {
  if (!listOf(event.target)) event.preventDefault();
}

export function lockPageScroll() {
  depth += 1;
  if (depth === 1) {
    const main = document.querySelector("main");
    const scroller = main || document.scrollingElement;
    saved = {
      main,
      top: scroller ? scroller.scrollTop : 0,
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      mainOverflow: main ? main.style.overflow : ""
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("touchmove", onTouch, { passive: false });
  }
  let released = false;
  return function unlock() {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
    if (depth > 0 || !saved) return;
    document.documentElement.style.overflow = saved.htmlOverflow;
    document.body.style.overflow = saved.bodyOverflow;
    if (saved.main) {
      saved.main.style.overflow = saved.mainOverflow;
      saved.main.scrollTop = saved.top;
    }
    document.removeEventListener("wheel", onWheel);
    document.removeEventListener("touchmove", onTouch);
    saved = null;
  };
}
