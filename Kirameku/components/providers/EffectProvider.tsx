"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface EffectContextType {
  clickEffect: boolean;
  mouseTrail: boolean;
  toggleClickEffect: () => void;
  toggleMouseTrail: () => void;
}

const EffectContext = createContext<EffectContextType>({
  clickEffect: true,
  mouseTrail: true,
  toggleClickEffect: () => {},
  toggleMouseTrail: () => {},
});

export function EffectProvider({ children }: { children: ReactNode }) {
  const [clickEffect, setClickEffect] = useState(true);
  const [mouseTrail, setMouseTrail] = useState(true);

  // 从 localStorage 恢复状态
  useEffect(() => {
    const savedClick = localStorage.getItem("clickEffect");
    const savedTrail = localStorage.getItem("mouseTrail");
    if (savedClick !== null) setClickEffect(savedClick === "true");
    if (savedTrail !== null) setMouseTrail(savedTrail === "true");
  }, []);

  const toggleClickEffect = () => {
    setClickEffect((prev) => {
      localStorage.setItem("clickEffect", String(!prev));
      return !prev;
    });
  };

  const toggleMouseTrail = () => {
    setMouseTrail((prev) => {
      localStorage.setItem("mouseTrail", String(!prev));
      return !prev;
    });
  };

  return (
    <EffectContext.Provider value={{ clickEffect, mouseTrail, toggleClickEffect, toggleMouseTrail }}>
      {children}
    </EffectContext.Provider>
  );
}

export function useEffects() {
  return useContext(EffectContext);
}
