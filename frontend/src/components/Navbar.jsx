import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { gsap } from "gsap";

const links = [
  { to: "/",            label: "Juegos",         icon: "🏟️" },
  { to: "/batters",     label: "Bateadores",      icon: "🏏" },
  { to: "/pitchers",    label: "Pitchers",         icon: "⚾" },
  { to: "/teams",       label: "Equipos",          icon: "🛡️" },
  { to: "/standings",   label: "Standings",        icon: "📊" },
  { to: "/calendar",    label: "Calendario",       icon: "📅" },
  { to: "/predictions", label: "Predicciones IA",  icon: "🤖" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const panelRef  = useRef(null);
  const itemsRef  = useRef([]);
  const overlayRef = useRef(null);
  const buttonRef  = useRef(null);
  const tlRef      = useRef(null);
  const mounted    = useRef(false);

  useEffect(() => {
    if (open) setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }

    const panel   = panelRef.current;
    const overlay = overlayRef.current;
    const items   = itemsRef.current.filter(Boolean);

    if (tlRef.current) tlRef.current.kill();

    if (open) {
      gsap.set(panel,   { display: "flex", pointerEvents: "auto" });
      gsap.set(overlay, { display: "block" });

      const tl = gsap.timeline();
      tl.fromTo(panel,
        { clipPath: "inset(0 0 100% 0 round 1rem)", opacity: 0.4 },
        { clipPath: "inset(0 0 0% 0 round 1rem)",   opacity: 1, duration: 0.38, ease: "power3.out" }
      ).fromTo(items,
        { x: -14, opacity: 0 },
        { x: 0,   opacity: 1, stagger: 0.05, duration: 0.26, ease: "power3.out" },
        "-=0.18"
      );
      tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.22 }, 0);
      tlRef.current = tl;
    } else {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(panel,   { display: "none", pointerEvents: "none" });
          gsap.set(overlay, { display: "none" });
        },
      });
      tl.to(items,   { x: -8, opacity: 0, stagger: 0.025, duration: 0.14, ease: "power2.in" });
      tl.to(panel,   { clipPath: "inset(0 0 100% 0 round 1rem)", opacity: 0.2, duration: 0.28, ease: "power3.in" }, "-=0.08");
      tl.to(overlay, { opacity: 0, duration: 0.2 }, 0);
      tlRef.current = tl;
    }
  }, [open]);

  // Bounce-in on mount — use fromTo to avoid React strict mode double-run issue
  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const tween = gsap.fromTo(btn,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.65, ease: "back.out(2.5)", delay: 0.3 }
    );
    return () => { tween.kill(); gsap.set(btn, { clearProps: "all" }); };
  }, []);

  return (
    <>
      <div
        ref={overlayRef}
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        style={{ display: "none" }}
      />

      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        aria-label="Menú"
        className={`fixed top-4 left-4 z-50 w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-[5px]
          shadow-xl transition-all duration-200
          ${open
            ? "bg-mlb-red shadow-mlb-red/40"
            : "bg-bg-card/90 backdrop-blur-sm border border-white/[0.08] hover:border-mlb-red/40"
          }`}
        style={{ opacity: 0 }}
      >
        <span className={`block w-[18px] h-[2px] bg-white rounded-full transition-all duration-300 origin-center
          ${open ? "rotate-45 translate-y-[7px]" : ""}`} />
        <span className={`block w-[18px] h-[2px] bg-white rounded-full transition-all duration-300
          ${open ? "opacity-0 scale-x-0" : ""}`} />
        <span className={`block w-[18px] h-[2px] bg-white rounded-full transition-all duration-300 origin-center
          ${open ? "-rotate-45 -translate-y-[7px]" : ""}`} />
      </button>

      <div
        ref={panelRef}
        className="fixed top-[60px] left-4 z-50 flex-col gap-0.5 w-[235px]
          bg-bg-card/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-2
          shadow-2xl shadow-black/70"
        style={{ display: "none", pointerEvents: "none", clipPath: "inset(0 0 100% 0 round 1rem)" }}
      >
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span className="text-lg">⚾</span>
          <span className="font-display font-black text-[15px] tracking-wide">
            MLB <span className="text-mlb-red">StatTracker</span>
          </span>
        </div>
        <div className="h-px bg-white/[0.06] mx-2 mb-1" />

        {links.map((l, i) => {
          const active = location.pathname === l.to ||
            (l.to !== "/" && location.pathname.startsWith(l.to));
          return (
            <Link
              key={l.to}
              to={l.to}
              ref={el => (itemsRef.current[i] = el)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                transition-colors duration-150 group
                ${active ? "bg-mlb-red/90 text-white" : "text-white/55 hover:text-white hover:bg-white/[0.07]"}`}
            >
              <span className={`text-[15px] transition-transform duration-200 group-hover:scale-110 ${active ? "" : "opacity-60"}`}>
                {l.icon}
              </span>
              <span className="flex-1">{l.label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />}
            </Link>
          );
        })}
      </div>
    </>
  );
}
