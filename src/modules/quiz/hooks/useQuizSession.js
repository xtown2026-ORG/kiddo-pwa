import { useEffect, useState } from "react";
import { connectQuizSocket, disconnectQuizSocket } from "../socket/quiz.socket";
import { useAuth } from "../../../auth/AuthProvider";

export function useQuizSession(sessionId) {
    const { token, user } = useAuth();
    const [status, setStatus] = useState("WAITING");
    const [player, setPlayer] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [time, setTime] = useState(null);

    useEffect(() => {
        const socket = connectQuizSocket(token);

        socket.emit("quiz:join", { sessionId });

        socket.on("quiz:joined", (data) => {
            setPlayer(data);
            if (data.isHost) {
                setIsHost(true);
            }
        });

        socket.on("quiz:started", (data) => {
            setStatus("IN_PROGRESS");
            setTime(data.totalTimeMs);
        });

        socket.on("quiz:time_up", () => {
            setStatus("FINISHED");
        });

        socket.on("quiz:all_finished", () => {
            setStatus("FINISHED");
        });

        return () => disconnectQuizSocket();
    }, [sessionId]);

    function startQuiz() {
        const socket = connectQuizSocket(token);
        socket.emit("quiz:start", { sessionId });
    }

    function finishQuiz() {
        const socket = connectQuizSocket(token);
        socket.emit("quiz:finished", { sessionId });
    }

    return {
        status,
        player,
        time,
        isHost,
        startQuiz,
        finishQuiz,
    };
}
