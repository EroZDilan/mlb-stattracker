import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useGsapReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const tween = gsap.fromTo(el,
      {
        opacity: 0,
        y: options.y ?? 30,
        x: options.x ?? 0,
        scale: options.scale ?? 1,
      },
      {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        duration: options.duration ?? 0.7,
        ease: options.ease ?? "power3.out",
        delay: options.delay ?? 0,
        clearProps: "opacity,y,x,scale,transform",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      }
    );

    return () => {
      tween.kill();
      gsap.set(el, { clearProps: "all" });
    };
  }, []);

  return ref;
}

export function useGsapStagger(options = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.querySelectorAll(options.selector ?? "[data-stagger]"));
    if (!items.length) return;

    const tween = gsap.fromTo(items,
      { opacity: 0, y: options.y ?? 25 },
      {
        opacity: 1,
        y: 0,
        duration: options.duration ?? 0.6,
        ease: "power3.out",
        stagger: options.stagger ?? 0.08,
        clearProps: "opacity,y,transform",
        scrollTrigger: {
          trigger: container,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      }
    );

    return () => {
      tween.kill();
      gsap.set(items, { clearProps: "all" });
    };
  }, [options.deps]);

  return containerRef;
}

export function useGsapCounter(target, options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obj = { val: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: target,
        duration: options.duration ?? 1.8,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = options.format
            ? options.format(obj.val)
            : Math.round(obj.val).toString();
        },
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    });

    return () => ctx.revert();
  }, [target]);

  return ref;
}
