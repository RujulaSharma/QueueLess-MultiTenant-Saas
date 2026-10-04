import { useEffect, useRef } from "react";
import { joinProjectRoom } from "../services/socket";

export default function useProjectRealtime(projectId, onEvent) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!projectId) return;

    const cleanup = joinProjectRoom(projectId, (eventName, payload) => {
      if (onEventRef.current) {
        onEventRef.current(eventName, payload);
      }
    });

    return () => {
      cleanup();
    };
  }, [projectId]);
}
