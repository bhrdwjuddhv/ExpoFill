import { DotGrid } from '@/components/Decor.jsx';

/** Oversized display heading with a little geometry. */
export default function PageTitle({ title, children }) {
  return (
    <header className="relative mb-6">
      <DotGrid className="absolute -left-2 -top-3 h-14 w-14 text-violet/30" />
      <h1 className="display relative text-5xl md:text-6xl">{title}</h1>
      {children && <p className="muted relative mt-3 max-w-2xl text-base">{children}</p>}
    </header>
  );
}
