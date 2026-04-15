const fs = require('fs');

let code = fs.readFileSync('src/StudyPlanner.tsx', 'utf8');

// 1. Add PomodoroTimer component
const timerComponent = `
function PomodoroTimer({ taskId }: { taskId: string }) {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    let interval;
    if (running && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (running && secondsLeft === 0) {
      setRunning(false);
      setSessions((s) => s + 1);
      setSecondsLeft(25 * 60);
    }
    return () => clearInterval(interval);
  }, [running, secondsLeft]);

  const toggle = () => setRunning(!running);
  const reset = () => {
    setRunning(false);
    setSecondsLeft(25 * 60);
  };

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200/60 bg-white p-2 sm:px-3 sm:py-2 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500">
          <Clock size={16} />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight text-slate-800 leading-none">{mins}:{secs}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mt-1">Focus Timer</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
          <span>🍅</span>
          <span>{sessions}/4</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={toggle}
            className={\`flex h-7 w-7 items-center justify-center rounded-full \${
              running ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            } transition-colors\`}
            title={running ? "Pause" : "Start"}
          >
            {running ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current -mr-0.5" />}
          </button>
          <button
            onClick={reset}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
            title="Reset"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

`;

if (!code.includes('function PomodoroTimer')) {
  code = code.replace('export function StudyPlanner() {', timerComponent + 'export function StudyPlanner() {');
}

// 2. Adjust container
const oldWrapper = '<div className="mt-4 max-h-[560px] overflow-y-auto pr-2">';
const newWrapper = '<div className="mt-6 max-h-[460px] overflow-y-auto pr-3 -mr-1" style={{ scrollSnapType: "y mandatory", scrollBehavior: "smooth" }}>';
if (code.includes(oldWrapper)) {
  code = code.replace(oldWrapper, newWrapper);
}

// 3. Adjust spacing
const oldSpaceY = '<div className="space-y-3">';
const newSpaceY = '<div className="flex flex-col gap-5">';
if (code.includes(oldSpaceY)) {
  code = code.replace(oldSpaceY, newSpaceY);
}

// 4. Update task card structure to include wrapper and PomodoroTimer, and compact padding.
// Because `key={plan.id}` is heavily used, let's locate the exact article start and end.
const articleRegex = /<article\s+key={plan\.id}\s+className="sp-card([^"]*)"\s+style={{ borderColor: priorityStyle\.border }}\s*>/;
if (code.match(articleRegex)) {
  code = code.replace(
    articleRegex,
    `<div key={plan.id} className="shrink-0 flex flex-col gap-1 w-full pb-2" style={{ scrollSnapAlign: "start" }}>\n                      <article className="sp-card p-3" style={{ borderColor: priorityStyle.border }}>`
  );
}

// 5. Find the closing </article> for the map block and insert Timer.
// Inside StudyPlanner.tsx, there's only one `</article>` tag. Let's do a simple string replace.
if (code.includes('</article>')) {
  // Be careful to only replace the inner one inside `filteredPlans.map` if there are multiple. 
  // Let's just assume one.
  const parts = code.split('</article>');
  code = parts[0] + '</article>\n                      <PomodoroTimer taskId={plan.id} />\n                    </div>' + (parts[1] || '');
}

// 6. Compact inner sizes in the grid and margins
code = code.replace(/<div className="mt-3 grid grid-cols-1/g, '<div className="mt-2 grid grid-cols-1');
code = code.replace(/<div className="mt-3 flex flex-wrap/g, '<div className="mt-2 flex flex-wrap');
code = code.replace(/<div className="mt-3">\s*<div className="mb-1 flex items-center/g, '<div className="mt-2">\n                        <div className="mb-1 flex items-center');

fs.writeFileSync('src/StudyPlanner.tsx', code);
console.log('Refactor complete!');
