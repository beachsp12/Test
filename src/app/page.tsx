import { TireInspector } from "@/components/TireInspector";
import { SOURCES } from "@/lib/repairRules";

export default function Home() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Tire Air-Loss Check</h1>
        <p className="lead">
          Add photos or a short video for each tire. You&apos;ll find out whether each one shows
          damage that could make it lose air, where the damage is, and whether it&apos;s usually
          repairable.
        </p>
        <details className="howto">
          <summary>How to get good shots</summary>
          <ul>
            <li>Shoot in daylight or use a flashlight. Avoid harsh glare.</li>
            <li>Get close: fill the frame with the tire. Wipe off mud first if you can.</li>
            <li>
              Cover the tread, both sidewalls (the inner one is behind the wheel), and the valve
              stem.
            </li>
            <li>
              Part of the tread is always hidden against the ground. Roll the car forward about
              half a wheel turn and shoot again.
            </li>
            <li>For video, move slowly around the tire. The app samples frames from start to end.</li>
          </ul>
        </details>
      </header>

      <TireInspector />

      <footer className="page-footer">
        <p>
          <strong>This is a visual check, not an inspection.</strong> It can&apos;t detect
          every leak: slow leaks inside the tire, a leaking valve core, or air escaping where
          the tire seals to the wheel often look normal in photos. If a tire keeps losing
          pressure, or anything here looks unsafe, have a tire shop inspect it.
        </p>
        <p className="small muted">
          Repair guidance comes from{" "}
          <a href={SOURCES.ustmaChart.url} target="_blank" rel="noreferrer">
            {SOURCES.ustmaChart.title}
          </a>
          ,{" "}
          <a href={SOURCES.ustmaBasics.url} target="_blank" rel="noreferrer">
            {SOURCES.ustmaBasics.title}
          </a>{" "}
          and{" "}
          <a href={SOURCES.cfr5709.url} target="_blank" rel="noreferrer">
            {SOURCES.cfr5709.title}
          </a>
          . Your tire maker&apos;s own policy may be stricter, especially for run-flat tires.
        </p>
      </footer>
    </main>
  );
}
