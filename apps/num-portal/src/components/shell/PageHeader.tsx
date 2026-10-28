export default function PageHeader({ title, hint, live }: { title: string; hint: string; live?: boolean }) {
  return (
    <div className="ph">
      <div>
        <h1>{title}</h1>
        <p>{hint}</p>
      </div>
      {live ? <span className="live">Live</span> : null}
    </div>
  );
}
