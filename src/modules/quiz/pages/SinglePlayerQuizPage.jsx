import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Button,
  Typography,
  Box,
  TextField,
  CircularProgress,
  Paper,
  LinearProgress,
  Stack
} from "@mui/material";
import { EmojiEvents, School } from "@mui/icons-material";
import { generateQuiz, startSingleQuiz, submitSingleQuiz } from "../api/quiz.api";
import QuestionCard from "../components/QuestionCard";
import { useAuth } from "../../../auth/AuthProvider";

export default function SinglePlayerQuizPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState("setup"); // setup, loading, playing, result
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [answers, setAnswers] = useState([]);

  // Setup Phase: Start Quiz
  async function handleStart() {
    if (!topic.trim()) return;
    setGameState("loading");
    try {
      const res = await generateQuiz({
        topic,
        classLevel: user?.class_level || 5,
        difficulty: "MEDIUM",
        numQuestions: 5,
      });

      const quizData = res.data?.questions || [];

      if (quizData.length > 0) {
        const startRes = await startSingleQuiz({
          quizId: res.data?.quizId,
          timeLimitMinutes: 5,
        });
        setSessionId(startRes.data?.sessionId || null);
        setPlayerId(startRes.data?.playerId || null);
        setQuestions(quizData);
        setAnswers([]);
        setScore(0);
        setCurrentIndex(0);
        setGameState("playing");
        setSelectedIndex(null);
      } else {
        alert("Could not generate questions. AI response was invalid.");
        setGameState("setup");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to start quiz.");
      setGameState("setup");
    }
  }

  // Playing Phase: Submit Answer
  async function handleAnswer(selectedIndex) {
    if (selectedIndex === null || selectedIndex === undefined) return;
    setSelectedIndex(selectedIndex);
    const currentQ = questions[currentIndex];
    const isCorrect = selectedIndex === currentQ.correct_option_index;
    const nextAnswers = [
      ...answers,
      { questionId: currentQ.id, selectedIndex },
    ];
    setAnswers(nextAnswers);

    if (isCorrect) setScore(s => s + 1);

    // Wait a moment then move to next
    setTimeout(async () => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(p => p + 1);
        setSelectedIndex(null);
      } else {
        try {
          if (playerId) {
            const submitRes = await submitSingleQuiz({
              playerId,
              answers: nextAnswers,
            });
            if (submitRes?.data?.score !== undefined) {
              setScore(submitRes.data.score);
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setGameState("result");
        }
      }
    }, 1000);
  }

  if (user?.role === "teacher") {
    return (
      <Container maxWidth="xs" sx={{ mt: 8, textAlign: "center" }}>
        <Paper sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Single Player is not available for teachers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a multiplayer quiz instead.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/teacher/quiz")}>
            Go to Multiplayer
          </Button>
        </Paper>
      </Container>
    );
  }

  // Render Setup
  if (gameState === "setup") {
    return (
      <Container maxWidth="xs" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 4, borderRadius: 4 }}>
          <School sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            AI Quiz Master
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Enter a topic and I will generate a quiz for you!
          </Typography>

          <TextField
            label="Quiz Topic (e.g. Solar System)"
            fullWidth
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleStart}
            disabled={!topic.trim()}
            sx={{ borderRadius: 2 }}
          >
            Start Quiz
          </Button>
        </Paper>
      </Container>
    );
  }

  // Render Loading
  if (gameState === "loading") {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
        <CircularProgress size={60} thickness={4} />
        <Typography sx={{ mt: 3, fontWeight: 500 }}>Generating Questions...</Typography>
      </Box>
    );
  }

  // Render Result
  if (gameState === "result") {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <Container maxWidth="xs" sx={{ mt: 8, textAlign: 'center' }}>
        <Paper sx={{ p: 4, borderRadius: 4 }}>
          <EmojiEvents sx={{ fontSize: 80, color: '#FFD700', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {score} / {questions.length}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
            You scored {percentage}%
          </Typography>

          <Button
            variant="contained"
            onClick={() => {
              setGameState("setup");
              setCurrentIndex(0);
              setScore(0);
              setTopic("");
              setAnswers([]);
              setSessionId(null);
              setPlayerId(null);
            }}
          >
            Play Again
          </Button>
        </Paper>
      </Container>
    );
  }

  // Render Playing
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Stack spacing={2} sx={{ mb: 4 }}>
        <LinearProgress variant="determinate" value={((currentIndex + 1) / questions.length) * 100} sx={{ height: 10, borderRadius: 5 }} />
        <Typography align="right" variant="caption">
          Question {currentIndex + 1} of {questions.length}
        </Typography>
      </Stack>

      <QuestionCard
        question={questions[currentIndex]}
        onAnswer={handleAnswer}
        selectedIndex={selectedIndex}
      />
    </Container>
  );
}
