import { useEffect, useRef, useState } from "react";
import { BarChart3, CalendarRange, Layers, Link2, Menu, Mic, Settings, UserRound } from "lucide-react";
import { Button } from "./components/ui/Button.jsx";
import { Field } from "./components/ui/Field.jsx";
import { Input } from "./components/ui/Input.jsx";
import { Segmented } from "./components/ui/Segmented.jsx";
import { ToastProvider, useToast } from "./components/ui/Toast.jsx";
import { PLAN } from "./data.js";
import { useStored } from "./useStored.js";
import { useServer } from "./useServer.js";
import { copy } from "./copy.js";
import { lockPageScroll } from "./scrollLock.js";
import { Hub } from "./views/Hub.jsx";
import { Kit } from "./views/Kit.jsx";
import { Numbers } from "./views/Numbers.jsx";
import { Plan } from "./views/Plan.jsx";
import { Setup } from "./views/Setup.jsx";
import { Sources } from "./views/Sources.jsx";
import { Stack } from "./views/Stack.jsx";

const VIEWS = [
  { id: "stack", label: copy.nav.today, icon: Layers },
  { id: "plan", label: copy.nav.plan, icon: CalendarRange },
  { id: "sources", label: copy.nav.proof, icon: Link2 },
  { id: "numbers", label: copy.nav.numbers, icon: BarChart3 },
  { id: "hub", label: copy.nav.character, icon: UserRound },
  { id: "setup", label: copy.nav.setup, icon: Settings }
];

function ResearchMark({ status }) {
  if (!status) return null;
  return (
    <p className="research-status">
      <span className={status.kind === "off" ? "research-dot" : "research-dot is-on"} aria-hidden="true" />
      {status.line}
    </p>
  );
}

