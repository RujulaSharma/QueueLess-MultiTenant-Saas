import { useEffect, useRef } from "react";
import { joinBusinessRoom } from "../services/socket";

export default function useBusinessRealtime(businessId, onUpdate) {
  const updateRef = useRef(onUpdate);
  updateRef.current = onUpdate;

  useEffect(() => {
    if (!businessId) return undefined;
    return joinBusinessRoom(businessId, (payload) => {
      updateRef.current?.(payload);
    });
  }, [businessId]);
}
