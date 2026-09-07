import { useSpring } from "@react-spring/web";
import type { UseAnimAnimateFn } from "../types.ts";

const useAnim = (viewHeight: number) => {
  const [{ y }, api] = useSpring(() => ({ y: viewHeight }));

  const animate: UseAnimAnimateFn = (_y, cb, options) => {
    const targetY = y.get() + _y > 0 ? _y : 0;

    api.start({
      to: async (next) => {
        await next({ y: targetY, immediate: options?.jump });

        if (typeof cb === "function") cb();
      },
    });
  };

  return { y, animate };
};

export default useAnim;
