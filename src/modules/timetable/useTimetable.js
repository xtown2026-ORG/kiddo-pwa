import { useEffect, useState } from "react";
import { getTimetable } from "./timetable.api";
import { useAuth } from "../../auth/AuthProvider";

export function useTimetable() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.role) return;
    fetchTimetable();
  }, [user?.role]);

  async function fetchTimetable() {
    try {
      setLoading(true);

      console.log("Timetable User Context:", user); // Debug log

      if (!user?.class_id || !user?.section_id) {
        setError("Missing class/section context for timetable.");
        setTimetable(null);
        return;
      }

      const params = {
        class_id: user.class_id,
        section_id: user.section_id,
      };

      const res = await getTimetable(params);
      setTimetable(res.data.data);
    } catch {
      setError("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }

  return {
    timetable,
    loading,
    error,
  };
}