function useResearchStatus(onFinished) {
  const [status, setStatus] = useState(null);
  const finishedId = useRef(0);
  const finishRef = useRef(onFinished);
  finishRef.current = onFinished;
  useEffect(() => {
    let stop = false;
    async function ping() {
      const code = sessionStorage.getItem("cn-passcode") || "";
      const headers = code ? { "x-counter-notes-passcode": code } : {};
      let on = null;
      let job = null;
      try {
        const health = await fetch("/api/research/health", { headers });
        const data = await health.json();
        if (health.ok) on = !!data.on;
      } catch {
        on = null;
      }
      try {
        const response = await fetch("/api/research/status", { headers });
        if (response.ok) job = await response.json();
      } catch {
        job = null;
      }
      if (stop) return;
      if (job && job.running) setStatus({ kind: "running", line: copy.researchRunning(job.topicName || "") });
      else if (on === true) setStatus({ kind: "on", line: copy.researchOn });
      else if (on === false) setStatus({ kind: "off", line: copy.researchOff });
      else setStatus(null);
      if (job && job.done && !job.running && job.id && job.id !== finishedId.current) {
        finishedId.current = job.id;
        finishRef.current(job);
      }
    }
    ping();
    const timer = setInterval(ping, 5000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);
  return status;
}

function knownView(hash) {
  if (hash === "kit" && import.meta.env.DEV) return "kit";
  return VIEWS.some((item) => item.id === hash) ? hash : "hub";
}

function defaultStack() {
  return { topicId: 1, custom: "", thumbLine: "", notes: "", checks: {}, saved: false, usedOn: "", queue: [] };
}

function Shell() {
  const toast = useToast();
  const server = useServer();
  const research = useResearchStatus((job) => {
    toast(job.error || copy.toast.researchDone);
    server.reload().catch(() => {});
  });
  const [view, setView] = useState(() => knownView(location.hash.replace("#", "")));
  const [stack, setStack] = useStored("cn-stack-v1", defaultStack);
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 900px)").matches);
  const menuRef = useRef(null);
  const drawerRef = useRef(null);
  const swipeRef = useRef(null);

  function go(next) {
    if (location.hash !== "#" + next) location.hash = next;
    setView(next);
    setMenuOpen(false);
  }

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    const apply = () => {
      setDesktop(media.matches);
      if (media.matches) setMenuOpen(false);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!menuOpen || desktop) return undefined;
    const root = drawerRef.current;
    const unlock = lockPageScroll();
    function focusable() {
      if (!root) return [];
      return [...root.querySelectorAll("button, [href], input, textarea, [tabindex]")].filter((node) => !node.disabled);
    }
    focusable()[0]?.focus();
    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      unlock();
      document.removeEventListener("keydown", onKey);
      menuRef.current?.focus();
    };
  }, [menuOpen, desktop]);

  useEffect(() => {
    function onHash() {
      setView(knownView(location.hash.replace("#", "")));
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const safeStack = stack && typeof stack === "object" && Array.isArray(stack.queue) ? stack : defaultStack();

  if (!server.state) {
    return <Blocked problem={server.problem} setPasscode={server.setPasscode} />;
  }

  const { topics, findings, stats, cadence, days, thresholds, weights, numbersInputs, series, videoSettings, performance, niche, dossiers } = server.state;
  const next = PLAN.find((item) => item.postId && !days[item.day] && !days[String(item.day)]);

  async function setCadence(value) {
    try {
      await server.setCadence(value);
    } catch (error) {
      toast(error.message);
    }
  }

  const nextPostId = next ? next.postId : null;

  function onDrawerTouchStart(event) {
    const touch = event.changedTouches[0];
    swipeRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function onDrawerTouchEnd(event) {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (dx < -48 && Math.abs(dx) > Math.abs(dy)) setMenuOpen(false);
  }

  return (
    <div className="app">
      <header className="top-header">
        <Button
          ref={menuRef}
          variant="icon"
          aria-label={copy.openMenu}
          aria-expanded={menuOpen}
          aria-controls="app-drawer"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={20} />
        </Button>
        <h1 className="wordmark">{copy.appName}</h1>
        <ResearchMark status={research} />
      </header>
      {menuOpen && !desktop ? <div className="drawer-backdrop" aria-hidden="true" onClick={() => setMenuOpen(false)} /> : null}
      <div className="shell">
        <nav
          id="app-drawer"
          ref={drawerRef}
          className={menuOpen || desktop ? "sidebar is-open" : "sidebar"}
          aria-label={copy.sections}
          data-scroll-lock-list="true"
          aria-hidden={!desktop && !menuOpen ? true : undefined}
          inert={!desktop && !menuOpen ? true : undefined}
          onTouchStart={onDrawerTouchStart}
          onTouchEnd={onDrawerTouchEnd}
        >
          <h1 className="wordmark">{copy.appName}</h1>
          <ResearchMark status={research} />
          {VIEWS.map((item) => {
            const Icon = item.icon;
            return (
              <Button key={item.id} variant="nav" className={view === item.id ? "active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => go(item.id)}>
                <Icon size={16} />
                <span>{item.label}</span>
              </Button>
            );
          })}
          <p className="sidebar-label">{copy.videosPerWeek}</p>
          <Segmented
            label={copy.videosPerWeek}
            value={cadence}
            onChange={setCadence}
            options={[4, 5, 6, 7].map((value) => ({ value, label: String(value) }))}
          />
          <p className="voice-row"><Mic size={16} /> {copy.voice}</p>
          <p className="side-note">{copy.shareNote}</p>
        </nav>
        <main>
          {view === "hub" && <Hub />}
          {view === "stack" && (
            <Stack
              stack={safeStack}
              setStack={setStack}
              cadence={cadence}
              topics={topics}
              findings={findings}
              series={series || []}
              videoSettings={videoSettings}
              saveVideoSettings={server.saveVideoSettings}
              dossiers={dossiers || []}
              performance={performance || []}
              nextPostId={nextPostId}
              runResearch={server.runResearch}
              ignoreWinner={server.ignoreWinner}
              restoreWinner={server.restoreWinner}
              splitTopic={server.splitTopic}
              setStatus={server.setStatus}
              setFindingUrl={server.setFindingUrl}
              logEvent={server.logEvent}
              niche={niche}
            />
          )}
          {view === "plan" && (
            <Plan
              days={days}
              setDay={server.setDay}
              topics={topics}
              findings={findings}
              series={series || []}
              performance={performance || []}
              videoSettings={videoSettings}
              setStatus={server.setStatus}
              splitTopic={server.splitTopic}
              savePerformance={server.savePerformance}
              openPart={(topicId, partIndex) => {
                setStack((current) => ({ ...(current || defaultStack()), topicId, partIndex, saved: false }));
                go("stack");
              }}
              openStudio={(id) => {
                setStack((current) => ({ ...(current || defaultStack()), topicId: id, saved: false }));
                go("stack");
              }}
            />
          )}
          {view === "sources" && <Sources topics={topics} findings={findings} days={days} reviewFinding={server.reviewFinding} checkLink={server.checkLink} />}
          {view === "numbers" && (
            <Numbers
              stats={stats}
              thresholds={thresholds}
              weights={weights || {}}
              numbersInputs={numbersInputs || {}}
              saveNumbers={server.saveNumbers}
              saveWeights={server.saveWeights}
              addStat={server.addStat}
            />
          )}
          {view === "setup" && <Setup niche={niche} saveNiche={server.saveNiche} />}
          {view === "kit" && import.meta.env.DEV ? <Kit /> : null}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}

function Blocked({ problem, setPasscode }) {
  const [value, setValue] = useState("");
  if (!problem) {
    return (
      <div className="page">
        <h1>{copy.waking}</h1>
      </div>
    );
  }
  return (
    <div className="page">
      <h1>{problem.code === "PASSCODE" ? copy.passcodeTitle : copy.offlineTitle}</h1>
      <p>{problem.message}</p>
      {problem.code === "PASSCODE" ? (
        <>
          <Field id="passcode" label={copy.passcode} hint={copy.passcodeHint}>
            <Input id="passcode" type="password" value={value} onChange={(event) => setValue(event.target.value)} />
          </Field>
          <Button onClick={() => setPasscode(value)}>{copy.unlock}</Button>
        </>
      ) : null}
    </div>
  );
}
